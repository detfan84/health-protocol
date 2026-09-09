// The nudge engine (R24): the loop that walks to the next firing and delivers
// it. Everything here runs on an injected clock and injected timers, because
// an engine whose whole job is reading the clock cannot be tested by a suite
// that only sees the time it happens to run at — the same rule viewHome
// already lives under.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createNudger, GRACE_MS, MAX_HOP_MS } from '../src/app/nudge.js';
import { blankReminders, addReminder } from '../src/lib/reminders.js';

/**
 * A nudger on a bench: a settable clock, timers that fire only when the test
 * says so, and every delivery recorded. `record.value` is live — a test can
 * change the schedule after arming, which is exactly the compose-at-fire-time
 * behaviour under test.
 */
function bench({ record, visible = true, canNotify = true } = {}) {
  const b = {
    record,
    visible,
    canNotify,
    banners: [],
    notes: [],
    timers: [],
    clock: new Date(2026, 8, 9, 8, 0, 0), // Wed 9 Sep 2026, 08:00 local
  };
  b.nudger = createNudger({
    load: async () => b.record,
    visible: () => b.visible,
    banner: (f) => b.banners.push(f),
    notify: async (f) => b.notes.push(f),
    canNotify: async () => b.canNotify,
    now: () => b.clock,
    setTimer: (fn, ms) => (b.timers.push({ fn, ms, cleared: false }) - 1),
    clearTimer: (id) => { if (b.timers[id]) b.timers[id].cleared = true; },
  });
  b.last = () => b.timers.at(-1);
  // Advance the clock and let the pending timer go off, as the browser would.
  b.ring = async (h, m, s = 0) => {
    b.clock = new Date(2026, 8, 9, h, m, s);
    await b.last().fn();
  };
  return b;
}

const enabled = (r) => ({ ...r, enabled: true });
const at = (...times) => enabled(times.reduce((r, t) => addReminder(r, t), blankReminders()));

test('walks to the next time and delivers a banner while the app is on screen', async () => {
  const b = bench({ record: at({ at: '08:30', label: 'Morning block' }) });
  await b.nudger.start();

  assert.equal(b.last().ms, 30 * 60 * 1000, 'armed straight at a fire half an hour out');
  await b.ring(8, 30);

  assert.equal(b.banners.length, 1);
  assert.equal(b.banners[0].at, '08:30');
  assert.equal(b.banners[0].label, 'Morning block');
  assert.equal(b.notes.length, 0, 'on screen means the banner, never the tray');

  const next = b.nudger._armed();
  assert.equal(next.date, '2026-09-10', 're-armed to tomorrow without a second delivery today');
  assert.equal(b.last().ms, MAX_HOP_MS, 'a far target is walked in hops, not one long sleep');
});

test('in the background it goes to the tray — permission allowing, and only then', async () => {
  const b = bench({ record: at({ at: '08:30', label: 'Morning block' }), visible: false });
  await b.nudger.start();
  await b.ring(8, 30);
  assert.equal(b.notes.length, 1, 'hidden and permitted: the system path');
  assert.equal(b.banners.length, 0);

  const c = bench({ record: at({ at: '08:30' }), visible: false, canNotify: false });
  await c.nudger.start();
  await c.ring(8, 30);
  assert.equal(c.notes.length, 0, 'no permission: silence, not a workaround');
  assert.equal(c.banners.length, 0);
  assert.ok(c.nudger._armed(), 'and the engine keeps walking');
});

test('composed at fire time: a schedule switched off after arming stays silent', async () => {
  const b = bench({ record: at({ at: '08:30' }) });
  await b.nudger.start();
  b.record = { ...b.record, enabled: false }; // switched off while the timer ran
  await b.ring(8, 30);
  assert.equal(b.banners.length, 0, 'the moment re-reads the schedule and finds it off');

  const c = bench({ record: at({ at: '08:30' }, { at: '09:00' }) });
  await c.nudger.start();
  c.record = at({ at: '09:00' }); // the 08:30 row deleted while the timer ran
  await c.ring(8, 30);
  assert.equal(c.banners.length, 0, 'a deleted row does not speak');
  assert.equal(c.nudger._armed().at, '09:00', 'the surviving row is what is next');
});

test('woken late beyond grace, the moment is skipped rather than delivered stale', async () => {
  const b = bench({ record: at({ at: '08:30', label: 'Morning block' }) });
  await b.nudger.start();
  // A suspended tab wakes 45 minutes after the moment it was walking toward.
  await b.ring(9, 15);
  assert.equal(b.banners.length, 0, 'an hour-old "it is 08:30" is noise, not a reminder');
  assert.equal(b.nudger._armed().date, '2026-09-10', 'and the walk continues at tomorrow');

  const c = bench({ record: at({ at: '08:30', label: 'Morning block' }) });
  await c.nudger.start();
  c.clock = new Date(2026, 8, 9, 8, 34, 0); // four minutes late: inside grace
  await c.last().fn();
  assert.equal(c.banners.length, 1, 'a few throttled minutes late still counts');
});

test('a hop wakes short of the target, checks the clock, and does not fire early', async () => {
  const b = bench({ record: at({ at: '11:00' }) });
  await b.nudger.start();
  assert.equal(b.last().ms, MAX_HOP_MS, 'three hours out, so the first wake is a hop');
  await b.ring(8, 30);
  assert.equal(b.banners.length, 0, 'a hop is a look at the clock, not a delivery');
  assert.equal(b.last().ms, MAX_HOP_MS, 'still two and a half hours: hop again');
  await b.ring(10, 45);
  assert.equal(b.last().ms, 15 * 60 * 1000, 'inside one hop it aims at the minute itself');
  await b.ring(11, 0);
  assert.equal(b.banners.length, 1);
});

test('two reminders on one minute are two deliveries', async () => {
  const b = bench({ record: at({ at: '08:30', label: 'Magnesium' }, { at: '08:30', label: 'Neck release' }) });
  await b.nudger.start();
  await b.ring(8, 30);
  assert.deepEqual(b.banners.map((f) => f.label).sort(), ['Magnesium', 'Neck release']);
});

test('resync retargets after an edit, and stop stands the engine down', async () => {
  const b = bench({ record: at({ at: '11:00' }) });
  await b.nudger.start();
  const first = b.last();

  b.record = at({ at: '08:20' }); // an earlier time added on the You screen
  await b.nudger.resync();
  assert.equal(first.cleared, true, 'the old walk is abandoned, not left ticking');
  assert.equal(b.nudger._armed().at, '08:20');
  assert.equal(b.last().ms, 20 * 60 * 1000);

  b.nudger.stop();
  assert.equal(b.last().cleared, true);
  assert.equal(b.nudger._armed(), null);
  await b.nudger.resync();
  assert.equal(b.timers.filter((t) => !t.cleared).length, 0, 'a stopped engine stays stopped');
});

test('a delivery that throws is contained — the walk goes on', async () => {
  const b = bench({ record: at({ at: '08:30' }, { at: '09:00' }) });
  b.nudger = createNudger({
    load: async () => b.record,
    visible: () => true,
    banner: () => { throw new Error('render exploded'); },
    notify: async () => {},
    canNotify: async () => true,
    now: () => b.clock,
    setTimer: (fn, ms) => (b.timers.push({ fn, ms, cleared: false }) - 1),
    clearTimer: (id) => { if (b.timers[id]) b.timers[id].cleared = true; },
  });
  await b.nudger.start();
  await b.ring(8, 30);
  assert.equal(b.nudger._armed().at, '09:00', 'a broken banner cost one moment, not the engine');
});

test('the grace window is minutes, not an afternoon', () => {
  // Pinned as numbers because the copy on the Reminders card leans on them:
  // "a few minutes late" must stay a few minutes.
  assert.equal(GRACE_MS, 10 * 60 * 1000);
  assert.equal(MAX_HOP_MS, 30 * 60 * 1000);
});
