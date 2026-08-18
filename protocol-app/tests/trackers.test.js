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
  bumpWater,
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

  day = bumpWater(day, +1);
  day = bumpWater(day, +1);
  day = bumpWater(day, -3);
  assert.equal(day.water, 0); // floor at zero — a tally, not a debt
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
