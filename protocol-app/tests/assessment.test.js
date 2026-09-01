// The assessment — what the app is told, before it deals anything.
//
// Kevin, 31 Aug: "there should be a thing for me to take an initial assessment
// so it can know what my problem areas are and be intentionally devise what
// kind of releases and stretches and exercises I should be doing."
//
// D16 governs the shape and it is mostly a list of things this must NOT do:
// no labels ever, it never gates anything, and the question-earning rule —
// "a question belongs in the bank only if some answer changes the output."
// Most of this file tests those.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import 'fake-indexeddb/auto';
import {
  QUESTIONS, AREAS, PACING, seedFrom, capDial, descendantsOf,
} from '../src/app/composer/assessment.js';
import { reachableNodes, nodesOf } from '../src/app/composer/ledger.js';
import { weighFindings, weightOf, BASELINE } from '../src/app/composer/findings.js';
import { dealDay, scoreCandidates } from '../src/app/composer/dealer.js';
import { buildLedger } from '../src/app/composer/ledger.js';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const anatomy = Object.fromEntries(Object.values(lib.anatomy).map((n) => [n.id, n]));
const itemsById = Object.fromEntries(lib.items.map((i) => [i.id, i]));
const reachable = reachableNodes(lib.items);
const NOW = new Date('2026-09-02T08:00:00Z');
const emptyLedger = buildLedger({ days: [], itemsById, now: NOW });
const ctx = { anatomy, reachable };

/* --------------------------- the question-earning rule -------------------- */

test('every question says what it changes, and nothing is asked idly', () => {
  assert.ok(QUESTIONS.length >= 4);
  for (const q of QUESTIONS) {
    assert.ok(q.changes?.length > 20, `"${q.ask}" cannot say what it changes`);
    assert.ok(q.options?.length >= 2, `"${q.ask}" offers no real choice`);
    assert.ok(q.note?.length > 20, `"${q.ask}" has no plain-words note`);
  }
});

test('sleep position is not asked, because nothing yet consumes it', () => {
  // FRAMEWORK's onboarding order lists it, and D30 specifies the mixed/unknown
  // branch — but the wake block is fixed content and the unwind-the-night bias
  // is unbuilt, so the answer would change nothing. The question-earning rule
  // is a rule, not an aspiration.
  const asked = QUESTIONS.map((q) => `${q.id} ${q.ask}`).join(' ').toLowerCase();
  assert.doesNotMatch(asked, /sleep|side|back|stomach/,
    'a question was asked whose answer changes nothing yet');
});

/* ------------------------------- no labels -------------------------------- */

test('nothing here names a condition or scores a person', () => {
  // "No labels, ever" (D16). And D28: self-designation, never
  // screening-as-diagnosis.
  const everything = JSON.stringify(QUESTIONS);
  for (const word of ['syndrome', 'disorder', 'hypermobil', 'chronic fatigue']) {
    assert.doesNotMatch(everything, new RegExp(word, 'i'), `the assessment names "${word}"`);
  }
  // Acronyms need boundaries and their own case — an unanchored /EDS/i matches
  // the middle of "needs", which is a test failing on the word "needs".
  for (const acronym of ['EDS', 'HSD', 'POTS', 'ME', 'CFS']) {
    assert.doesNotMatch(everything, new RegExp(`\\b${acronym}\\b`), `the assessment names "${acronym}"`);
  }
  // "diagnosis" is allowed in exactly one shape — the denial D28 requires. Any
  // other use would be the app claiming to make one.
  for (const m of everything.matchAll(/.{16}diagnos/gi)) {
    assert.match(m[0], /not a |never |does not |is not /i,
      `"${m[0].trim()}" uses the word diagnosis outside a denial`);
  }
  // The pacing question is the one that could most easily become a screener.
  const careful = PACING.find((p) => p.id === 'careful');
  assert.match(careful.also, /pattern, not a diagnosis/, 'the pacing copy dropped its D28 hedge');
  assert.match(careful.also, /clinician/, 'the pacing copy no longer points anywhere');
});

/* ------------------------------- the seeding ------------------------------ */

test('a named area seeds the muscles inside it, not just the region', () => {
  // Items target muscles; a weight on "hip" alone would not lift a single glute
  // exercise, so the area is seeded together with everything under it.
  const { events } = seedFrom({ areas: ['hip'] }, ctx);
  assert.equal(events.length, 1, 'one answer should be one traceable note');
  const [event] = events;
  assert.equal(event.source, 'quiz-seed');
  assert.ok(event.nodes.includes('hip'));
  assert.ok(event.nodes.length > 3, `only ${event.nodes.length} nodes seeded for the hips`);
  // And only things the library can actually work.
  for (const node of event.nodes) {
    assert.ok(reachable.includes(node), `${node} was seeded and nothing can work it`);
  }
});

test('every offered area can actually be worked', () => {
  for (const area of AREAS) {
    const { events, notes } = seedFrom({ areas: [area.id] }, ctx);
    assert.equal(notes.length, 0, `${area.name}: ${notes[0]}`);
    assert.equal(events.length, 1, `${area.name} is offered and seeds nothing`);
  }
});

test('an area nothing can work is refused rather than silently seeded', () => {
  const { events, notes } = seedFrom({ areas: ['hip'] }, { anatomy, reachable: [] });
  assert.equal(events.length, 0);
  assert.match(notes[0], /nothing in the library works it/);
});

test('what you say bothers you is what gets dealt', () => {
  // The whole point, end to end: answer the question, and the composer's
  // session changes to work that area.
  const before = dealDay({ items: lib.items, anatomy, ledger: emptyLedger, weights: {}, dial: 'standard', date: '2026-09-02' });
  const { events } = seedFrom({ areas: ['hip'] }, ctx);
  const weights = weighFindings({ events, now: NOW });
  const after = dealDay({ items: lib.items, anatomy, ledger: emptyLedger, weights, dial: 'standard', date: '2026-09-02' });

  assert.notDeepEqual(
    after.session.map((c) => c.item.id),
    before.session.map((c) => c.item.id),
    'naming the hips changed nothing about the session',
  );
  const hipNodes = new Set(['hip', ...descendantsOf(anatomy, 'hip')]);
  const touches = after.session.filter((c) => nodesOf(c.item).some((n) => hipNodes.has(n)));
  assert.ok(touches.length > 0, 'the hips were named and nothing dealt works them');
});

test('a seeded weight is above baseline and says where it came from', () => {
  const { events } = seedFrom({ areas: ['neck'] }, ctx);
  const table = weighFindings({ events, now: NOW });
  const node = events[0].nodes[0];
  assert.ok(weightOf(table, node) > BASELINE);
  assert.deepEqual(table[node].sources, ['quiz-seed'], 'the focus list cannot say this came from the quiz');
});

/* -------------------------------- the dial -------------------------------- */

test('careful pacing caps the dial, and says so', () => {
  // D28: the capacity gate "sets the movement dial's start and caps its ramp".
  assert.equal(capDial('deep', 'careful'), 'standard');
  assert.equal(capDial('standard', 'careful'), 'standard');
  assert.equal(capDial(undefined, 'careful'), 'light');
  // And it caps nothing for anybody else.
  assert.equal(capDial('deep', 'steady'), 'deep');
  assert.equal(capDial('deep', null), 'deep');

  const { settings, notes } = seedFrom({ dial: 'deep', pacing: 'careful' }, ctx);
  assert.equal(settings.find((s) => s.key === 'composer.dial').value, 'standard');
  assert.ok(notes.some((n) => /Standard/.test(n)), 'the cap was applied silently');
});

/* ------------------------------- equipment -------------------------------- */

test('saying what you have stops the composer offering what you do not', () => {
  const withKit = dealDay({
    items: lib.items, anatomy, ledger: emptyLedger, weights: {}, dial: 'deep',
    date: '2026-09-02', equipment: [],
  });
  for (const c of [...withKit.session, ...withKit.snacks]) {
    const needs = (c.item.equipment ?? []).filter((e) => e !== 'none');
    assert.equal(needs.length, 0, `${c.item.id} needs ${needs.join(', ')} and none was available`);
  }
  assert.ok(withKit.session.length > 0, 'owning nothing left nothing to do');
});

test('not having said is not the same as having nothing', () => {
  // D24 again. `null` means unanswered and filters nothing.
  const unknown = dealDay({
    items: lib.items, anatomy, ledger: emptyLedger, weights: {}, dial: 'deep',
    date: '2026-09-02', equipment: null,
  });
  assert.match(unknown.gaps.equipmentUnknown, /nobody has said/);
  const empty = dealDay({
    items: lib.items, anatomy, ledger: emptyLedger, weights: {}, dial: 'deep',
    date: '2026-09-02', equipment: [],
  });
  assert.equal(empty.gaps.equipmentUnknown, undefined);
});

/* -------------------------------- provenance ------------------------------ */

test('the answers are kept, so the assessment can be retaken rather than redone', () => {
  const answers = { areas: ['hip', 'neck'], dial: 'light', pacing: 'steady', equipment: ['band'], morning: 'on-feet' };
  const { settings } = seedFrom(answers, ctx);
  const kept = settings.find((s) => s.key === 'composer.assessment');
  assert.deepEqual(kept.value, answers);
  assert.ok(kept.takenAt, 'no record of when it was taken');
  assert.deepEqual(settings.find((s) => s.key === 'composer.equipment').value, ['band']);
  assert.equal(settings.find((s) => s.key === 'composer.morning').value, 'on-feet');
});

test('answering nothing is a valid way through', () => {
  // "The quiz never gates anything."
  const { events, settings, notes } = seedFrom({}, ctx);
  assert.deepEqual(events, []);
  assert.deepEqual(notes, []);
  assert.equal(settings.find((s) => s.key === 'composer.dial').value, 'standard');
  // And the composer still deals a day.
  const day = dealDay({ items: lib.items, anatomy, ledger: emptyLedger, weights: {}, dial: 'standard', date: '2026-09-02' });
  assert.ok(day.session.length > 0);
});

/* ------------------------------ the morning ------------------------------- */

test('the first block is renamed to the morning somebody actually has', async () => {
  const store = await import('../src/app/store.js');
  const { applyMorning } = await import('../src/app/ui/viewAssessment.js');
  store._resetForTests();
  await store.ready({ name: 'assess-morning' });
  await store.saveProtocol({
    id: 'seed-day-arc', name: 'The day arc', active: true, phases: [],
    blocks: [{ id: 'arc-wake', name: 'Before your feet touch the floor', order: 0, items: [{ id: 'x', name: 'Rock' }] }],
    createdAt: 'x', updatedAt: 'x',
  });

  assert.equal(await applyMorning('on-feet'), true);
  const after = await store.loadProtocol('seed-day-arc');
  assert.equal(after.blocks[0].name, 'First thing, once you are up',
    'the block still assumes a morning that starts in bed');
  // Idempotent — saying the same thing twice is not a second change.
  assert.equal(await applyMorning('on-feet'), false);
  // And unanswered changes nothing.
  assert.equal(await applyMorning(null), false);
});
