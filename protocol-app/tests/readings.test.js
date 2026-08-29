// The change since last time (docs/TAXONOMY.md §5.2, GAPS §3 / D36).
//
// A number recorded and never shown back is a number nobody has any reason to
// record again. These pin the three ways this could overstate: calling one
// reading a trend, calling an unlabelled change an improvement, and letting a
// picture imply a timeline it does not have.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seriesFor, summarise, sparkPath, summaryText } from '../src/lib/readings.js';

const day = (date, side, reading) => [date, { log: { t: { readings: { [side]: reading } } } }];
const history = (...rows) => Object.fromEntries(rows);

const CM = { kind: 'number', unit: 'cm', better: 'higher' };
const FOLD = { kind: 'number', unit: 'cm', better: 'lower' };

/* -------------------------------- series -------------------------------- */

test('readings come back oldest first, per side, ignoring days with none', () => {
  const h = history(
    day('2026-08-15', 'left', { value: 11 }),
    day('2026-07-04', 'left', { value: 8 }),
    day('2026-08-01', 'left', {}),
    day('2026-07-18', 'right', { value: 20 }),
  );
  assert.deepEqual(seriesFor(h, 't', 'left').map((r) => [r.date, r.value]),
    [['2026-07-04', 8], ['2026-08-15', 11]]);
  assert.deepEqual(seriesFor(h, 't', 'right').map((r) => r.value), [20], 'sides do not mix');
});

test('a zero reading is a reading', () => {
  const h = history(day('2026-08-01', 'both', { value: 0 }));
  assert.equal(seriesFor(h, 't', 'both').length, 1, 'a big toe that does not lift is a result');
});

test("today's reading joins its own trend without waiting for a reload", () => {
  const h = history(day('2026-07-04', 'left', { value: 8 }));
  const today = { date: '2026-08-15', log: { t: { readings: { left: { value: 11 } } } } };
  assert.equal(seriesFor(h, 't', 'left', today).length, 2);
});

/* ------------------------------- summarise ------------------------------- */

test('one reading is a starting point, not a trend', () => {
  const s = seriesFor(history(day('2026-08-01', 'both', { value: 5 })), 't', 'both');
  const sum = summarise(s, CM);
  assert.equal(sum.points, 1);
  assert.equal(sum.change, undefined);
  assert.equal(sum.direction, undefined);
  assert.match(summaryText(sum, CM), /Nothing to compare it to yet/);
});

test('which way is better is per item, not per number', () => {
  const s = seriesFor(history(
    day('2026-07-04', 'both', { value: 8 }),
    day('2026-08-15', 'both', { value: 11 }),
  ), 't', 'both');
  assert.equal(summarise(s, CM).direction, 'better', 'knee-to-wall going up is progress');
  assert.equal(summarise(s, FOLD).direction, 'worse', 'fingertips-to-floor going up is not');
});

test('an unlabelled change is reported and not judged', () => {
  const s = seriesFor(history(
    day('2026-07-04', 'both', { value: 8 }),
    day('2026-08-15', 'both', { value: 11 }),
  ), 't', 'both');
  const sum = summarise(s, { kind: 'number', unit: 'cm' });
  assert.equal(sum.change, 3);
  assert.equal(sum.direction, undefined, 'no `better` means no verdict');
});

test('no change says so, rather than reading as progress', () => {
  const s = seriesFor(history(
    day('2026-08-01', 'both', { value: 9 }),
    day('2026-08-15', 'both', { value: 9 }),
  ), 't', 'both');
  const sum = summarise(s, CM);
  assert.equal(sum.direction, 'same');
  assert.match(summaryText(sum, CM), /the same as 14 days ago/);
});

test('the dates are carried, so three readings across six months cannot look steady', () => {
  const s = seriesFor(history(
    day('2026-02-01', 'both', { value: 8 }),
    day('2026-08-01', 'both', { value: 11 }),
  ), 't', 'both');
  assert.equal(summarise(s, CM).days, 181);
  assert.match(summaryText(summarise(s, CM), CM), /over 181 days/);
});

test('a choice does not subtract — what changed is which reading you got', () => {
  const M = { kind: 'choice' };
  const s = seriesFor(history(
    day('2026-07-01', 'left', { outcomeId: 'deep-flexor', tell: 'The thigh sits above the trunk.' }),
    day('2026-08-01', 'left', { outcomeId: 'level', tell: 'The thigh rests level.' }),
  ), 't', 'left');
  const sum = summarise(s, M);
  assert.equal(sum.change, undefined);
  assert.equal(sum.moved, true);
  assert.match(summaryText(sum, M), /The thigh sits above the trunk\. — 31 days later: The thigh rests level\./);
});

/* ------------------------------- the picture ----------------------------- */

test('a line needs somewhere to go — below two readings there is no line', () => {
  assert.equal(sparkPath([{ value: 5 }]), null);
  assert.equal(sparkPath([]), null);
  assert.ok(sparkPath([{ value: 5 }, { value: 7 }]));
});

test('a flat run sits in the middle, where it does not read as zero', () => {
  const path = sparkPath([{ value: 9 }, { value: 9 }, { value: 9 }], { width: 100, height: 28 });
  const ys = [...path.matchAll(/[ML][\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(ys, [14, 14, 14]);
});

test('the picture is plotted by position, and the words carry the dates', () => {
  // Spacing three readings six months apart evenly along an axis would be a lie
  // told by a picture, so the picture does not claim to be a timeline.
  const near = sparkPath([{ value: 1 }, { value: 2 }, { value: 3 }]);
  const far = sparkPath([{ value: 1 }, { value: 2 }, { value: 3 }]);
  assert.equal(near, far, 'the dates cannot change the shape, because they are not in it');
});
