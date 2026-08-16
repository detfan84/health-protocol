// Reminder content. The rule these enforce is that the 48-hour look-back
// outranks everything else, because it is the safety one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankLog, logSession } from './bodyworkUtils.js';
import { dueToday, pendingLookBacks, morningBody, eveningBody, DEFAULT_PREFS } from './bodyworkReminders.js';
import { ALL_CARDS } from '../data/bodywork.js';

const dayOffset = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

test('an empty log means everything is due, not that nothing is', () => {
  assert.equal(dueToday(blankLog()).length, ALL_CARDS.length);
});

test('a card logged today is not due again today', () => {
  const log = logSession(blankLog(), 'rg-squat');   // EVERY: 1 day
  assert.ok(!dueToday(log).some(c => c.id === 'rg-squat'));
});

test('a card comes due again once its own interval has elapsed', () => {
  const log = blankLog();
  log.sessions = [{ id: 'calf', d: dayOffset(-1) }];   // EVERY: 2 days
  assert.ok(!dueToday(log).some(c => c.id === 'calf'), 'due a day early');

  log.sessions = [{ id: 'calf', d: dayOffset(-2) }];
  assert.ok(dueToday(log).some(c => c.id === 'calf'), 'not due on its interval');
});

test('look-backs are pending only inside the 48-hour window', () => {
  const at = n => {
    const log = blankLog();
    log.sessions = [{ id: 'rg-ecc', d: dayOffset(n) }];
    return pendingLookBacks(log);
  };
  assert.deepEqual(at(0), []);
  assert.deepEqual(at(-1), ['rg-ecc']);
  assert.deepEqual(at(-2), ['rg-ecc']);
  assert.deepEqual(at(-3), []);
});

test('only flare cards produce a look-back', () => {
  const log = blankLog();
  log.sessions = [{ id: 'feet', d: dayOffset(-1) }];   // not in FLARE
  assert.deepEqual(pendingLookBacks(log), []);
});

test('the evening reminder leads with the look-back, ahead of the check-in nudge', () => {
  const log = blankLog();
  log.sessions = [{ id: 'rg-ecc', d: dayOffset(-1) }];
  const txt = eveningBody(log);
  assert.match(txt, /delayed soreness/i);
  assert.match(txt, /Eccentric heel drops/);
});

test('with no look-back pending, the evening reminder asks for a check-in', () => {
  assert.match(eveningBody(blankLog()), /how the body felt/i);
});

test('the evening reminder stops asking once a check-in exists for today', () => {
  const log = blankLog();
  log.checkins = [{ d: new Date().toISOString().slice(0, 10), energy: 6, note: '' }];
  assert.doesNotMatch(eveningBody(log), /how the body felt/i);
});

test('the morning reminder names cards, and counts rather than listing all 33', () => {
  const txt = morningBody(blankLog());
  assert.match(txt, /33 due today/);
  assert.ok(txt.length < 160, 'reminder body is too long for a notification');
  assert.match(txt, /and \d+ more/);
});

test('reminders never scold: no misses, failures or streaks in the copy', () => {
  const log = blankLog();
  log.sessions = [{ id: 'rg-ecc', d: dayOffset(-1) }];
  for (const txt of [morningBody(blankLog()), morningBody(log), eveningBody(log), eveningBody(blankLog())]) {
    assert.doesNotMatch(txt, /missed|overdue|failed|behind|streak|don't break/i, `scolding copy: ${txt}`);
  }
});

test('reminders are off by default', () => {
  assert.equal(DEFAULT_PREFS.enabled, false);
});
