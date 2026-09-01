// Findings and weights — D42, as amended by R25.
//
// "Check-off alone is always complete — one tap stays the whole ask. Optional
// difficulty rating 1–5; a 4–5 asks one follow-up naming the limiting factor:
// muscle gave out → a finding, that muscle's weight goes up · ran out of steam
// → a system limit, no muscle arithmetic · it gave way → law 10, no arithmetic."
//
// The tests that matter most here are the ones asserting what does NOT happen.
// D42 names the one bad misroute by name — coding pain as "weak muscle, load it
// more" — and R25 narrowed the third chip specifically to keep it from firing on
// ordinary sessions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {
  makeEvent, weighFindings, weightOf, followUpFor, itemPreferences,
  exertionMarks, jointEvents, remainingForce,
  KINDS, BASELINE, STEP, MAX_WEIGHT, MIN_WEIGHT, HALF_LIFE_DAYS,
} from '../src/app/composer/findings.js';

const NOW = new Date('2026-09-01T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
const ev = (kind, opts = {}) => makeEvent({ kind, at: daysAgo(0), ...opts });

/* ------------------------------ the ask itself ---------------------------- */

test('a check-off on its own asks nothing further', () => {
  assert.equal(followUpFor(undefined), null, 'no rating should ask no follow-up');
  assert.equal(followUpFor(1), null);
  assert.equal(followUpFor(3), null, 'a middling rating is not a problem to solve');
});

test('a 4 or 5 asks one question with the three ruled answers', () => {
  for (const rating of [4, 5]) {
    const f = followUpFor(rating);
    assert.ok(f, `${rating} should ask`);
    assert.deepEqual(f.options.map((o) => o.kind),
      ['muscle-gave-out', 'ran-out-of-steam', 'gave-way']);
  }
  // R25: the chip is a joint EVENT report, never a pain judgement. Pain is the
  // daily baseline for the people this is for; a pain chip would fire on
  // ordinary sessions and manufacture the warning fatigue R25 exists to prevent.
  const labels = followUpFor(5).options.map((o) => o.label).join(' ').toLowerCase();
  assert.doesNotMatch(labels, /pain/, 'the struck "pain or joint" chip came back');
});

/* --------------------------- what may move a weight ----------------------- */

test('only three kinds may ever touch a muscle weight', () => {
  const weighs = Object.entries(KINDS).filter(([, v]) => v.weighs).map(([k]) => k).sort();
  assert.deepEqual(weighs, ['eased-up', 'hot-spot', 'muscle-gave-out']);
});

test('a muscle that gave out gains weight, and brings its loading with it', () => {
  const table = weighFindings({ events: [ev('muscle-gave-out', { nodes: ['glute-max'] })], now: NOW });
  assert.ok(table['glute-max'].weight > BASELINE, 'the report changed nothing');
  // Pairing law: release is never scheduled alone; the muscle that gave out
  // gets its strengthening dealt alongside.
  assert.equal(table['glute-max'].pairedLoad, true);
});

test('running out of steam is a system limit and moves no muscle at all', () => {
  const events = [ev('ran-out-of-steam', { nodes: ['glute-max'], itemId: 'x' })];
  const table = weighFindings({ events, now: NOW });
  assert.deepEqual(table, {}, 'a system limit was charged to a muscle');
  assert.equal(weightOf(table, 'glute-max'), BASELINE);
  // What it DOES produce is the look-back instrument (D28).
  assert.equal(exertionMarks({ events, now: NOW }).length, 1);
});

test('a joint giving way is reported and produces no arithmetic', () => {
  // The one bad misroute D42 names: coding this as "weak muscle, load it more".
  const events = [ev('gave-way', { nodes: ['knee'], itemId: 'x' })];
  const table = weighFindings({ events, now: NOW });
  assert.deepEqual(table, {}, 'a joint event was turned into muscle arithmetic');
  assert.equal(jointEvents({ events }).length, 1, 'law 10 was not told');
});

test('a skipped follow-up is recorded and charged to nothing', () => {
  const events = [ev('follow-up-skipped', { nodes: ['glute-max'], itemId: 'x' })];
  assert.deepEqual(weighFindings({ events, now: NOW }), {});
});

test('difficulty is not helpfulness', () => {
  // Easy-and-useless exists. The not-helpful signal means "deal this less,
  // promote its siblings" and never reaches a muscle.
  const events = [ev('not-helpful', { itemId: 'sq-1', nodes: ['glute-max'] })];
  assert.deepEqual(weighFindings({ events, now: NOW }), {}, 'a thumbs-down moved a muscle weight');
  assert.deepEqual(itemPreferences({ events }), { 'sq-1': 1 });
});

/* --------------------------------- decay ---------------------------------- */

test('a report keeps half its force after the half-life', () => {
  assert.equal(remainingForce(0), 1);
  assert.ok(Math.abs(remainingForce(HALF_LIFE_DAYS) - 0.5) < 1e-9);
  assert.ok(remainingForce(HALF_LIFE_DAYS * 3) < 0.2, 'last month still rules');
});

test('last month\'s discovery does not rule forever', () => {
  const fresh = weighFindings({ events: [ev('hot-spot', { nodes: ['psoas'] })], now: NOW });
  const stale = weighFindings({
    events: [makeEvent({ kind: 'hot-spot', nodes: ['psoas'], at: daysAgo(90) })],
    now: NOW,
  });
  assert.ok(stale.psoas.weight < fresh.psoas.weight, 'a 90-day-old report is as loud as today\'s');
  assert.ok(stale.psoas.weight > BASELINE, 'it should fade, not vanish');
});

test('eased up moves toward baseline and never past it', () => {
  const events = [
    makeEvent({ kind: 'hot-spot', nodes: ['psoas'], at: daysAgo(2) }),
    makeEvent({ kind: 'eased-up', nodes: ['psoas'], at: daysAgo(1) }),
    makeEvent({ kind: 'eased-up', nodes: ['psoas'], at: daysAgo(0) }),
    makeEvent({ kind: 'eased-up', nodes: ['psoas'], at: daysAgo(0) }),
  ];
  const table = weighFindings({ events, now: NOW });
  // "Eased up" is a correction, not a vote that this muscle matters less than
  // one nobody has ever mentioned.
  assert.ok(table.psoas.weight <= BASELINE + 1e-9, 'easing up did not bring it down');
  assert.ok(table.psoas.weight >= BASELINE - 1e-9, 'easing up pushed it below baseline');
});

test('order matters, and out-of-order events are sorted before they are applied', () => {
  const inOrder = [
    makeEvent({ kind: 'hot-spot', nodes: ['psoas'], at: daysAgo(3) }),
    makeEvent({ kind: 'eased-up', nodes: ['psoas'], at: daysAgo(1) }),
  ];
  const shuffled = [inOrder[1], inOrder[0]];
  assert.deepEqual(
    weighFindings({ events: shuffled, now: NOW }).psoas.weight,
    weighFindings({ events: inOrder, now: NOW }).psoas.weight,
  );
});

test('one bad fortnight cannot make a single muscle own every session', () => {
  const events = Array.from({ length: 40 }, () => ev('muscle-gave-out', { nodes: ['psoas'] }));
  const table = weighFindings({ events, now: NOW });
  assert.ok(table.psoas.weight <= MAX_WEIGHT, `weight ran to ${table.psoas.weight}`);
  const eased = weighFindings({
    events: Array.from({ length: 40 }, () => ev('eased-up', { nodes: ['psoas'] })),
    now: NOW,
  });
  assert.ok(eased.psoas.weight >= MIN_WEIGHT);
});

/* ------------------------------- provenance ------------------------------- */

test('a weight can say where it came from', () => {
  // D41's focus list: every row carries a one-line why and its source —
  // "you reported it" / "quiz seed" / "your re-test moved".
  const events = [
    makeEvent({ kind: 'hot-spot', nodes: ['psoas'], source: 'quiz-seed', at: daysAgo(5) }),
    makeEvent({ kind: 'muscle-gave-out', nodes: ['psoas'], source: 'reported', at: daysAgo(1) }),
  ];
  const table = weighFindings({ events, now: NOW });
  assert.deepEqual(table.psoas.sources.sort(), ['quiz-seed', 'reported']);
  assert.equal(table.psoas.events.length, 2, 'the weight cannot show its working');
});

test('a seeded weight and a reported one use identical arithmetic', () => {
  // "Tap arithmetic is uniform for everyone" — the pacing profile governs dial
  // defaults and copy, never tap math. Provenance is a label, not a multiplier.
  const seed = weighFindings({ events: [ev('hot-spot', { nodes: ['a'], source: 'quiz-seed' })], now: NOW });
  const said = weighFindings({ events: [ev('hot-spot', { nodes: ['a'], source: 'reported' })], now: NOW });
  assert.equal(seed.a.weight, said.a.weight);
});

test('an unknown tap is refused rather than silently ignored', () => {
  assert.throws(() => makeEvent({ kind: 'felt-weird', nodes: ['psoas'] }), /unknown finding kind/);
  assert.throws(() => makeEvent({ kind: 'hot-spot', nodes: ['psoas'], source: 'vibes' }), /unknown finding source/);
});

test('an event records what happened and nothing it did not', () => {
  const e = makeEvent({ kind: 'hot-spot', nodes: ['psoas', 'psoas'] });
  assert.deepEqual(e.nodes, ['psoas'], 'duplicate nodes were kept');
  assert.equal(e.itemId, undefined, 'absent is not empty (D24)');
  assert.equal(e.rating, undefined);
  assert.ok(e.id && e.at);
});

test('a node nobody has mentioned sits at baseline', () => {
  assert.equal(weightOf({}, 'never-mentioned'), BASELINE);
  assert.equal(weightOf(undefined, 'never-mentioned'), BASELINE);
  assert.equal(STEP > 0 && MAX_WEIGHT > BASELINE && MIN_WEIGHT < BASELINE, true);
});

/* ------------------------------ the rung itself --------------------------- */
// A released migration rung is never edited, only appended to — so a wrong one
// is permanent. These check the shape of the ladder and that the store it adds
// actually exists, rather than trusting that a passing suite means a working
// upgrade.

test('the migration ladder is contiguous and tops out at the declared version', async () => {
  const { MIGRATIONS, SCHEMA_VERSION, STORES } = await import('../src/lib/schema.js');
  const tos = MIGRATIONS.map((m) => m.to);
  assert.deepEqual(tos, [...tos].sort((a, b) => a - b), 'rungs are out of order');
  tos.forEach((to, i) => assert.equal(to, i + 1, `rung ${i} climbs to ${to}`));
  assert.equal(Math.max(...tos), SCHEMA_VERSION, 'the ladder does not reach SCHEMA_VERSION');
  assert.equal(STORES.FINDINGS, 'findings');
  for (const m of MIGRATIONS) assert.equal(typeof m.run, 'function');
});

test('the findings store exists and round-trips a tap', async () => {
  const store = await import('../src/app/store.js');
  store._resetForTests();
  await store.ready({ name: 'findings-rung' });

  assert.deepEqual(await store.loadFindings(), [], 'a fresh database should have no findings');

  const first = makeEvent({ kind: 'hot-spot', nodes: ['psoas'], at: daysAgo(2) });
  const second = makeEvent({ kind: 'muscle-gave-out', nodes: ['glute-max'], at: daysAgo(1) });
  await store.addFinding(second);
  await store.addFinding(first);

  const back = await store.loadFindings();
  assert.equal(back.length, 2);
  assert.deepEqual(back.map((e) => e.id), [first.id, second.id], 'findings come back oldest first');

  // And the round trip is lossless enough to weigh.
  const table = weighFindings({ events: back, now: NOW });
  assert.ok(table.psoas.weight > BASELINE);
  assert.equal(table['glute-max'].pairedLoad, true);
});
