// Tracker + Today model tests. The trackers write the record of what
// happened; the Today model turns the plan(s) into the day's view. These
// prove: one tap is the whole ask, records survive the round trip, multiple
// active protocols interleave by time, and phases filter without ever
// silently hiding untagged work.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  blankDay,
  toggleCheck,
  setJournal,
  addFood,
  removeFood,
  bumpWaterMl,
  makeSupply,
  supplyKey,
} from '../src/app/trackerOps.js';
import {
  buildToday,
  currentPhase,
  makePhaseSetting,
  phaseKey,
  MOVEMENT_PROMPTS,
} from '../src/app/todayModel.js';
import * as store from '../src/app/store.js';

let n = 0;
async function freshStore() {
  store._resetForTests();
  return store.ready({ name: `tracker-test-${++n}` });
}

/* ------------------------------ day ops ------------------------------- */

test('toggleCheck: one tap on, one tap off; nothing else moves', () => {
  const day = blankDay('2026-08-17');
  const frozen = JSON.stringify(day);

  const checked = toggleCheck(day, 'it-breath', '2026-08-17T07:05:00.000Z');
  assert.deepEqual(checked.checks['it-breath'], { at: '2026-08-17T07:05:00.000Z' });
  assert.equal(JSON.stringify(day), frozen); // pure

  const unchecked = toggleCheck(checked, 'it-breath');
  assert.equal(unchecked.checks['it-breath'], undefined);
  assert.ok(unchecked.updatedAt >= checked.updatedAt);

  const two = toggleCheck(checked, 'it-water');
  assert.ok(two.checks['it-breath']); // other checks untouched
  assert.ok(two.checks['it-water']);
});

test('journal, food, water: record what happened, nothing more', () => {
  let day = blankDay('2026-08-17');
  day = setJournal(day, 'Calves finally quiet today.');
  assert.equal(day.journal, 'Calves finally quiet today.');
  day = setJournal(day, '   ');
  assert.equal(day.journal, undefined); // cleared, not stored as blanks

  day = addFood(day, 'Bone broth', '2026-08-17T12:00:00.000Z');
  day = addFood(day, '  ', '2026-08-17T12:01:00.000Z'); // blank entries are ignored
  assert.equal(day.food.length, 1);
  assert.ok(day.food[0].id);
  const fid = day.food[0].id;
  day = removeFood(day, fid);
  assert.equal(day.food.length, 0);

  day = bumpWaterMl(day, +237);
  day = bumpWaterMl(day, +237);
  day = bumpWaterMl(day, -711);
  assert.equal(day.waterMl, 0); // floor at zero — a record, not a debt
});

/* ------------------------------- supply ------------------------------- */

test('supply lives in settings and survives the round trip', async () => {
  await freshStore();
  const rec = makeSupply('it-mag', { name: 'Magnesium', count: 42, note: 'Big jar' });
  assert.equal(rec.key, supplyKey('it-mag'));
  await store.putSetting(rec);

  const backup = await store.exportBackup();
  await store.eraseEverything();
  const res = await store.importBackup(backup);
  assert.equal(res.ok, true);

  const back = (await store.loadSupplies())['it-mag'];
  assert.equal(back.count, 42);
  assert.equal(back.note, 'Big jar');

  // patching preserves what isn't being changed; blank count means "not tracking"
  const patched = makeSupply('it-mag', { count: '' }, back);
  assert.equal(patched.count, undefined);
  assert.equal(patched.note, 'Big jar');
});

/* ----------------------------- today model ---------------------------- */

function protoA() {
  return {
    id: 'pa',
    name: 'Foundation',
    active: true,
    phases: [],
    blocks: [
      {
        id: 'pa-morning', name: 'Morning', start: '07:00', end: '09:00', order: 0,
        items: [{ id: 'a1', name: 'Box breathing' }],
      },
      {
        id: 'pa-anytime', name: 'Anytime', order: 1,
        items: [{ id: 'a2', name: 'Foot rollout' }],
      },
    ],
    createdAt: 'x', updatedAt: 'x',
  };
}

function protoB() {
  return {
    id: 'pb',
    name: 'Gut support',
    active: true,
    phases: [
      { id: 'ph1', name: 'Settle', days: 14, order: 0 },
      { id: 'ph2', name: 'Build', days: 28, order: 1 },
    ],
    blocks: [
      {
        id: 'pb-midday', name: 'Midday', start: '12:00', order: 0,
        items: [
          { id: 'b1', name: 'Slow lunch, chew well' },
          { id: 'b2', name: 'Post-meal walk', phaseIds: ['ph2'] },
        ],
      },
    ],
    createdAt: 'x', updatedAt: 'x',
  };
}

test('today interleaves active protocols by time; inactive stays home; untimed goes last', () => {
  const inactive = { ...protoA(), id: 'px', name: 'Paused', active: false };
  const out = buildToday({
    protocols: [protoB(), protoA(), inactive],
    now: new Date(2026, 7, 17, 8, 0),
  });
  assert.deepEqual(
    out.blocks.map((b) => b.blockId),
    ['pa-morning', 'pb-midday', 'pa-anytime'], // 07:00, 12:00, then untimed
  );
  assert.equal(out.multipleActive, true);
  assert.equal(out.blocks.some((b) => b.protocolId === 'px'), false);
});

test('time-aware "now": an open-ended block runs until the next timed block', () => {
  const at = (h, m) =>
    buildToday({ protocols: [protoA(), protoB()], now: new Date(2026, 7, 17, h, m) });

  assert.equal(at(8, 0).blocks.find((b) => b.blockId === 'pa-morning').isNow, true);
  assert.equal(at(10, 0).blocks.every((b) => !b.isNow), true); // between windows
  const noon = at(12, 30);
  assert.equal(noon.blocks.find((b) => b.blockId === 'pb-midday').isNow, true); // no end → runs on
  assert.equal(noon.blocks.find((b) => b.blockId === 'pa-morning').isNow, false);
});

test('phases: first phase is current by default; the pointer changes what shows', () => {
  const b = protoB();
  // no stored pointer → first phase; phase-tagged "Build" item hidden, untagged shown
  const def = buildToday({ protocols: [b], now: new Date(2026, 7, 17, 12, 15) });
  assert.equal(def.phasedProtocols[0].current.id, 'ph1');
  assert.deepEqual(def.blocks[0].items.map((i) => i.id), ['b1']);

  // stored pointer to Build → its item appears
  const setting = makePhaseSetting('pb', 'ph2', '2026-08-17', '2026-08-17T00:00:00.000Z');
  assert.equal(setting.key, phaseKey('pb'));
  const later = buildToday({
    protocols: [b],
    phaseSettings: { pb: setting },
    now: new Date(2026, 7, 17, 12, 15),
  });
  assert.deepEqual(later.blocks[0].items.map((i) => i.id), ['b1', 'b2']);

  // pointer to a phase that was edited away → fall back to first, not to hiding things
  const dangling = currentPhase(b, makePhaseSetting('pb', 'gone', '2026-08-17', 'x'));
  assert.equal(dangling.phase.id, 'ph1');
});

test('movement prompts: permanent ids, checks store like any item check', () => {
  assert.ok(MOVEMENT_PROMPTS.length >= 3);
  assert.ok(MOVEMENT_PROMPTS.every((m) => m.id.startsWith('mv-') && m.name && m.why));

  let day = blankDay('2026-08-17');
  day = toggleCheck(day, MOVEMENT_PROMPTS[0].id);
  assert.ok(day.checks['mv-walk']);
});

/* --------------------------- store behavior --------------------------- */

test('saveProtocol stamps updatedAt so the merge referee sees real edits', async () => {
  await freshStore();
  const p = { ...protoA(), updatedAt: '2020-01-01T00:00:00.000Z' };
  const saved = await store.saveProtocol(p);
  assert.ok(saved.updatedAt > '2025-01-01'); // stamped at save, not carried stale
  const loaded = await store.loadProtocol('pa');
  assert.equal(loaded.updatedAt, saved.updatedAt);
});

/* ----------------------------- day groups ----------------------------- */
//
// The screen is groups, not a list (PLAN §5, R16). These pin the classification
// the view draws: what is open now, what is still open from earlier, what is
// coming, and what is already done.

function overlapping() {
  return {
    id: 'ov', name: 'Overlapping', active: true, phases: [],
    blocks: [
      { id: 'b-wake', name: 'Upon waking', start: '05:00', end: '07:00', order: 0,
        items: [{ id: 'i1', name: 'Amino' }, { id: 'i2', name: 'Colostrum' }] },
      { id: 'b-coffee', name: 'With coffee', start: '06:00', end: '08:00', order: 1,
        items: [{ id: 'i3', name: 'Detox blend' }] },
      { id: 'b-dinner', name: 'Dinner', start: '17:00', end: '20:00', order: 2,
        items: [{ id: 'i4', name: 'Collagen' }] },
      { id: 'b-any', name: 'Anytime', order: 3, items: [{ id: 'i5', name: 'Walk' }] },
    ],
    createdAt: 'x', updatedAt: 'x',
  };
}
const ids = (parts) => parts.flatMap((p) => p.items.map((i) => i.id));

test('overlapping blocks are one "now", not two — the double-Now bug', () => {
  const t = buildToday({ protocols: [overlapping()], now: new Date(2026, 7, 22, 6, 30) });
  assert.deepEqual(t.groups.now.map((b) => b.blockId), ['b-wake', 'b-coffee']);
  assert.deepEqual(ids(t.groups.now), ['i1', 'i2', 'i3']);
  assert.equal(t.groups.missed.length, 0, 'a window that has not closed is not missed');
  assert.deepEqual(ids(t.groups.later), ['i4']);
  assert.deepEqual(ids(t.groups.anytime), ['i5'], 'untimed work belongs to no clock');
  assert.equal(t.nextBoundaryHM, '07:00', 'the screen goes stale when the first window closes');
});

test('a closed window puts its unfinished items in "still open", never out of reach', () => {
  const day = { date: '2026-08-22', checks: { i1: { at: 'x' } }, food: [] };
  const t = buildToday({ protocols: [overlapping()], now: new Date(2026, 7, 22, 9, 30), day });

  assert.deepEqual(ids(t.groups.missed), ['i2', 'i3'], 'unchecked and past means still open');
  assert.deepEqual(ids(t.groups.done), ['i1'], 'checked leaves the group it came from');
  assert.equal(t.groups.now.length, 0, 'between windows nothing is "now"');
  assert.deepEqual(ids(t.groups.later), ['i4']);

  // Every item lands in exactly one group — nothing double-counted, nothing lost.
  const all = ['now', 'missed', 'anytime', 'later', 'done'].flatMap((k) => ids(t.groups[k]));
  assert.deepEqual(all.sort(), ['i1', 'i2', 'i3', 'i4', 'i5']);
});

test('checking everything empties the open groups without inventing a score', () => {
  const day = { date: '2026-08-22', checks: {}, food: [] };
  for (const id of ['i1', 'i2', 'i3', 'i4', 'i5']) day.checks[id] = { at: 'x' };
  const t = buildToday({ protocols: [overlapping()], now: new Date(2026, 7, 22, 6, 30), day });
  assert.equal(t.groups.now.length + t.groups.missed.length + t.groups.later.length + t.groups.anytime.length, 0);
  assert.deepEqual(ids(t.groups.done).sort(), ['i1', 'i2', 'i3', 'i4', 'i5']);
});

test('without a day record nothing is done — absence is not a zero (ruling A)', () => {
  const t = buildToday({ protocols: [overlapping()], now: new Date(2026, 7, 22, 6, 30) });
  assert.equal(t.groups.done.length, 0);
  assert.equal(ids(t.groups.now).length, 3);
});

/* ------------------------ concurrent taps ---------------------------- */

test('seventeen quick taps are seventeen recorded taps', async () => {
  await freshStore();
  const date = '2026-08-22';
  const ids = Array.from({ length: 17 }, (_, i) => `it-${i}`);

  // Fired together, exactly as a thumb going down a morning list does — no
  // awaiting between them. Read-modify-write in separate transactions loses
  // most of these; one transaction per change does not.
  await Promise.all(ids.map((id) => store.mutateDay(date, (day) => toggleCheck(day, id))));

  const back = await store.loadDay(date);
  assert.deepEqual(Object.keys(back.checks).sort(), [...ids].sort());
});

test('mutateDay writes nothing when the op declines to change anything', async () => {
  await freshStore();
  const date = '2026-08-22';
  await store.mutateDay(date, (day) => bumpWaterMl(day, -237)); // minus on nothing

  const back = await store.loadDay(date);
  assert.equal('waterMl' in back, false, 'no volume was invented');
  assert.deepEqual(back.checks, {}, 'and no record was conjured to hold it');
});

test('one failed day write does not wedge the writes behind it', async () => {
  await freshStore();
  const date = '2026-08-22';
  const boom = store.mutateDay(date, () => { throw new Error('storage said no'); });
  await assert.rejects(boom, /storage said no/);

  await store.mutateDay(date, (day) => toggleCheck(day, 'after-the-failure'));
  const back = await store.loadDay(date);
  assert.ok(back.checks['after-the-failure'], 'the queue kept moving');
});
