// Check-off snapshots (decision 20) and the supply dose model (decision 22).
//
// The two belong in one file because they are one tap. A check-off records
// what the item WAS when you tapped it, and takes what the dose says out of
// the bottle — and the two land together or not at all, because a tick against
// stock that never moved and stock that moved with no tick to explain it are
// both records that lie about what happened (ruling B, point 6).

import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  blankDay,
  toggleCheck,
  makeSupply,
  supplyKey,
  doseUnits,
  isTracked,
  applyCheckToggle,
  setCheckUnits,
  unavailableReason,
} from '../src/app/trackerOps.js';
import * as store from '../src/app/store.js';

let n = 0;
async function freshStore() {
  store._resetForTests();
  return store.ready({ name: `supply-test-${++n}` });
}

const MAG = { id: 'it-mag', name: 'Magnesium glycinate', dose: '400 mg' };
const bottle = (over = {}) =>
  makeSupply(MAG.id, { name: MAG.name, count: 60, unitsPerDose: 2, unitName: 'capsules', ...over });

/* ------------------------ snapshots (decision 20) ---------------------- */

test('a check-off records what the item was at the moment of the tap', () => {
  const day = toggleCheck(blankDay('2026-08-23'), MAG.id, {
    at: '2026-08-23T07:05:00.000Z', name: MAG.name, dose: MAG.dose,
  });
  assert.deepEqual(day.checks[MAG.id], {
    at: '2026-08-23T07:05:00.000Z', name: 'Magnesium glycinate', dose: '400 mg',
  });
});

test('renaming an item does not rewrite what the record says happened', () => {
  const day = toggleCheck(blankDay('2026-08-23'), MAG.id, { name: MAG.name, dose: '400 mg' });
  // Six months later the plan says something else entirely. The record does not
  // move: plan edits never rewrite history (decision 21).
  const renamed = { id: MAG.id, name: 'Magnesium — evening', dose: '200 mg' };
  const later = toggleCheck(day, renamed.id); // un-tick, then re-tick under the new plan
  const again = toggleCheck(later, renamed.id, { name: renamed.name, dose: renamed.dose });

  assert.equal(day.checks[MAG.id].name, 'Magnesium glycinate');
  assert.equal(day.checks[MAG.id].dose, '400 mg');
  assert.equal(again.checks[MAG.id].name, 'Magnesium — evening');
});

test('an item with nothing configured writes no empty strings (ruling A)', () => {
  const day = toggleCheck(blankDay('2026-08-23'), 'plain', { name: 'A thing', dose: '' });
  assert.deepEqual(Object.keys(day.checks.plain).sort(), ['at', 'name']);
  assert.equal('dose' in day.checks.plain, false);
});

test('the older call shape — a plain timestamp — still means "just the moment"', () => {
  const day = toggleCheck(blankDay('2026-08-23'), 'x', '2026-08-23T07:05:00.000Z');
  assert.deepEqual(day.checks.x, { at: '2026-08-23T07:05:00.000Z' });
});

/* --------------------- the dose model (decision 22) -------------------- */

test('a dose needs both halves before anything decrements', () => {
  assert.equal(doseUnits(undefined), null);
  assert.equal(doseUnits(makeSupply(MAG.id, { count: 60 })), null, 'a count alone is hand-counting');
  assert.equal(doseUnits(makeSupply(MAG.id, { unitsPerDose: 2 })), null, 'a dose with nothing to come out of');
  assert.equal(doseUnits(bottle()), 2);
});

test('every field is optional, and blank clears rather than zeroing', () => {
  const full = bottle({ unitStrength: '400 mg', note: 'Big jar' });
  assert.equal(full.unitsPerDose, 2);
  assert.equal(full.unitStrength, '400 mg');

  const cleared = makeSupply(MAG.id, { unitsPerDose: '', unitName: '  ', count: '' }, full);
  assert.equal('unitsPerDose' in cleared, false);
  assert.equal('unitName' in cleared, false);
  assert.equal('count' in cleared, false);
  assert.equal(cleared.unitStrength, '400 mg', 'clearing one field leaves the others alone');

  // Zero units per dose is not a dose.
  assert.equal('unitsPerDose' in makeSupply(MAG.id, { unitsPerDose: 0 }), false);
});

test('isTracked is what keeps the screen about supplies rather than stretches', () => {
  assert.equal(isTracked(undefined), false);
  assert.equal(isTracked(makeSupply('x', {})), false);
  assert.equal(isTracked(makeSupply('x', { count: 0 })), true, 'a real zero is being tracked, and is out');
  assert.equal(isTracked(makeSupply('x', { note: 'ordered more' })), true);
});

test('check off, and the bottle goes down; un-check, and it comes back exactly', () => {
  const day = blankDay('2026-08-23');
  const on = applyCheckToggle({ day, item: MAG, supply: bottle(), at: 'T1' });

  assert.equal(on.supply.count, 58);
  assert.deepEqual(on.day.checks[MAG.id], {
    at: 'T1', name: MAG.name, dose: '400 mg', units: 2, unitName: 'capsules',
  });

  const off = applyCheckToggle({ day: on.day, item: MAG, supply: on.supply });
  assert.equal(off.supply.count, 60);
  assert.equal(off.day.checks[MAG.id], undefined);
});

test('an item with no dose configured ticks without touching anything', () => {
  const out = applyCheckToggle({ day: blankDay('2026-08-23'), item: MAG, supply: makeSupply(MAG.id, { count: 60 }) });
  assert.equal(out.supply, undefined, 'nothing moved, so nothing is written');
  assert.equal('units' in out.day.checks[MAG.id], false);
});

test('a bottle that cannot cover a dose gives what it has, and still round-trips', () => {
  // The count said 1 and the dose is 2 — which means the count was wrong, not
  // that the app should invent stock or go negative.
  const on = applyCheckToggle({ day: blankDay('2026-08-23'), item: MAG, supply: bottle({ count: 1 }) });
  assert.equal(on.supply.count, 0);
  assert.equal(on.day.checks[MAG.id].units, 1, 'it records what actually came out');

  const off = applyCheckToggle({ day: on.day, item: MAG, supply: on.supply });
  assert.equal(off.supply.count, 1, 'exactly back where it started');

  // And at zero the app stops asking rather than nagging (R16 / decision 22).
  assert.deepEqual(unavailableReason(MAG.id, { supply: on.supply })?.kind, 'out-of-stock');
});

test('correcting the units afterwards moves the count by the difference', () => {
  const on = applyCheckToggle({ day: blankDay('2026-08-23'), item: MAG, supply: bottle() });
  assert.equal(on.supply.count, 58);

  // "It says two, I only took one."
  const fixed = setCheckUnits({ day: on.day, supply: on.supply, itemId: MAG.id, units: 1 });
  assert.equal(fixed.supply.count, 59);
  assert.equal(fixed.day.checks[MAG.id].units, 1);

  // Clearing it means "I am not saying" — the units leave the record, and what
  // was deducted goes back.
  const cleared = setCheckUnits({ day: fixed.day, supply: fixed.supply, itemId: MAG.id, units: null });
  assert.equal(cleared.supply.count, 60);
  assert.equal('units' in cleared.day.checks[MAG.id], false);
  assert.equal(cleared.day.checks[MAG.id].at, on.day.checks[MAG.id].at, 'the tap itself is untouched');
});

test('correcting units on something never checked off does nothing at all', () => {
  const out = setCheckUnits({ day: blankDay('2026-08-23'), supply: bottle(), itemId: MAG.id, units: 5 });
  assert.deepEqual(out, {});
});

/* ------------------- both stores, or neither (ruling B) ---------------- */

test('the tick and the count are written in one transaction', async () => {
  await freshStore();
  const date = '2026-08-23';
  await store.putSetting(bottle());

  await store.mutateDayWithSupply(date, MAG.id, ({ day, supply }) =>
    applyCheckToggle({ day, item: MAG, supply }));

  assert.equal((await store.loadDay(date)).checks[MAG.id].units, 2);
  assert.equal((await store.getSetting(supplyKey(MAG.id))).count, 58);

  // …and back again, through the same door.
  await store.mutateDayWithSupply(date, MAG.id, ({ day, supply }) =>
    applyCheckToggle({ day, item: MAG, supply }));

  assert.equal((await store.loadDay(date)).checks[MAG.id], undefined);
  assert.equal((await store.getSetting(supplyKey(MAG.id))).count, 60);
});

test('a fast thumb is still a fast thumb: ten taps are ten deductions', async () => {
  await freshStore();
  const date = '2026-08-23';
  await store.putSetting(makeSupply('multi', { name: 'Multi', count: 100, unitsPerDose: 1 }));

  // Ten different items would be ten separate records; this is the harder case
  // — the same bottle, hit ten times without waiting.
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `dose-${i}`, name: `Dose ${i}` }));
  await Promise.all(items.map((item) =>
    store.mutateDayWithSupply(date, 'multi', ({ day, supply }) => {
      const out = applyCheckToggle({ day, item, supply });
      // Every item ticks, and every tick comes out of the one shared bottle.
      return { day: out.day, supply: supply ? { ...supply, count: supply.count - 1 } : undefined };
    })));

  const day = await store.loadDay(date);
  assert.equal(Object.keys(day.checks).length, 10, 'ten taps, ten records');
  assert.equal((await store.getSetting(supplyKey('multi'))).count, 90, 'and ten off the count');
});

test('nothing is written when nothing changed', async () => {
  await freshStore();
  const date = '2026-08-23';
  await store.mutateDayWithSupply(date, 'ghost', ({ day }) => ({ day }));
  const raw = await store.getSetting(supplyKey('ghost'));
  assert.equal(raw, undefined, 'no supply record invented for an item that has none');
  const day = await store.loadDay(date);
  assert.deepEqual(day.checks, {}, 'and no day record stamped into existence');
});

test('three fields saved at once all survive — no load-then-save gap', async () => {
  await freshStore();
  // The supply screen writes a field at a time. Done as load-then-save, three
  // quick edits all read the same pre-edit record and the last one wins, so two
  // of them vanish under a green tick. One transaction each, and they compose.
  await Promise.all([
    store.mutateSetting(supplyKey(MAG.id), (cur) => makeSupply(MAG.id, { count: 60 }, cur)),
    store.mutateSetting(supplyKey(MAG.id), (cur) => makeSupply(MAG.id, { unitsPerDose: 2 }, cur)),
    store.mutateSetting(supplyKey(MAG.id), (cur) => makeSupply(MAG.id, { unitName: 'capsules' }, cur)),
  ]);

  const rec = await store.getSetting(supplyKey(MAG.id));
  assert.equal(rec.count, 60);
  assert.equal(rec.unitsPerDose, 2);
  assert.equal(rec.unitName, 'capsules');
  assert.equal(doseUnits(rec), 2, 'and the dose is live, which is the point of all three');
});
