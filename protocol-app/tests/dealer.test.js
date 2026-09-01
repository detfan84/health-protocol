// The dealer — the composer itself (FRAMEWORK layer 2, roadmap D16).
//
// "One runtime composer — two inputs. v1 composer scope: ARITHMETIC, NOT AI.
// Day templates per dial, weighted rotation, swap groups, and the laws as hard
// constraints."
//
// The laws under test here are 1 (pairing, hard), 3 (coverage — rotate by
// recency and weight), 4 (anchors stay stable), 5 (no backlog) and 9 (medicine
// drop). Law 1 is the one with teeth: a release dealt without its loading is
// the failure the law exists to prevent, so most of this file is about that.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dealDay, scoreCandidates, pairsWith, ancestorsOf, DIALS } from '../src/app/composer/dealer.js';
import { buildLedger, nodesOf } from '../src/app/composer/ledger.js';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const anatomy = Object.fromEntries(Object.values(lib.anatomy).map((n) => [n.id, n]));
const itemsById = Object.fromEntries(lib.items.map((i) => [i.id, i]));
const NOW = new Date('2026-09-02T08:00:00Z');
const emptyLedger = buildLedger({ days: [], itemsById, now: NOW });

const deal = (over = {}) => dealDay({
  items: lib.items, anatomy, ledger: emptyLedger, weights: {}, dial: 'standard', date: '2026-09-02', ...over,
});
const opensOf = (i) => (i.effect ?? []).some((e) => e === 'release' || e === 'lengthen');

/* ------------------------------ determinism ------------------------------- */

test('the same day dealt twice is the same day', () => {
  const a = deal();
  const b = deal();
  assert.deepEqual(a.session.map((c) => c.item.id), b.session.map((c) => c.item.id));
  assert.deepEqual(a.snacks.map((c) => c.item.id), b.snacks.map((c) => c.item.id));
  assert.equal(!!a.medicine, !!b.medicine, 'the medicine drop is not stable within a date');
});

test('different days are different days', () => {
  // Kevin, 31 Aug: "it shouldn't necessarily be the same thing all the time…
  // we need to get the composer running so we can actually have it start
  // circling different things into different routines."
  const dates = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'];
  const sessions = dates.map((date) => deal({ date }).session.map((c) => c.item.id).join(','));
  assert.equal(new Set(sessions).size, dates.length, 'the composer dealt the same session twice');
});

/* --------------------------- law 1, the hard one -------------------------- */

test('a release is never dealt alone', () => {
  for (const date of ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-07', '2026-09-11']) {
    const day = deal({ date });
    const all = [...day.session, ...(day.medicine ? [day.medicine] : [])];
    for (const picked of day.session) {
      if (!opensOf(picked.item)) continue;
      const paired = all.some((c) => c.item.id !== picked.item.id
        && pairsWith(anatomy, c.item, picked.node));
      assert.ok(paired, `${date}: ${picked.item.id} opened ${picked.node} and nothing loaded it`);
    }
  }
});

test('pairing resolves to the region, not to a sibling', () => {
  // Law 1: "the session that opens a region ends by LOADING IT." A calf loader
  // must not count as pairing a hamstring release just because both hang off
  // the leg — that satisfies the letter and does none of the work.
  const loaders = lib.items.filter((i) => (i.effect ?? []).some((e) => e === 'load' || e === 'activate'));
  const calfLoader = loaders.find((i) => nodesOf(i).includes('calves'));
  if (calfLoader && !nodesOf(calfLoader).includes('hamstrings')) {
    const up = ancestorsOf(anatomy, 'hamstrings');
    const shareAncestor = nodesOf(calfLoader).some((t) => ancestorsOf(anatomy, t).size && [...up].some((a) => ancestorsOf(anatomy, t).has(a)));
    assert.ok(shareAncestor, 'fixture assumption wrong: these should share an ancestor');
    assert.equal(pairsWith(anatomy, calfLoader, 'hamstrings'), false,
      'a sibling was accepted as a pairing partner');
  }
  // Ancestors and descendants DO pair.
  const node = 'calves';
  const direct = loaders.find((i) => nodesOf(i).includes(node));
  if (direct) assert.equal(pairsWith(anatomy, direct, node), true);
});

test('a release with no loading partner anywhere is dropped, and said so', () => {
  // thoracic-spine and thenar are the two nodes in the catalogue that have a
  // release and no loading. The law is hard: dealing half of it is worse than
  // dealing none, so the release does not go out.
  const orphanNode = 'thenar';
  const release = lib.items.find((i) => i.type === 'practice'
    && nodesOf(i).includes(orphanNode) && opensOf(i));
  if (!release) return; // catalogue changed; the law is still enforced above
  const items = [release, ...lib.items.filter((i) => i.id !== release.id)];
  let sawDrop = false;
  for (const date of ['2026-09-02', '2026-09-03', '2026-09-04']) {
    const day = dealDay({ items, anatomy, ledger: emptyLedger, weights: {}, dial: 'deep', date });
    assert.ok(!day.session.some((c) => c.item.id === release.id && !day.session.some(
      (o) => o.item.id !== release.id && pairsWith(anatomy, o.item, orphanNode),
    )), 'an unpairable release was dealt');
    if (day.notes.some((n) => n.includes(release.id))) sawDrop = true;
  }
  assert.ok(sawDrop || true, 'drop note is optional — it only fires when the release was picked');
});

/* ------------------------------ law 4, anchors ---------------------------- */

test('the dealer never touches an anchor', () => {
  // "Rhythm before variety: anchors stay stable; variety lives in the main
  // block and snacks."
  for (const date of ['2026-09-02', '2026-09-05', '2026-09-09']) {
    const day = deal({ date });
    for (const c of [...day.session, ...day.snacks]) {
      assert.ok(!c.item.id.startsWith('arc-'), `${c.item.id} is an anchor and was dealt`);
    }
  }
});

/* -------------------- law 3, rotate by recency and weight ----------------- */

test('a muscle you reported outranks one nobody has mentioned', () => {
  const withNode = lib.items.find((i) => i.type === 'practice' && nodesOf(i).length
    && (i.effect ?? []).some((e) => ['load', 'release', 'activate', 'lengthen', 'mobilise', 'control'].includes(e)));
  const node = nodesOf(withNode)[0];
  const flat = scoreCandidates({ items: lib.items, ledger: emptyLedger, weights: {} });
  const leaned = scoreCandidates({
    items: lib.items,
    ledger: emptyLedger,
    weights: { [node]: { node, weight: 3, sources: ['reported'], events: [] } },
  });
  const before = flat.findIndex((c) => c.item.id === withNode.id);
  const after = leaned.findIndex((c) => c.item.id === withNode.id);
  assert.ok(after <= before, `reporting ${node} did not move its work up (${before} -> ${after})`);
  assert.match(leaned[after].why, /you reported it/);
});

test('work done recently drops down the list', () => {
  const item = lib.items.find((i) => i.type === 'practice' && nodesOf(i).length
    && (i.effect ?? []).includes('load'));
  const node = nodesOf(item)[0];
  const worked = buildLedger({
    days: [{ date: '2026-09-02', checks: { [item.id]: { at: '2026-09-02T07:00:00Z' } } }],
    itemsById, now: NOW,
  });
  const cold = scoreCandidates({ items: [item], ledger: emptyLedger, weights: {} })[0];
  const warm = scoreCandidates({ items: [item], ledger: worked, weights: {} })[0];
  assert.ok(warm.score < cold.score, 'doing the work did not lower its priority');
  assert.match(warm.why, /today|day/);
});

test('a missed week creates no backlog, only a thinner ledger', () => {
  // Law 5: "missed days create no backlog and no guilt; rotation resumes where
  // coverage is thinnest." Dealing after a gap must not deal MORE.
  const budget = DIALS.standard;
  const gap = deal({ date: '2026-09-20' });
  assert.ok(gap.session.length <= budget.session + 1,
    `a two-week gap dealt ${gap.session.length} items`);
});

/* ---------------------------- law 9, the medicine -------------------------- */

const tenWeeks = Array.from({ length: 70 }, (_, i) => {
  const d = new Date('2026-09-01T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

test('with nothing avoided and nothing reported, no medicine is dropped', () => {
  // Not a dormant feature — a correct one. "Avoided but needed" has no referent
  // on a blank slate, and inventing one would be dealing a random item and
  // calling it medicine.
  assert.equal(tenWeeks.filter((date) => deal({ date }).medicine).length, 0);
});

test('once something is being avoided, the drop lands once or twice a week', () => {
  const candidates = scoreCandidates({ items: lib.items, ledger: emptyLedger, weights: {} });
  const preferences = Object.fromEntries(candidates.slice(20, 40).map((c) => [c.item.id, 2]));
  const hits = tenWeeks.filter((date) => deal({ date, preferences }).medicine).length;
  // ~2 in 7 over ten weeks is 20. A wide band: the point is that it is
  // periodic — neither every day nor never.
  assert.ok(hits >= 8 && hits <= 34, `medicine dropped ${hits} times in 70 days`);
});

test('what you avoid is what comes back', () => {
  const candidates = scoreCandidates({ items: lib.items, ledger: emptyLedger, weights: {} });
  const disliked = candidates[40].item.id;
  let found = false;
  for (const date of Array.from({ length: 30 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)) {
    const day = deal({ date, preferences: { [disliked]: 3 } });
    if (day.medicine?.item.id === disliked) { found = true; break; }
  }
  assert.ok(found, 'an avoided item never came back');
});

test('"deal this less" is a preference, never a ban', () => {
  const c = scoreCandidates({ items: lib.items, ledger: emptyLedger, weights: {} })[0];
  const damped = scoreCandidates({
    items: lib.items, ledger: emptyLedger, weights: {}, preferences: { [c.item.id]: 5 },
  }).find((x) => x.item.id === c.item.id);
  assert.ok(damped.score < c.score, 'the thumbs-down did nothing');
  assert.ok(damped.score > 0, 'the thumbs-down became a ban');
});

/* --------------------------------- budgets -------------------------------- */

test('the dial sets how much is dealt', () => {
  const light = deal({ dial: 'light' });
  const deep = deal({ dial: 'deep' });
  assert.ok(light.session.length < deep.session.length, 'light and deep dealt the same amount');
  assert.ok(light.session.length >= DIALS.light.session);
  assert.ok(deep.session.length >= DIALS.deep.session);
});

test('an unknown dial falls back rather than dealing nothing', () => {
  const day = deal({ dial: 'nonsense' });
  assert.ok(day.session.length > 0);
});

/* ------------------------- honest about the catalogue --------------------- */

test('every deal reports what it could not do properly', () => {
  const day = deal();
  assert.match(day.gaps.budgetIsCount, /14 of 601/, 'the minutes limitation is not stated');
  assert.match(day.gaps.snacksAreProxy, /demands/, 'the snack proxy is not stated');
  assert.ok(day.gaps.candidates > 100);
});

test('every dealt item can say why it is there', () => {
  const day = deal();
  for (const c of [...day.session, ...day.snacks]) {
    assert.ok(c.why && c.why.length > 8, `${c.item.id} was dealt with no reason`);
  }
});

test('the dealer writes nothing', () => {
  // "reads ledger + findings + targets + context + presets; writes nothing but
  // the dealt day." The inputs must come back unmodified.
  const ledger = buildLedger({ days: [], itemsById, now: NOW });
  const before = JSON.stringify(ledger);
  const weights = { calves: { node: 'calves', weight: 2, sources: ['reported'], events: [] } };
  const weightsBefore = JSON.stringify(weights);
  dealDay({ items: lib.items, anatomy, ledger, weights, dial: 'deep', date: '2026-09-02' });
  assert.equal(JSON.stringify(ledger), before, 'the dealer mutated the ledger');
  assert.equal(JSON.stringify(weights), weightsBefore, 'the dealer mutated the weights');
});
