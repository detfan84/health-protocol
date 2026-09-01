// The coverage ledger — the first piece of the composer (FRAMEWORK layer 2).
//
// Coverage law: "Regions and muscles rotate by recency and weight; the promise
// is everything touched within its window, not everything daily." The ledger is
// how the composer knows what the window has not covered yet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildLedger, staleNodes, reachableNodes, nodesOf, EFFECT_COUNTS,
} from '../src/app/composer/ledger.js';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const facets = JSON.parse(await readFile(new URL('../src/content/vocab/facets.json', import.meta.url), 'utf8'));
const practices = lib.items.filter((i) => i.type === 'practice');
const itemsById = Object.fromEntries(lib.items.map((i) => [i.id, i]));

const DAY = 86400000;
const at = (daysAgo, hour = 9) => {
  const d = new Date('2026-09-01T00:00:00Z');
  d.setTime(d.getTime() - daysAgo * DAY);
  d.setUTCHours(hour);
  return d.toISOString();
};
const dayKey = (daysAgo) => at(daysAgo).slice(0, 10);
const NOW = new Date('2026-09-01T12:00:00Z');

/* ------------------------- the vocabulary agreement ----------------------- */

test('the ledger\'s idea of what counts is the vocabulary\'s idea', () => {
  // EFFECT_COUNTS is a constant because facets.json is not shipped to the
  // browser. That is only safe while the two agree, so this is the guard: a
  // change to the vocabulary must break the build, never quietly redefine what
  // coverage means.
  const effect = facets.facets.find((f) => f.id === 'effect');
  const fromVocab = Object.fromEntries(effect.values.map((v) => [v.id, v.counts]));
  assert.deepEqual(EFFECT_COUNTS, fromVocab, 'ledger and facets.json disagree about what counts as coverage');
});

/* -------------------------------- counting -------------------------------- */

test('it counts what was checked, against the anatomy that was resolved', () => {
  const item = practices.find((p) => p.target?.length && (p.effect ?? []).includes('load'));
  const ledger = buildLedger({
    days: [{ date: dayKey(1), checks: { [item.id]: { at: at(1) } } }],
    itemsById,
    now: NOW,
  });
  assert.equal(ledger.checks, 1);
  assert.equal(ledger.unattributed, 0);
  for (const node of nodesOf(item)) {
    assert.ok(ledger.nodes[node], `${node} was worked and the ledger does not know`);
    assert.equal(ledger.nodes[node].byEffect.load.count, 1);
  }
});

test('an item that was never checked pays nothing in', () => {
  // A day record is what happened. Something that sat on the screen all day is
  // not coverage, however good an idea it was.
  const item = practices.find((p) => p.target?.length);
  const ledger = buildLedger({ days: [{ date: dayKey(1), checks: {} }], itemsById, now: NOW });
  assert.equal(ledger.checks, 0);
  assert.deepEqual(ledger.nodes, {});
  assert.equal(ledger.nodes[nodesOf(item)[0]], undefined);
});

test('a repeated item counts every time it was done', () => {
  // Must be an item that COVERS — one whose effects are all systemic credits
  // no anatomy at all, which is a different test entirely.
  const item = practices.find((p) => p.target?.length
    && (p.effect ?? []).some((e) => EFFECT_COUNTS[e] === 'perTarget'));
  const ledger = buildLedger({
    days: [{ date: dayKey(1), checks: { [item.id]: { at: at(1, 8), ats: [at(1, 8), at(1, 13), at(1, 19)] } } }],
    itemsById,
    now: NOW,
  });
  assert.equal(ledger.checks, 3);
  assert.equal(ledger.nodes[nodesOf(item)[0]].total, 3);
});

test('outside the window is outside the ledger', () => {
  const item = practices.find((p) => p.target?.length
    && (p.effect ?? []).some((e) => EFFECT_COUNTS[e] === 'perTarget'));
  const days = [
    { date: dayKey(2), checks: { [item.id]: { at: at(2) } } },
    { date: dayKey(30), checks: { [item.id]: { at: at(30) } } },
  ];
  const ledger = buildLedger({ days, itemsById, now: NOW, windowDays: 7 });
  assert.equal(ledger.checks, 1, 'a check from a month ago was counted in this week');
  assert.equal(ledger.window.from, dayKey(6));
  assert.equal(ledger.window.to, dayKey(0));
});

/* ------------------------ systemic is not coverage ------------------------ */

test('a systemic effect happened, and still covers no body part', () => {
  // The rule `counts` exists for: a rope session tags the calves, and calling
  // that coverage OF the calves would let the pairing law believe a debt was
  // paid that was not.
  const systemic = practices.find((p) => p.target?.length
    && (p.effect ?? []).length && p.effect.every((e) => EFFECT_COUNTS[e] === 'systemic'));
  assert.ok(systemic, 'no purely systemic practice to test with');
  const ledger = buildLedger({
    days: [{ date: dayKey(1), checks: { [systemic.id]: { at: at(1) } } }],
    itemsById,
    now: NOW,
  });
  assert.equal(ledger.checks, 1, 'the session should be recorded as having happened');
  assert.ok(Object.values(ledger.effects).some((e) => e.count > 0), 'the effect should be recorded');
  assert.deepEqual(ledger.nodes, {}, 'systemic work was credited as coverage of a body part');
  assert.ok(ledger.unattributedItems.includes(systemic.id),
    'the composer was not told this session paid into no anatomy account');
});

/* ------------------------- honest about its gaps -------------------------- */

test('an untagged item is reported, not silently dropped', () => {
  // "You did nothing" and "nobody tagged this yet" are different facts (D24).
  const ledger = buildLedger({
    days: [{ date: dayKey(1), checks: { 'not-in-the-catalogue': { at: at(1) } } }],
    itemsById,
    now: NOW,
  });
  assert.equal(ledger.checks, 1);
  assert.equal(ledger.unattributed, 1);
  assert.deepEqual(ledger.unattributedItems, ['not-in-the-catalogue']);
  assert.deepEqual(ledger.nodes, {});
});

/* -------------------------------- staleness ------------------------------- */

test('never-touched sorts above long-ago, and both above recent', () => {
  const loaders = practices.filter((p) => p.target?.length && (p.effect ?? []).includes('load'));
  const recent = loaders[0];
  const old = loaders.find((p) => nodesOf(p).every((n) => !nodesOf(recent).includes(n)));
  assert.ok(old, 'need two loaders touching different anatomy');

  const ledger = buildLedger({
    days: [
      { date: dayKey(0), checks: { [recent.id]: { at: at(0) } } },
      { date: dayKey(5), checks: { [old.id]: { at: at(5) } } },
    ],
    itemsById,
    now: NOW,
  });
  const known = [...nodesOf(recent), ...nodesOf(old), 'never-worked-node'];
  const stale = staleNodes({ ledger, known, now: NOW });

  assert.equal(stale[0].id, 'never-worked-node', 'a node with no history is not at the top');
  assert.equal(stale[0].lastAt, null);
  assert.equal(stale[0].daysSince, null);

  const oldest = stale.find((s) => nodesOf(old).includes(s.id));
  const newest = stale.find((s) => nodesOf(recent).includes(s.id));
  assert.ok(stale.indexOf(oldest) < stale.indexOf(newest),
    'five days ago should outrank today in staleness');
  assert.equal(oldest.daysSince, 5);
});

/* --------------------------- a payable coverage debt ---------------------- */

test('the reachable set is what some item can actually cover', () => {
  const reach = reachableNodes(lib.items);
  assert.ok(reach.length > 50, `only ${reach.length} nodes are reachable`);

  // Every reachable node must be reachable by an item that COVERS — otherwise
  // the composer would carry a debt on its books that nothing can ever pay.
  for (const node of reach.slice(0, 40)) {
    const payer = lib.items.find((i) => nodesOf(i).includes(node)
      && (i.effect ?? []).some((e) => EFFECT_COUNTS[e] === 'perTarget'));
    assert.ok(payer, `${node} is on the books and no item can pay it`);
  }

  // A node reachable only by systemic work is not a coverage debt.
  const systemicOnly = reachableNodes(lib.items.filter(
    (i) => (i.effect ?? []).every((e) => EFFECT_COUNTS[e] === 'systemic'),
  ));
  assert.equal(systemicOnly.length, 0, 'systemic-only items were counted as able to cover anatomy');
});

test('a real week of work leaves a real list of what is owed', () => {
  // The end-to-end shape the composer consumes: do a few things, and the thing
  // it needs is the list of what is still untouched.
  const loaders = practices.filter((p) => p.target?.length && (p.effect ?? []).includes('load')).slice(0, 3);
  const days = loaders.map((p, i) => ({ date: dayKey(i + 1), checks: { [p.id]: { at: at(i + 1) } } }));
  const ledger = buildLedger({ days, itemsById, now: NOW });
  const known = reachableNodes(lib.items);
  const stale = staleNodes({ ledger, known, now: NOW });

  assert.equal(stale.length, known.length, 'every reachable node should appear, touched or not');
  const touched = stale.filter((s) => s.lastAt !== null);
  const untouched = stale.filter((s) => s.lastAt === null);
  assert.ok(touched.length > 0, 'three sessions covered nothing');
  assert.ok(untouched.length > 0, 'three sessions covered the entire body');
  assert.ok(stale.indexOf(untouched[0]) < stale.indexOf(touched[0]), 'owed work is not at the top');
});
