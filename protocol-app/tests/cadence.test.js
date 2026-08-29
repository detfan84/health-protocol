// "How often" and "not right now" — the two reasons something belongs on
// today's screen or does not. PLAN §4.1 (cadence) and R16 (pause, run-out).

import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cadenceOf, cadenceLabel, weekStart, daysBetween, addDays, dueToday,
} from '../src/lib/cadence.js';
import { makePause, unavailableReason, makeSupply } from '../src/app/trackerOps.js';
import { buildToday } from '../src/app/todayModel.js';
import { updateItem, normalizeCadence } from '../src/app/editorOps.js';
import { validateFile } from '../src/lib/protocolFile.js';
import { FILE_FORMAT } from '../src/lib/schema.js';

/* ------------------------------ the shapes ---------------------------- */

test('an item with no cadence is daily, and nonsense is daily too', () => {
  assert.deepEqual(cadenceOf({}), { kind: 'daily' });
  assert.deepEqual(cadenceOf({ cadence: { kind: 'weekly-ish' } }), { kind: 'daily' });
  assert.deepEqual(cadenceOf({ cadence: { kind: 'timesPerWeek', n: 0 } }), { kind: 'daily' });
  assert.deepEqual(cadenceOf({ cadence: { kind: 'timesPerWeek', n: 2.5 } }), { kind: 'daily' });
  assert.deepEqual(cadenceOf({ cadence: { kind: 'timesPerWeek', n: 99 } }), { kind: 'timesPerWeek', n: 7 });
  assert.deepEqual(cadenceOf({ cadence: { kind: 'asNeeded' } }), { kind: 'asNeeded' });
});

test('cadence reads in English', () => {
  assert.equal(cadenceLabel({ kind: 'daily' }), 'Every day');
  assert.equal(cadenceLabel({ kind: 'timesPerWeek', n: 3 }), '3× a week');
  assert.equal(cadenceLabel({ kind: 'everyNDays', n: 2 }), 'Every other day');
  assert.equal(cadenceLabel({ kind: 'everyNDays', n: 5 }), 'Every 5 days');
  assert.equal(cadenceLabel({ kind: 'asNeeded' }), 'When needed');
});

test('weeks run Monday to Sunday', () => {
  assert.equal(weekStart('2026-08-22'), '2026-08-17', 'Saturday belongs to its Monday');
  assert.equal(weekStart('2026-08-23'), '2026-08-17', 'and so does Sunday');
  assert.equal(weekStart('2026-08-24'), '2026-08-24', 'Monday starts its own week');
  assert.equal(daysBetween('2026-08-17', '2026-08-22'), 5);
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

/* ------------------------------- due today ---------------------------- */

const item = (id, cadence) => ({ id, name: id, ...(cadence ? { cadence } : {}) });
const daysWith = (...dates) => Object.fromEntries(
  dates.map((d) => [d, { date: d, checks: { x: { at: 'x' } }, food: [] }]),
);

test('a 3x-a-week item asks until it has had its three, then stops for the week', () => {
  const it = item('x', { kind: 'timesPerWeek', n: 3 });
  const sat = '2026-08-22'; // week of Mon 17th

  assert.equal(dueToday(it, sat, {}).due, true, 'nothing logged: due');
  assert.equal(dueToday(it, sat, daysWith('2026-08-17', '2026-08-19')).due, true, 'two down, one to go');

  const met = dueToday(it, sat, daysWith('2026-08-17', '2026-08-19', '2026-08-21'));
  assert.equal(met.due, false, 'three done — it stops asking');
  assert.equal(met.doneThisWeek, 3);
  assert.equal(met.target, 3);

  // …but today's own check keeps it on screen, so tapping it does not make it
  // disappear out from under the person.
  const doneToday = dueToday(it, sat, daysWith('2026-08-17', '2026-08-19', sat));
  assert.equal(doneToday.due, true);

  // and last week's work does not count for this one
  assert.equal(dueToday(it, sat, daysWith('2026-08-10', '2026-08-11', '2026-08-12')).due, true);
});

test('every-other-day counts from the last time it was actually done', () => {
  const it = item('x', { kind: 'everyNDays', n: 2 });
  assert.equal(dueToday(it, '2026-08-22', {}).due, true, 'never done: due');
  assert.equal(dueToday(it, '2026-08-22', daysWith('2026-08-21')).due, false, 'done yesterday: not yet');
  assert.equal(dueToday(it, '2026-08-22', daysWith('2026-08-20')).due, true, 'two days on: due');
  assert.equal(dueToday(it, '2026-08-22', daysWith('2026-08-01')).due, true, 'long overdue is still just due');
  assert.equal(dueToday(it, '2026-08-22', daysWith('2026-08-22')).due, true, 'done today stays on screen');
});

test('as-needed is never due and never late', () => {
  const it = item('x', { kind: 'asNeeded' });
  assert.equal(dueToday(it, '2026-08-22', {}).due, false);
  assert.equal(dueToday(it, '2026-08-22', {}).reason, 'as-needed');
});

/* ------------------------------ unavailable --------------------------- */

test('paused, or out of stock — and "not tracking" is neither', () => {
  assert.equal(unavailableReason('x', {}), null);
  assert.equal(unavailableReason('x', { pause: makePause('x', { name: 'Magnesium' }) }).kind, 'paused');

  // Three-state again: no count is not a zero count.
  assert.equal(unavailableReason('x', { supply: makeSupply('x', { name: 'Mag' }) }), null);
  assert.equal(unavailableReason('x', { supply: makeSupply('x', { name: 'Mag', count: 4 }) }), null);
  assert.equal(unavailableReason('x', { supply: makeSupply('x', { name: 'Mag', count: 0 }) }).kind, 'out-of-stock');
});

/* -------------------------- on the actual screen ---------------------- */

function protocolWith(...items) {
  return {
    id: 'p', name: 'P', active: true, phases: [],
    blocks: [{ id: 'b', name: 'Morning', start: '06:00', end: '10:00', order: 0, items }],
    createdAt: 'x', updatedAt: 'x',
  };
}
const at8 = new Date(2026, 7, 22, 8, 0);
const ids = (parts) => parts.flatMap((p) => p.items.map((i) => i.id));

test('the day only shows what is actually due, available, and not yet done', () => {
  const p = protocolWith(
    item('daily'),
    { ...item('thrice', { kind: 'timesPerWeek', n: 3 }), name: 'Body work' },
    item('paused'),
    item('empty'),
    item('spare', { kind: 'asNeeded' }),
  );
  const history = {
    '2026-08-17': { date: '2026-08-17', checks: { thrice: { at: 'x' } }, food: [] },
    '2026-08-19': { date: '2026-08-19', checks: { thrice: { at: 'x' } }, food: [] },
    '2026-08-21': { date: '2026-08-21', checks: { thrice: { at: 'x' } }, food: [] },
  };
  const t = buildToday({
    protocols: [p],
    now: at8,
    day: { date: '2026-08-22', checks: {}, food: [] },
    history,
    pauses: { paused: makePause('paused', { name: 'Paused thing' }) },
    supplies: { empty: makeSupply('empty', { name: 'Ran out', count: 0 }) },
  });

  assert.deepEqual(ids(t.groups.now), ['daily'], 'the week target is met, so it is not asked for');
  assert.deepEqual(ids(t.groups.unavailable).sort(), ['empty', 'paused']);
  assert.deepEqual(ids(t.groups.asNeeded), ['spare']);
  assert.equal(t.groups.done.length, 0);

  // The block card still exists for the unavailable pair, with the reason.
  const why = t.groups.unavailable[0].why;
  assert.equal(why.get('paused').kind, 'paused');
  assert.equal(why.get('empty').kind, 'out-of-stock');
});

test('a done item goes to Done even if it is paused or not due — the record wins', () => {
  const p = protocolWith(item('paused'), item('spare', { kind: 'asNeeded' }));
  const t = buildToday({
    protocols: [p],
    now: at8,
    day: { date: '2026-08-22', checks: { paused: { at: 'x' }, spare: { at: 'x' } }, food: [] },
    pauses: { paused: makePause('paused', {}) },
  });
  assert.deepEqual(ids(t.groups.done).sort(), ['paused', 'spare']);
  assert.equal(t.groups.unavailable.length, 0);
  assert.equal(t.groups.asNeeded.length, 0);
});

/* ------------------------ editing and round-trip ---------------------- */

test('the editor writes cadence, and daily is stored as nothing at all', () => {
  let p = protocolWith(item('x'));
  p = updateItem(p, 'b', 'x', { cadence: { kind: 'timesPerWeek', n: 3 } });
  assert.deepEqual(p.blocks[0].items[0].cadence, { kind: 'timesPerWeek', n: 3 });

  p = updateItem(p, 'b', 'x', { cadence: { kind: 'daily' } });
  assert.equal('cadence' in p.blocks[0].items[0], false, 'daily is the absence of a cadence');

  assert.equal(normalizeCadence({ kind: 'everyNDays', n: 0 }), null, 'a broken n is not a schedule');
  assert.deepEqual(normalizeCadence({ kind: 'everyNDays', n: '3' }), { kind: 'everyNDays', n: 3 });
});

test('cadence survives export and import; a broken one warns instead of vanishing silently', () => {
  const file = {
    format: FILE_FORMAT, kind: 'protocol', schemaVersion: 1,
    protocol: protocolWith(
      item('good', { kind: 'timesPerWeek', n: 3 }),
      item('bad', { kind: 'sometimes' }),
    ),
  };
  const v = validateFile(file);
  assert.equal(v.ok, true);
  const [good, bad] = v.value.protocol.blocks[0].items;
  assert.deepEqual(good.cadence, { kind: 'timesPerWeek', n: 3 }, 'a real cadence rides through the validator');
  assert.equal('cadence' in bad, false);
  assert.ok(
    v.warnings.some((w) => w.path.endsWith('cadence.kind')),
    'and the one it dropped was said out loud (decision 24)',
  );
});

/* ------------------------------ the day arc --------------------------- */

test('the day arc ships as anchors, and every anchor has a sixty-second floor', async () => {
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(new URL('../src/content/starter.json', import.meta.url), 'utf8');
  const v = validateFile(text);
  assert.equal(v.ok, true);

  const arc = v.value.data.protocols.find((p) => p.id === 'seed-day-arc');
  assert.ok(arc, 'the day arc must ship — it is the thing the app is about');
  assert.equal(arc.active, true);

  const names = arc.blocks.map((b) => b.name);
  assert.equal(names.length, 4, 'wake, rise, evening release, in-bed wind-down');
  assert.match(names[0], /feet touch the floor/i, 'the first anchor happens before you get up');

  for (const b of arc.blocks) {
    const first = b.items[0];
    assert.equal(first.tracking, 'duration', `${b.name}: the floor is a timed thing`);
    assert.equal(first.amount.seconds, 60, `${b.name}: the floor is sixty seconds (law 6)`);
    assert.ok(/floor version/i.test(first.why ?? ''), `${b.name}: the floor says it is the floor`);
  }

  // Anchors are stable and daily by design (law 4) — no cadence thinning here.
  const arcItems = arc.blocks.flatMap((b) => b.items);
  assert.equal(arcItems.some((i) => i.cadence), false, 'anchors are the same every day on purpose');
  assert.ok(arcItems.every((i) => i.fields?.release), 'every anchor item says how to do it');
});
