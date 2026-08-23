// Time display (decision 23) and phase auto-advance (decision 14) — the last
// two items on the Phase 1 build queue.
//
// They share a file because they share a rule: the app reads a stored value in
// whatever way suits the person, and the stored value never moves. A block
// starts at '06:30' whether you read it as half six or as 6:30 AM, and a phase
// pointer counts from a date rather than from whenever somebody last opened
// the app.

import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  displayTime,
  timeFormatOf,
  dateKeyFromIso,
  localDateKey,
} from '../src/lib/core.js';
import {
  phaseAsOf,
  phaseProgress,
  currentPhase,
  buildToday,
  makePhaseSetting,
  phaseKey,
} from '../src/app/todayModel.js';
import * as store from '../src/app/store.js';

let n = 0;
async function freshStore() {
  store._resetForTests();
  return store.ready({ name: `clock-test-${++n}` });
}

/* ------------------------- the clock (decision 23) --------------------- */

test('a stored time reads either way, and is never rewritten', () => {
  assert.equal(displayTime('06:30', '24'), '06:30');
  assert.equal(displayTime('06:30', '12'), '6:30 AM');
  assert.equal(displayTime('18:05', '24'), '18:05');
  assert.equal(displayTime('18:05', '12'), '6:05 PM');
});

test('midnight and noon are the two everybody gets wrong', () => {
  assert.equal(displayTime('00:00', '12'), '12:00 AM');
  assert.equal(displayTime('12:00', '12'), '12:00 PM');
  assert.equal(displayTime('12:59', '12'), '12:59 PM');
  assert.equal(displayTime('00:01', '24'), '00:01');
});

test('anything that is not a clock time comes back untouched', () => {
  // Inventing a time for an unparseable value would be worse than showing it
  // raw — and '24:00' is an internal end-of-day marker, not half past midnight.
  assert.equal(displayTime('24:00', '12'), '24:00');
  assert.equal(displayTime('', '12'), '');
  assert.equal(displayTime(undefined, '12'), '');
  assert.equal(displayTime('sometime', '12'), 'sometime');
  assert.equal(displayTime('7:5', '12'), '7:5');
});

test('an unrecognised setting means follow the device, never a crash', () => {
  assert.equal(timeFormatOf(undefined), 'auto');
  assert.equal(timeFormatOf({ value: 'wibble' }), 'auto');
  assert.equal(timeFormatOf({ value: '12' }), '12');
  assert.equal(timeFormatOf({ value: '24' }), '24');
});

test('dateKeyFromIso reads a local day, and refuses to guess', () => {
  assert.equal(dateKeyFromIso(null), null);
  assert.equal(dateKeyFromIso('not a date'), null);
  const iso = new Date(2026, 7, 23, 9, 0, 0).toISOString();
  assert.equal(dateKeyFromIso(iso), '2026-08-23');
});

/* --------------------- phase auto-advance (decision 14) ---------------- */

const plan = (over = {}) => ({
  id: 'p-phased',
  name: 'Twelve weeks',
  active: true,
  phases: [
    { id: 'ph-1', name: 'Prepare', days: 14, order: 0 },
    { id: 'ph-2', name: 'Work', days: 28, order: 1 },
    { id: 'ph-3', name: 'Hold', order: 2 }, // no length on purpose
  ],
  blocks: [{
    id: 'b1', name: 'Daily', order: 0,
    items: [
      { id: 'i-always', name: 'Water' },
      { id: 'i-p1', name: 'Prep only', phaseIds: ['ph-1'] },
      { id: 'i-p2', name: 'Work only', phaseIds: ['ph-2'] },
    ],
  }],
  createdAt: new Date(2026, 7, 1, 8, 0, 0).toISOString(), // 1 Aug
  updatedAt: 'x',
  ...over,
});

const pointer = (phaseId, startedAt) => makePhaseSetting('p-phased', phaseId, startedAt, 'x');

test('a phase runs out and the next one starts, without anybody remembering to', () => {
  const p = plan();
  assert.equal(phaseAsOf(p, pointer('ph-1', '2026-08-01'), '2026-08-14').phase.id, 'ph-1',
    'day 14 is the last day of a 14-day phase');
  const moved = phaseAsOf(p, pointer('ph-1', '2026-08-01'), '2026-08-15');
  assert.equal(moved.phase.id, 'ph-2');
  assert.equal(moved.startedAt, '2026-08-15');
  assert.equal(moved.moved, true);
});

test('a plan looked at months late lands where it would have been all along', () => {
  // Away for the whole autumn: 14 days of prepare, then 28 of work, then hold.
  const out = phaseAsOf(plan(), pointer('ph-1', '2026-08-01'), '2026-12-01');
  assert.equal(out.phase.id, 'ph-3');
  // The boundaries stay where they belong rather than resetting to today.
  assert.equal(out.startedAt, '2026-09-12'); // 1 Aug + 14 + 28
});

test('a phase with no length waits forever, and the last phase is the end', () => {
  const out = phaseAsOf(plan(), pointer('ph-3', '2026-09-12'), '2027-06-01');
  assert.equal(out.phase.id, 'ph-3', 'it never wraps round to the first phase');
  assert.equal(out.moved, false);

  // Same rule mid-plan: an open-ended phase in the middle stops the cascade.
  const openMiddle = plan({
    phases: [
      { id: 'a', name: 'A', days: 7, order: 0 },
      { id: 'b', name: 'B', order: 1 },
      { id: 'c', name: 'C', days: 7, order: 2 },
    ],
  });
  assert.equal(phaseAsOf(openMiddle, pointer('a', '2026-08-01'), '2027-01-01').phase.id, 'b');
});

test('with no pointer it counts from the day the plan was made', () => {
  // Nothing is stamped just to have something to count from — createdAt is
  // already recorded, and it is the honest origin.
  const out = phaseAsOf(plan(), undefined, '2026-08-20');
  assert.equal(out.phase.id, 'ph-2');
  assert.equal(out.moved, true);

  // …and a plan with no createdAt to read simply does not advance.
  const noOrigin = phaseAsOf(plan({ createdAt: undefined }), undefined, '2026-12-01');
  assert.equal(noOrigin.phase.id, 'ph-1');
  assert.equal(noOrigin.moved, false);
});

test('a pointer at a phase that was edited away falls back rather than breaking', () => {
  const out = phaseAsOf(plan(), pointer('ph-gone', '2026-08-01'), '2026-08-02');
  assert.equal(out.phase.id, 'ph-1');
  assert.equal(currentPhase(plan(), pointer('ph-gone')).phase.id, 'ph-1');
});

test('phaseProgress says where you are, and never how you are doing', () => {
  assert.deepEqual(phaseProgress({ days: 14 }, '2026-08-01', '2026-08-01'), { dayNumber: 1, total: 14 });
  assert.deepEqual(phaseProgress({ days: 14 }, '2026-08-01', '2026-08-14'), { dayNumber: 14, total: 14 });
  assert.deepEqual(phaseProgress({}, '2026-08-01', '2026-08-09'), { dayNumber: 9, total: null });
  assert.equal(phaseProgress(null, '2026-08-01', '2026-08-09'), null);
});

test('the day is filtered by where the plan has got to, not where the pointer sits', async () => {
  const today = buildToday({
    protocols: [plan()],
    phaseSettings: { 'p-phased': pointer('ph-1', '2026-08-01') },
    now: new Date(2026, 7, 20, 9, 0, 0), // 20 Aug — phase 2 by then
    day: { date: '2026-08-20', checks: {} },
  });
  const names = today.blocks[0].items.map((i) => i.name);
  assert.deepEqual(names, ['Water', 'Work only'], 'untagged items always show; phase 1 items do not');
  assert.equal(today.phasedProtocols[0].current.id, 'ph-2');
  assert.deepEqual(today.phasedProtocols[0].progress, { dayNumber: 6, total: 28 });
});

test('advancing is written once, and looking at a past day writes nothing', async () => {
  await freshStore();
  const p = plan();
  await store.saveProtocol(p);
  await store.putSetting(pointer('ph-1', '2026-08-01'));

  const after = await store.advancePhases([p], { [p.id]: pointer('ph-1', '2026-08-01') }, '2026-08-20');
  assert.equal(after[p.id].phaseId, 'ph-2');
  assert.equal((await store.getSetting(phaseKey(p.id))).phaseId, 'ph-2', 'and it persisted');

  // Idempotent: run it again on the same day and nothing moves.
  const stamp = (await store.getSetting(phaseKey(p.id))).updatedAt;
  const again = await store.advancePhases([p], after, '2026-08-20');
  assert.equal(again[p.id].updatedAt, stamp, 'a settled pointer is not rewritten');
});

test('a protocol that is switched off is not advanced behind your back', async () => {
  await freshStore();
  const p = plan({ active: false });
  await store.saveProtocol(p);
  const out = await store.advancePhases([p], {}, '2026-12-01');
  assert.equal(out[p.id], undefined);
  assert.equal(await store.getSetting(phaseKey(p.id)), undefined);
});

test('a protocol with no phases is left entirely alone', async () => {
  await freshStore();
  const p = plan({ phases: [] });
  await store.saveProtocol(p);
  const out = await store.advancePhases([p], {}, localDateKey());
  assert.deepEqual(out, {});
});
