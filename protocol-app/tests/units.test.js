// Water is a volume, not a "glass" (decision K2). These tests pin the three
// things that can go wrong when a unit changes underneath people: the reading,
// the three-state law, and the conversion of records written by the old build.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  unitsOf,
  stepMl,
  volumeUnitLabel,
  displayVolume,
  parseVolume,
  legacyGlassesToMl,
  unitsForItem,
  cleanByEquipment,
  displayWeight,
  parseWeight,
} from '../src/lib/units.js';
import { blankDay, normalizeDay, bumpWaterMl, setWaterMl } from '../src/app/trackerOps.js';
import { openDb, put, getAll } from '../src/lib/db.js';
import { STORES, SCHEMA_VERSION } from '../src/lib/schema.js';

test('imperial is the default, and the setting only changes the reading', () => {
  assert.equal(unitsOf(undefined), 'imperial');
  assert.equal(unitsOf({ value: 'nonsense' }), 'imperial', 'an unknown value is not metric');
  assert.equal(unitsOf({ value: 'metric' }), 'metric');
  assert.equal(volumeUnitLabel('imperial'), 'oz');
  assert.equal(volumeUnitLabel('metric'), 'ml');

  // One stored number, two readings — the record does not change.
  const ml = 3 * stepMl('imperial'); // three taps
  assert.equal(displayVolume(ml, 'imperial'), 24, 'three taps of 8 oz reads as 24 oz');
  assert.equal(displayVolume(ml, 'metric'), 711);
});

test('display and parse never invent a number', () => {
  assert.equal(displayVolume(undefined, 'imperial'), undefined, 'nothing logged reads as nothing');
  assert.equal(displayVolume(Number.NaN, 'imperial'), undefined);
  assert.equal(displayVolume(0, 'imperial'), 0, 'a logged zero is a number and stays one');

  assert.equal(parseVolume('', 'imperial'), undefined, 'clearing the box is not zero');
  assert.equal(parseVolume('   ', 'imperial'), undefined);
  assert.equal(parseVolume('abc', 'imperial'), undefined);
  assert.equal(parseVolume('-5', 'imperial'), undefined);
  assert.equal(parseVolume('0', 'imperial'), 0, 'a typed zero is a real zero');
  assert.equal(parseVolume('16', 'imperial'), 473);
  assert.equal(parseVolume('500', 'metric'), 500);
});

test('ruling A holds in millilitres: absence, taps, and a typed clear', () => {
  const day = blankDay('2026-08-22');
  assert.equal('waterMl' in day, false, 'a fresh record carries no volume at all');

  const same = bumpWaterMl(day, -stepMl('imperial'));
  assert.equal(same, day, 'a minus-tap on nothing changes nothing — not even updatedAt');

  const one = bumpWaterMl(day, stepMl('imperial'));
  assert.equal(one.waterMl, 237);
  const zero = bumpWaterMl(one, -3 * stepMl('imperial'));
  assert.equal(zero.waterMl, 0, 'floor at zero — a record, not a debt');

  const typed = setWaterMl(zero, parseVolume('40', 'imperial'));
  assert.equal(typed.waterMl, 1183);
  const cleared = setWaterMl(typed, parseVolume('', 'imperial'));
  assert.equal('waterMl' in cleared, false, 'emptying the box returns the day to never-logged');
});

test('a v0.2 record counted in glasses is converted, and says so', () => {
  const n = normalizeDay({ date: '2026-08-18', checks: {}, food: [], water: 5 }, '2026-08-18');
  assert.equal(n.waterMl, legacyGlassesToMl(5));
  assert.equal(n.waterFromGlasses, 5, 'the derived number is marked as derived');
  assert.equal('water' in n, false, 'the old field does not linger to be double-counted');

  const zero = normalizeDay({ date: '2026-08-18', water: 0 }, '2026-08-18');
  assert.equal(zero.waterMl, 0, 'an explicit old zero is still an explicit zero');
  assert.equal(zero.waterFromGlasses, 0);

  const junk = normalizeDay({ date: '2026-08-18', water: Number.NaN }, '2026-08-18');
  assert.equal('waterMl' in junk, false, 'junk is absence, not zero');
  assert.equal('waterFromGlasses' in junk, false);

  const already = normalizeDay({ date: '2026-08-18', water: 5, waterMl: 1000 }, '2026-08-18');
  assert.equal(already.waterMl, 1000, 'a real volume is never overwritten by a stale glasses count');

  // Typing over a converted number makes it the person's own.
  const owned = setWaterMl(normalizeDay({ date: '2026-08-18', water: 5 }, '2026-08-18'), 1000);
  assert.equal(owned.waterMl, 1000);
  assert.equal('waterFromGlasses' in owned, false);
});

test('the migration ladder converts what is already in the database', async () => {
  const name = 'units-migration-1';

  // A version-1 database, exactly as v0.2 left it.
  const v1 = await new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore(STORES.PROTOCOLS, { keyPath: 'id' });
      db.createObjectStore(STORES.DAYS, { keyPath: 'date' });
      db.createObjectStore(STORES.LABS, { keyPath: 'id' });
      db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await put(v1, STORES.DAYS, { date: '2026-08-10', checks: {}, food: [], water: 6, updatedAt: 'x' });
  await put(v1, STORES.DAYS, { date: '2026-08-11', checks: {}, food: [], updatedAt: 'x' });
  v1.close();

  // Reopening through the app's own ladder is the upgrade.
  const db = await openDb({ name });
  assert.equal(db.version, SCHEMA_VERSION);
  const days = (await getAll(db, STORES.DAYS)).sort((a, b) => (a.date < b.date ? -1 : 1));

  assert.equal(days[0].waterMl, legacyGlassesToMl(6));
  assert.equal(days[0].waterFromGlasses, 6);
  assert.equal('water' in days[0], false);

  assert.equal('waterMl' in days[1], false, 'a day with no water does not grow one');
  db.close();
});

/* ------------------ units that follow the equipment (29 Aug) ------------- */
// Kevin: "allow them to toggle the units based on the equipment." One global
// toggle cannot tell the truth about a rack with both on it — kettlebells are
// sold in kilograms where everything else is sold in pounds.

test('a kettlebell can read in kilos while everything else reads in pounds', () => {
  const prefs = { units: 'imperial', byEquipment: { kettlebell: 'metric' } };
  assert.equal(unitsForItem({ equipment: ['kettlebell'] }, prefs), 'metric');
  assert.equal(unitsForItem({ equipment: ['dumbbell'] }, prefs), 'imperial');
  assert.equal(unitsForItem({ equipment: ['roller'] }, prefs), 'imperial');
  assert.equal(unitsForItem({}, prefs), 'imperial');
});

test('an absent preference means "same as everything else", not metric', () => {
  // Nobody is told their kettlebells are in kilos because kettlebells usually
  // are. Theirs might not be. Three-state absence, as everywhere else.
  assert.equal(unitsForItem({ equipment: ['kettlebell'] }, { units: 'imperial', byEquipment: {} }), 'imperial');
  assert.equal(unitsForItem({ equipment: ['kettlebell'] }, { units: 'metric', byEquipment: {} }), 'metric');
});

test('an item needing two weighted things gets a stable answer', () => {
  // A card can list its kit in any order; the answer must not depend on that.
  const prefs = { units: 'imperial', byEquipment: { kettlebell: 'metric', dumbbell: 'imperial' } };
  assert.equal(unitsForItem({ equipment: ['kettlebell', 'dumbbell'] }, prefs), 'imperial');
  assert.equal(unitsForItem({ equipment: ['dumbbell', 'kettlebell'] }, prefs), 'imperial');
});

test('only equipment that carries a load can carry a unit', () => {
  // A foam roller has no weight to express, so a preference on one is dropped
  // rather than stored to confuse somebody later.
  assert.deepEqual(cleanByEquipment({ kettlebell: 'metric', roller: 'metric', mace: 'nonsense' }), { kettlebell: 'metric' });
  assert.deepEqual(cleanByEquipment(undefined), {});
});

test('the storage does not move — this is a reading preference', () => {
  // 61.235 kg is 61.235 kg whichever way it is shown, so switching re-reads
  // history instead of reinterpreting it (the rule the global toggle follows).
  const kg = parseWeight('135', 'imperial');
  assert.equal(displayWeight(kg, 'imperial'), 135);
  assert.equal(displayWeight(kg, 'metric'), 61);
});
