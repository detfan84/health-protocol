// The reminder schedule, and the calendar file that carries it off-device.
//
// The .ics matters more than it looks: it is the only closed-app reminder the
// app can deliver without a server, so a file a calendar refuses to parse is
// the whole feature failing silently — exactly what decision 24 exists to
// prevent. These pin the parts calendars are strict about.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  blankReminders, normalizeReminders, addReminder, updateReminder, removeReminder,
  remindersFromBlocks, remindersToIcs, expandTimes, inQuietHours, KINDS, REMINDERS_KEY,
} from '../src/lib/reminders.js';

const NOW = new Date(Date.UTC(2026, 7, 22, 12, 0, 0));

test('reminders start off, with nothing scheduled', () => {
  const r = blankReminders();
  assert.equal(r.enabled, false, 'opt-in is the hard rule (decision 12)');
  assert.deepEqual(r.times, []);
  assert.equal(r.key, REMINDERS_KEY, 'it lives in the settings store (decision 19)');
});

test('the schedule keeps only real times, in order', () => {
  let r = addReminder(blankReminders(), { at: '21:30', label: 'Wind down' });
  r = addReminder(r, { at: '07:15', label: 'Morning block' });
  r = addReminder(r, { at: '25:00', label: 'Nonsense' });
  r = addReminder(r, { at: 'soon' });

  assert.deepEqual(r.times.map((t) => t.at), ['07:15', '21:30'], 'sorted, and junk never enters');
  assert.equal(r.times[0].label, 'Morning block');

  const id = r.times[0].id;
  r = updateReminder(r, id, { at: '06:45', label: '  ' });
  assert.equal(r.times[0].at, '06:45');
  assert.equal('label' in r.times[0], false, 'a blank label is no label, not an empty one');

  r = removeReminder(r, id);
  assert.deepEqual(r.times.map((t) => t.at), ['21:30']);
});

test('days: absent means every day, and all seven collapses back to absent', () => {
  let r = addReminder(blankReminders(), { at: '08:00' });
  assert.equal('days' in r.times[0], false);

  r = updateReminder(r, r.times[0].id, { days: [1, 3, 5] });
  assert.deepEqual(r.times[0].days, [1, 3, 5]);

  r = updateReminder(r, r.times[0].id, { days: [0, 1, 2, 3, 4, 5, 6] });
  assert.equal('days' in r.times[0], false, 'every day is the default, not a list');

  r = updateReminder(r, r.times[0].id, { days: [9, -1, 2, 2] });
  assert.deepEqual(r.times[0].days, [2], 'nonsense days are dropped, duplicates collapsed');
});

test('a stored record with junk in it normalizes rather than exploding', () => {
  const r = normalizeReminders({ key: 'x', enabled: 'yes', times: [null, { at: '07:00' }, 'nope'] });
  assert.equal(r.enabled, false, 'only a real true is on');
  assert.equal(r.times.length, 1);
  assert.ok(r.times[0].id, 'a time that arrived without an id gets one');
});

test('block times are offered as a starting point, deduplicated, inactive ignored', () => {
  const suggestions = remindersFromBlocks([
    {
      active: true,
      blocks: [
        { start: '06:00', name: 'Upon waking' },
        { start: '12:00', name: 'With food' },
        { start: '06:00', name: 'Also six' },
        { name: 'Anytime' },
      ],
    },
    { active: false, blocks: [{ start: '23:00', name: 'Hidden' }] },
  ]);
  assert.deepEqual(suggestions, [
    { at: '06:00', label: 'Upon waking' },
    { at: '12:00', label: 'With food' },
  ]);
});

/* ------------------------------ the file ------------------------------ */

function ics(rec) {
  return remindersToIcs(rec, { from: '2026-08-22', now: NOW });
}

test('the calendar file is a calendar file', () => {
  let r = addReminder(blankReminders(), { at: '07:15', label: 'Morning block' });
  r = addReminder(r, { at: '21:30', label: 'Wind down', days: [1, 2, 3, 4, 5] });
  const text = ics(r);

  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n'), 'CRLF from the first line (RFC 5545)');
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  assert.ok(text.includes('VERSION:2.0'));
  assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.equal((text.match(/BEGIN:VALARM/g) ?? []).length, 2, 'an event with no alarm reminds nobody');
  assert.equal((text.match(/END:VALARM/g) ?? []).length, 2);
  assert.ok(!text.split('\r\n').some((l) => l.includes('\n')), 'no stray bare newlines');
});

test('times are floating local, so 07:15 is 07:15 in every timezone', () => {
  const text = ics(addReminder(blankReminders(), { at: '07:15' }));
  assert.ok(text.includes('DTSTART:20260822T071500'), 'no TZID, no trailing Z');
  assert.ok(!/DTSTART:[^\r\n]*Z/.test(text));
  assert.ok(text.includes('DTSTAMP:20260822T120000Z'), 'the stamp itself is UTC, as required');
});

test('repeating: every day unless days were chosen', () => {
  const daily = ics(addReminder(blankReminders(), { at: '08:00' }));
  assert.ok(daily.includes('RRULE:FREQ=DAILY'));

  const weekdays = ics(addReminder(blankReminders(), { at: '08:00', days: [1, 2, 3, 4, 5] }));
  assert.ok(weekdays.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'));
});

test('reminders never make you look busy', () => {
  const text = ics(addReminder(blankReminders(), { at: '08:00' }));
  assert.ok(text.includes('TRANSP:TRANSPARENT'), 'a nudge is not an appointment');
  assert.ok(text.includes('DURATION:PT5M'));
  assert.ok(text.includes('TRIGGER:PT0M'), 'the alarm is at the time itself');
});

test('text that would break the format is escaped, not passed through', () => {
  const r = addReminder(blankReminders(), { at: '08:00', label: 'Binder; charcoal, zeolite \\ rotate' });
  const text = ics(r);
  assert.ok(text.includes('Binder\\; charcoal\\, zeolite \\\\ rotate'));
  assert.ok(!/SUMMARY:[^\r\n]*[^\\];/.test(text), 'no unescaped semicolon survives in a value');
});

test('long lines are folded, and folding never splits a character', () => {
  const label = 'Rocking child’s pose, lean-forward lat and shoulder stretch, kneel-sit chest opener — the unwind-the-night sequence';
  const text = ics(addReminder(blankReminders(), { at: '06:00', label }));
  const lines = text.split('\r\n');
  for (const line of lines) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `line over 75 octets: ${line}`);
  }
  // Unfolding (drop CRLF + one leading space) must give the text back intact.
  const unfolded = text.replace(/\r\n /g, '');
  assert.ok(unfolded.includes(label.replace(/,/g, '\\,')), 'the words survive the fold');
});

test('no times means a valid, empty calendar rather than a broken one', () => {
  const text = ics(blankReminders());
  assert.ok(text.includes('BEGIN:VCALENDAR'));
  assert.ok(!text.includes('BEGIN:VEVENT'));
});

test('the file says what it is, because a calendar entry has to explain itself later', () => {
  const text = ics(addReminder(blankReminders(), { at: '08:00', label: 'Binder window' }));
  assert.match(text.replace(/\r\n /g, ''), /SUMMARY:Shoes of Peace: Binder window/);
  assert.match(
    text.replace(/\r\n /g, ''),
    /DESCRIPTION:A reminder you set in Shoes of Peace\. It knows the time only/,
    'and it admits what it cannot know',
  );
});

/* --------------------------- kinds and cadence ------------------------ */

test('a reminder kind brings its own cadence, and the shape is what matters', () => {
  let r = addReminder(blankReminders(), { kind: 'snack', label: 'Move' });
  const snack = r.times[0];
  assert.equal(snack.kind, 'snack');
  assert.equal(snack.everyMinutes, KINDS.snack.everyMinutes, 'the kind supplies the starting shape');
  assert.ok(snack.until);

  // …and the person can override it without it stopping being that kind.
  r = updateReminder(r, snack.id, { everyMinutes: 240 });
  assert.equal(r.times[0].everyMinutes, 240);
  assert.equal(r.times[0].kind, 'snack');

  // A one-off kind has no window at all.
  r = updateReminder(r, snack.id, { kind: 'winddown' });
  assert.equal('everyMinutes' in r.times[0], false);
  assert.equal('until' in r.times[0], false);

  // Junk intervals are refused rather than half-applied.
  let bad = addReminder(blankReminders(), { at: '09:00', everyMinutes: 1, until: '17:00' });
  assert.equal('everyMinutes' in bad.times[0], false, 'every minute is not a reminder, it is a fault');
  bad = addReminder(blankReminders(), { at: '09:00', everyMinutes: 60 });
  assert.equal('everyMinutes' in bad.times[0], false, 'repeating without a window is not a schedule');
});

test('a repeating nudge expands to the times it actually fires', () => {
  const r = addReminder(blankReminders(), { at: '09:00', until: '17:00', everyMinutes: 120, kind: 'snack' });
  assert.deepEqual(expandTimes(r.times[0]), ['09:00', '11:00', '13:00', '15:00', '17:00']);

  const once = addReminder(blankReminders(), { at: '21:30', kind: 'winddown' });
  assert.deepEqual(expandTimes(once.times[0]), ['21:30'], 'a one-off is just itself');

  const overnight = addReminder(blankReminders(), { at: '22:00', until: '02:00', everyMinutes: 120 });
  assert.deepEqual(expandTimes(overnight.times[0]), ['22:00', '00:00', '02:00'], 'a window may cross midnight');
});

test('quiet hours silence the repeating nudges and leave chosen times alone', () => {
  const quiet = { from: '12:00', to: '14:00' };
  assert.equal(inQuietHours('12:30', quiet), true);
  assert.equal(inQuietHours('14:00', quiet), false, 'the end is exclusive');
  assert.equal(inQuietHours('23:00', { from: '21:00', to: '07:00' }), true, 'windows wrap midnight');
  assert.equal(inQuietHours('08:00', { from: '21:00', to: '07:00' }), false);

  const r = addReminder(blankReminders(), { at: '09:00', until: '17:00', everyMinutes: 60 });
  const fires = expandTimes(r.times[0], quiet);
  assert.equal(fires.includes('12:00'), false);
  assert.equal(fires.includes('13:00'), false);
  assert.equal(fires.includes('11:00'), true);
  assert.equal(fires.includes('14:00'), true);
});

test('the calendar file carries one event per firing, with stable ids', () => {
  let r = addReminder(blankReminders(), { at: '09:00', until: '15:00', everyMinutes: 120, label: 'Move' });
  r = { ...r, quiet: { from: '12:30', to: '13:30' } };
  const text = remindersToIcs(r, { from: '2026-08-23', now: NOW });

  // 09:00, 11:00, 15:00 — 13:00 lands inside quiet hours and is not written.
  assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 3);
  assert.ok(text.includes('DTSTART:20260823T090000'));
  assert.ok(text.includes('DTSTART:20260823T150000'));
  assert.ok(!text.includes('DTSTART:20260823T130000'), 'quiet hours reach the file, not just the screen');
  assert.ok(text.includes('RRULE:FREQ=DAILY'), 'each firing repeats daily');

  const uids = [...text.matchAll(/UID:([^\r\n]+)/g)].map((m) => m[1]);
  assert.equal(new Set(uids).size, uids.length, 'every event needs its own id');
  assert.ok(uids.every((u) => u.startsWith(r.times[0].id)), 'ids stay tied to the reminder they came from');

  // Re-exporting the same schedule gives the same ids, so a calendar updates
  // its events instead of collecting duplicates.
  const again = remindersToIcs(r, { from: '2026-08-24', now: NOW });
  const uids2 = [...again.matchAll(/UID:([^\r\n]+)/g)].map((m) => m[1]);
  assert.deepEqual(uids2, uids);
});
