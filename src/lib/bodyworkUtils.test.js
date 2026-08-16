// Body work tracking — assertions ported from the prototype's test suites.
//
// These are not written fresh. Several encode bugs that were already found
// and fixed during the prototype's testing, so they are here to stop those
// bugs coming back. Run with: npm test
//
// Covers: session logging and undo, measurement deltas in both directions,
// sparkline orientation, staleness thresholds, the 48-hour prompt window,
// summary export, image path existence, and render integrity of the data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  SECTIONS, METRICS, TRACK, EVERY, FLARE, PHOTOS, NO_PHOTO,
  ALL_CARDS, M_BY_KEY,
} from '../data/bodywork.js';

import {
  blankLog, logSession, undoLast, lastSession, countIn, isStale,
  addMeasure, series, deltaText, sparkPoints, flareText,
  saveCheckin, mergeLog, summaryText, buildFeed, logStats,
  today, ago, mKey,
} from './bodyworkUtils.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(HERE, '..', '..', 'public', 'bodywork-images');

const dayOffset = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ---------------------------------------------------------------- content

test('render integrity: every card has an id, name and a caution', () => {
  assert.equal(ALL_CARDS.length, 33);
  for (const c of ALL_CARDS) {
    assert.ok(c.id, 'card missing id');
    assert.ok(c.name, `card ${c.id} missing name`);
    assert.ok(c.careful, `card ${c.id} missing "careful" text`);
    // Every card is either a release/load pair or a step list, never neither.
    assert.ok(c.release || c.steps, `card ${c.id} has no instructions`);
    if (c.release) assert.ok(c.load, `card ${c.id} releases without loading`);
  }
});

test('card ids are unique', () => {
  const ids = ALL_CARDS.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every card has a tracking interval and a metric mapping', () => {
  for (const c of ALL_CARDS) {
    assert.ok(EVERY[c.id], `card ${c.id} missing from EVERY`);
    assert.ok(TRACK[c.id], `card ${c.id} missing from TRACK`);
  }
});

test('TRACK and EVERY contain no ids that are not cards', () => {
  const ids = new Set(ALL_CARDS.map(c => c.id));
  for (const k of Object.keys(TRACK)) assert.ok(ids.has(k), `TRACK has stray id ${k}`);
  for (const k of Object.keys(EVERY)) assert.ok(ids.has(k), `EVERY has stray id ${k}`);
  for (const k of FLARE) assert.ok(ids.has(k), `FLARE has stray id ${k}`);
});

test('every metric key referenced by TRACK exists in METRICS', () => {
  for (const [card, keys] of Object.entries(TRACK)) {
    for (const k of keys) {
      assert.ok(M_BY_KEY[k], `card ${card} references unknown metric ${k}`);
    }
  }
});

test('metric registry is well formed: six core, all with how-to and direction', () => {
  assert.equal(METRICS.length, 14);
  assert.equal(METRICS.filter(m => m.tier === 'core').length, 6);
  for (const m of METRICS) {
    assert.ok(['up', 'down'].includes(m.better), `metric ${m.key} bad "better"`);
    assert.ok(m.how, `metric ${m.key} missing how-to`);
    assert.ok(m.cadence, `metric ${m.key} missing cadence`);
    assert.ok(m.unit, `metric ${m.key} missing unit`);
  }
});

test('every card either has photos or an honest no-photo note, never both, never neither', () => {
  for (const c of ALL_CARDS) {
    const hasPhoto = !!PHOTOS[c.id];
    const hasNote = !!NO_PHOTO[c.id];
    assert.ok(hasPhoto !== hasNote, `card ${c.id} photo mapping is ambiguous`);
  }
  // After the second pass: 20 mapped, 13 deliberately blank (was 15 / 18).
  assert.equal(Object.keys(PHOTOS).length, 20);
  assert.equal(Object.keys(NO_PHOTO).length, 13);
});

test('every blank says which kind of blank it is, and why', () => {
  for (const [card, gap] of Object.entries(NO_PHOTO)) {
    assert.ok(gap.what, `${card} does not say what is missing`);
    assert.ok(['absent', 'misleading'].includes(gap.why), `${card} has an unknown reason`);
    // A "misleading" blank is a claim that something close exists and was
    // rejected on purpose. It has to say what, or it is indistinguishable
    // from nobody having looked.
    if (gap.why === 'misleading') {
      assert.ok(gap.near, `${card} claims a misleading near-miss but does not name it`);
    }
  }
});

test('the breathing, tongue and vagal work is where the genuine blanks are', () => {
  const absent = Object.entries(NO_PHOTO)
    .filter(([, g]) => g.why === 'absent')
    .map(([k]) => k)
    .sort();
  assert.deepEqual(absent, [
    'aw-palate', 'aw-posture', 'aw-press',
    'br-co2', 'br-exhale', 'br-nasal',
    'vg-face', 'vg-hum', 'vg-mat',
  ]);
});

test('image path existence: every mapped photo set has both frames on disk', () => {
  for (const [card, sets] of Object.entries(PHOTOS)) {
    for (const s of sets) {
      for (const frame of [0, 1]) {
        const p = join(IMAGES, `${s.set}_${frame}.jpg`);
        assert.ok(existsSync(p), `card ${card}: missing ${s.set}_${frame}.jpg`);
      }
    }
  }
});

test('every photo carries a caption', () => {
  for (const sets of Object.values(PHOTOS)) {
    for (const s of sets) assert.ok(s.cap && s.cap.length > 10);
  }
});

// ---------------------------------------------------------------- sessions

test('logging a session stamps today, and undo removes it', () => {
  let log = blankLog();
  assert.equal(lastSession(log, 'calf'), null);

  log = logSession(log, 'calf');
  assert.equal(lastSession(log, 'calf'), today());
  assert.equal(log.sessions.length, 1);

  log = undoLast(log, 'calf');
  assert.equal(lastSession(log, 'calf'), null);
  assert.equal(log.sessions.length, 0);
});

test('undo removes only the most recent entry for that card', () => {
  let log = blankLog();
  log.sessions = [
    { id: 'calf', d: dayOffset(-5), t: '08:00' },
    { id: 'hip', d: dayOffset(-1), t: '09:00' },
    { id: 'calf', d: dayOffset(-1), t: '10:00' },
  ];
  log = undoLast(log, 'calf');
  assert.equal(log.sessions.length, 2);
  assert.equal(lastSession(log, 'calf'), dayOffset(-5));
  assert.equal(lastSession(log, 'hip'), dayOffset(-1), 'undo touched the wrong card');
});

// This is the regression the prototype notes flag explicitly: an imported or
// hand-edited file arrives in any order, so lastSession must take a max and
// never trust array position.
test('lastSession takes the newest date, not the last array element', () => {
  const log = blankLog();
  log.sessions = [
    { id: 'calf', d: dayOffset(-1), t: '08:00' },
    { id: 'calf', d: dayOffset(-30), t: '08:00' },  // out of order on purpose
    { id: 'calf', d: dayOffset(-9), t: '08:00' },
  ];
  assert.equal(lastSession(log, 'calf'), dayOffset(-1));
});

test('countIn counts only sessions inside the window', () => {
  const log = blankLog();
  log.sessions = [
    { id: 'calf', d: dayOffset(-1) },
    { id: 'calf', d: dayOffset(-10) },
    { id: 'calf', d: dayOffset(-40) },   // outside 30 days
    { id: 'hip', d: dayOffset(-2) },     // different card
  ];
  assert.equal(countIn(log, 'calf', 30), 2);
  assert.equal(countIn(log, 'hip', 30), 1);
});

// ------------------------------------------------------------- staleness

test('staleness triggers after roughly three times the card interval', () => {
  const log = blankLog();
  // calf runs EVERY 2 days, so the threshold is > 6 days.
  log.sessions = [{ id: 'calf', d: dayOffset(-5) }];
  assert.equal(isStale(log, 'calf'), false, '5 days should not be stale');

  log.sessions = [{ id: 'calf', d: dayOffset(-6) }];
  assert.equal(isStale(log, 'calf'), false, 'exactly 3x should not be stale');

  log.sessions = [{ id: 'calf', d: dayOffset(-7) }];
  assert.equal(isStale(log, 'calf'), true, 'past 3x should be stale');
});

test('a card that has never been logged is not stale — no guilt mechanics', () => {
  assert.equal(isStale(blankLog(), 'calf'), false);
});

// ------------------------------------------------------- 48-hour prompt

test('the 48-hour prompt is active on days 1 and 2 after logging, and only then', () => {
  const mk = (n) => {
    const log = blankLog();
    log.sessions = [{ id: 'rg-ecc', d: dayOffset(n) }];
    return flareText(log, 'rg-ecc');
  };
  assert.equal(mk(0).active, false, 'same day is too early to ask');
  assert.equal(mk(-1).active, true);
  assert.equal(mk(-2).active, true);
  assert.equal(mk(-3).active, false, 'past the window');
  assert.match(mk(-1).txt, /delayed soreness/i);
});

test('flare cards are the ones the document warns have delayed effects', () => {
  assert.deepEqual(
    [...FLARE].sort(),
    ['bl-prog', 'lat', 'rg-calf', 'rg-cr', 'rg-ecc', 'rg-ham', 'rg-squat']
  );
});

// ----------------------------------------------------------- measurements

test('same-day writes overwrite rather than append', () => {
  let log = blankLog();
  log = addMeasure(log, 'co2', null, 12);
  log = addMeasure(log, 'co2', null, 14);   // corrected a typo
  const arr = series(log, 'co2', null);
  assert.equal(arr.length, 1, 'a correction created a fake data point');
  assert.equal(arr[0].v, 14);
});

test('two-sided metrics are stored as separate flat keys', () => {
  let log = blankLog();
  log = addMeasure(log, 'kneewall', 'L', 6);
  log = addMeasure(log, 'kneewall', 'R', 8);
  assert.deepEqual(Object.keys(log.measures).sort(), ['kneewall.L', 'kneewall.R']);
  assert.equal(series(log, 'kneewall', 'L')[0].v, 6);
  assert.equal(series(log, 'kneewall', 'R')[0].v, 8);
  assert.equal(mKey('kneewall', 'L'), 'kneewall.L');
  assert.equal(mKey('co2', null), 'co2');
});

test('series sorts by date, so baseline and latest are correct in any order', () => {
  const log = blankLog();
  log.measures.co2 = [
    { d: '2026-07-10', v: 18 },
    { d: '2026-05-20', v: 12 },   // baseline, stored last
    { d: '2026-06-15', v: 15 },
  ];
  const arr = series(log, 'co2', null);
  assert.deepEqual(arr.map(p => p.v), [12, 15, 18]);
});

test('delta colouring follows the metric direction, not the sign', () => {
  const up = M_BY_KEY.co2;        // better: up
  const down = M_BY_KEY.fold;     // better: down

  // A rising CO2 tolerance is progress.
  assert.equal(deltaText(up, [{ d: 'a', v: 12 }, { d: 'b', v: 18 }]).cls, 'up');
  assert.equal(deltaText(up, [{ d: 'a', v: 18 }, { d: 'b', v: 12 }]).cls, 'down');

  // A falling forward-fold number is also progress.
  assert.equal(deltaText(down, [{ d: 'a', v: 30 }, { d: 'b', v: 20 }]).cls, 'up');
  assert.equal(deltaText(down, [{ d: 'a', v: 20 }, { d: 'b', v: 30 }]).cls, 'down');
});

test('delta text handles no data, one reading and no change', () => {
  const m = M_BY_KEY.co2;
  assert.match(deltaText(m, []).txt, /no baseline/);
  assert.match(deltaText(m, [{ d: '2026-05-20', v: 12 }]).txt, /baseline 12/);
  const level = deltaText(m, [{ d: '2026-05-20', v: 12 }, { d: '2026-06-20', v: 12 }]);
  assert.match(level.txt, /level since/);
  assert.equal(level.cls, '', 'no change should not be coloured');
});

// --------------------------------------------------------------- sparkline

test('sparkline needs at least three points', () => {
  assert.equal(sparkPoints([{ d: 'a', v: 1 }, { d: 'b', v: 2 }], 'up'), null);
  assert.ok(sparkPoints([{ d: 'a', v: 1 }, { d: 'b', v: 2 }, { d: 'c', v: 3 }], 'up'));
});

// SVG y grows downward, so an improving series must end HIGHER on screen
// (smaller y) than it started, whichever direction the metric improves in.
test('sparkline orientation: improvement always slopes upward on screen', () => {
  const rising = [{ d: 'a', v: 10 }, { d: 'b', v: 20 }, { d: 'c', v: 30 }];
  const falling = [{ d: 'a', v: 30 }, { d: 'b', v: 20 }, { d: 'c', v: 10 }];

  const goodUp = sparkPoints(rising, 'up');
  assert.ok(goodUp[2][1] < goodUp[0][1], 'rising better:up should slope up');

  const goodDown = sparkPoints(falling, 'down');
  assert.ok(goodDown[2][1] < goodDown[0][1], 'falling better:down should slope up');

  const badUp = sparkPoints(falling, 'up');
  assert.ok(badUp[2][1] > badUp[0][1], 'falling better:up should slope down');
});

test('sparkline stays inside its box even when values are identical', () => {
  const flat = [{ d: 'a', v: 5 }, { d: 'b', v: 5 }, { d: 'c', v: 5 }];
  for (const [x, y] of sparkPoints(flat, 'up')) {
    assert.ok(x >= 0 && x <= 100, `x out of box: ${x}`);
    assert.ok(y >= 2 && y <= 22, `y out of box: ${y}`);
  }
});

// ---------------------------------------------------------------- check-ins

test('a second check-in on the same day replaces the first', () => {
  let log = blankLog();
  log = saveCheckin(log, 6, 'sore calves day 2');
  log = saveCheckin(log, 7, 'better by evening');
  assert.equal(log.checkins.length, 1);
  assert.equal(log.checkins[0].energy, 7);
});

// ------------------------------------------------------------------ import

test('import merges and never deletes existing history', () => {
  let current = blankLog();
  current = logSession(current, 'calf');
  current = addMeasure(current, 'co2', null, 12);

  const incoming = {
    version: 1,
    started: '2026-01-01',
    sessions: [{ id: 'hip', d: '2026-01-05', t: '08:00' }],
    measures: { co2: [{ d: '2026-01-05', v: 9 }] },
    checkins: [{ d: '2026-01-05', energy: 4, note: 'flat' }],
  };

  const merged = mergeLog(current, incoming);
  assert.equal(merged.sessions.length, 2, 'existing session was lost');
  assert.equal(lastSession(merged, 'calf'), today(), 'existing card history was lost');
  assert.equal(merged.measures.co2.length, 2);
  assert.deepEqual(merged.measures.co2.map(p => p.v), [9, 12], 'merge did not date-sort');
  assert.equal(merged.checkins.length, 1);
});

test('import skips same-day duplicates rather than doubling them', () => {
  let current = blankLog();
  current = addMeasure(current, 'co2', null, 12);
  const d = today();

  const merged = mergeLog(current, {
    version: 1,
    sessions: [],
    measures: { co2: [{ d, v: 99 }] },
    checkins: [],
  });
  assert.equal(merged.measures.co2.length, 1, 'same-day duplicate was appended');
  assert.equal(merged.measures.co2[0].v, 12, 'import overwrote a local value');
});

test('import rejects a file that is not a log', () => {
  assert.throws(() => mergeLog(blankLog(), { hello: 'world' }), /not a body work log/);
});

// ----------------------------------------------------------------- summary

test('summary export contains measurements, adherence and check-ins', () => {
  let log = blankLog();
  log = logSession(log, 'calf');
  log = addMeasure(log, 'kneewall', 'R', 6);
  log = saveCheckin(log, 6, 'sore calves day 2');

  const txt = summaryText(log);
  assert.match(txt, /MEASUREMENTS/);
  assert.match(txt, /Knee to wall \(R\): 6 cm/);
  assert.match(txt, /ADHERENCE \(last 30 days\)/);
  assert.match(txt, /Calves: 1 sessions/);
  assert.match(txt, /DAILY CHECK-INS/);
  assert.match(txt, /energy 6\/10\s+sore calves day 2/);
});

test('summary shows a first-to-latest arrow once there is more than one reading', () => {
  const log = blankLog();
  log.measures['kneewall.R'] = [
    { d: '2026-05-20', v: 6 },
    { d: '2026-07-10', v: 8 },
  ];
  assert.match(summaryText(log), /6 cm on 2026-05-20 → 8 on 2026-07-10\s+\[2 readings\]/);
});

test('summary omits metrics that have never been taken', () => {
  const txt = summaryText(blankLog());
  assert.doesNotMatch(txt, /Knee to wall/);
});

// -------------------------------------------------------------------- feed

test('feed is newest first and merges sessions with check-ins', () => {
  let log = blankLog();
  log.sessions = [
    { id: 'calf', d: dayOffset(-3), t: '08:00' },
    { id: 'hip', d: dayOffset(-1), t: '09:00' },
  ];
  log.checkins = [{ d: dayOffset(-2), energy: 6, note: 'ok' }];

  const feed = buildFeed(log);
  assert.equal(feed.length, 3);
  assert.deepEqual(feed.map(r => r.when), [dayOffset(-1), dayOffset(-2), dayOffset(-3)]);
  assert.equal(feed[0].label, 'Front of hip', 'feed should show card names, not ids');
});

test('log stats count distinct days, not entries', () => {
  const log = blankLog();
  log.sessions = [
    { id: 'calf', d: dayOffset(-1) },
    { id: 'hip', d: dayOffset(-1) },
    { id: 'feet', d: dayOffset(-2) },
  ];
  const s = logStats(log);
  assert.equal(s.total, 3);
  assert.equal(s.days, 2);
});

// -------------------------------------------------------------------- misc

test('ago reads in plain language', () => {
  assert.equal(ago(today()), 'today');
  assert.equal(ago(dayOffset(-1)), 'yesterday');
  assert.equal(ago(dayOffset(-4)), '4 days ago');
  assert.match(ago(dayOffset(-21)), /weeks ago/);
  assert.match(ago(dayOffset(-90)), /months ago/);
});

test('mutations do not modify the log in place', () => {
  const log = blankLog();
  const before = JSON.stringify(log);
  logSession(log, 'calf');
  addMeasure(log, 'co2', null, 12);
  saveCheckin(log, 5, 'x');
  assert.equal(JSON.stringify(log), before, 'a mutation leaked into the original');
});
