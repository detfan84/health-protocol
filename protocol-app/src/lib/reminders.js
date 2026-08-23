// reminders.js — when you want to be nudged, and the one way to deliver that
// today without a server.
//
// The schedule is a single shape (decision 12, R16). Everything downstream
// consumes it and nothing replaces it: in-app nudges read it, the calendar
// export below turns it into alarms, and if push is ever built, the same rows
// are what a server would be told. Building it first is wasted under no
// option, including doing nothing.
//
// It lives in the settings store (decision 19), so it survives an import
// untouched and never travels inside a shared protocol.
//
// What a closed-app reminder can and cannot be, stated once so the copy never
// overpromises: a notification that arrives while the app is shut was
// composed when the app was last open. It cannot know that you already took
// the magnesium, or that the bottle is empty. Fixed cues that deliberately
// know nothing about today — that is the honest shape of this feature, on
// every delivery path there is.

import { newId } from './core.js';

export const REMINDERS_KEY = 'reminders';

/**
 * The kinds of reminder, because they do not want the same cadence (Kevin,
 * Aug 23). A block reminder happens once, at a time that means something. A
 * movement snack or a posture check is the opposite: it wants to come round
 * again through the day, and the exact minute matters not at all.
 *
 * `kind` carries the intent and the sensible starting shape. What the app
 * actually schedules is the shape — a kind is never behaviour of its own, so
 * anybody can drag a posture check to every four hours and it stays a posture
 * check.
 */
export const KINDS = {
  block: { label: 'Part of the day', repeats: false },
  winddown: { label: 'Wind-down', repeats: false },
  snack: { label: 'Movement snack', repeats: true, everyMinutes: 120, at: '09:00', until: '18:00' },
  posture: { label: 'Posture check', repeats: true, everyMinutes: 45, at: '09:00', until: '17:00' },
  other: { label: 'Something else', repeats: false },
};

/** Off, with nothing scheduled. Opt-in is the hard rule (decision 12). */
export function blankReminders() {
  return { key: REMINDERS_KEY, enabled: false, times: [] };
}

/** Everything the rest of the app can rely on existing. */
export function normalizeReminders(rec) {
  const r = rec ? structuredClone(rec) : blankReminders();
  r.key = REMINDERS_KEY;
  r.enabled = r.enabled === true;
  // Quiet hours apply to REPEATING nudges only. A time you typed yourself is a
  // time you meant, even if it is 22:30 — the app does not overrule it.
  if (r.quiet && HHMM.test(String(r.quiet.from ?? '')) && HHMM.test(String(r.quiet.to ?? ''))) {
    r.quiet = { from: String(r.quiet.from), to: String(r.quiet.to) };
  } else {
    delete r.quiet;
  }
  r.times = Array.isArray(r.times) ? r.times.filter(isTime).map(fixTime) : [];
  r.times.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return r;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isTime = (t) => t && typeof t === 'object' && HHMM.test(String(t.at ?? ''));

function fixTime(t) {
  const out = { id: String(t.id ?? newId()), at: String(t.at) };
  out.kind = KINDS[t.kind] ? String(t.kind) : 'block';
  const label = String(t.label ?? '').trim();
  if (label) out.label = label;
  // A repeating nudge: from `at` until `until`, every `everyMinutes`. Only
  // these three fields make a reminder repeat — the kind is a label.
  const every = Number(t.everyMinutes);
  if (Number.isInteger(every) && every >= 5 && every <= 12 * 60 && HHMM.test(String(t.until ?? ''))) {
    out.everyMinutes = every;
    out.until = String(t.until);
  }
  // days: 0 = Sunday … 6 = Saturday. Absent means every day.
  if (Array.isArray(t.days)) {
    const days = [...new Set(t.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
    if (days.length && days.length < 7) out.days = days.sort();
  }
  return out;
}

export function addReminder(rec, { at, label, days, kind, everyMinutes, until } = {}) {
  const r = normalizeReminders(rec);
  const preset = KINDS[kind] ?? {};
  const start = at ?? preset.at;
  if (!HHMM.test(String(start ?? ''))) return r; // a broken time is not a schedule
  r.times.push(fixTime({
    id: newId(),
    at: start,
    label,
    days,
    kind,
    everyMinutes: everyMinutes ?? preset.everyMinutes,
    until: until ?? preset.until,
  }));
  return normalizeReminders(r);
}

export function updateReminder(rec, id, patch) {
  const r = normalizeReminders(rec);
  const t = r.times.find((x) => x.id === id);
  if (!t) return r;
  if (patch.at !== undefined && HHMM.test(String(patch.at))) t.at = String(patch.at);
  if (patch.label !== undefined) {
    const l = String(patch.label).trim();
    if (l) t.label = l;
    else delete t.label;
  }
  if (patch.days !== undefined) {
    const fixed = fixTime({ ...t, days: patch.days });
    if (fixed.days) t.days = fixed.days;
    else delete t.days;
  }
  if (patch.kind !== undefined && KINDS[patch.kind]) {
    t.kind = patch.kind;
    // Changing kind offers that kind's shape, but only where the person has
    // not already said otherwise — switching to "posture check" should not
    // silently rewrite a window somebody set on purpose.
    const preset = KINDS[patch.kind];
    if (preset.repeats && t.everyMinutes === undefined) {
      t.everyMinutes = preset.everyMinutes;
      t.until = preset.until;
    }
    if (!preset.repeats) {
      delete t.everyMinutes;
      delete t.until;
    }
  }
  if (patch.everyMinutes !== undefined || patch.until !== undefined) {
    const next = fixTime({
      ...t,
      everyMinutes: patch.everyMinutes ?? t.everyMinutes,
      until: patch.until ?? t.until,
    });
    if (next.everyMinutes) { t.everyMinutes = next.everyMinutes; t.until = next.until; }
    else { delete t.everyMinutes; delete t.until; }
  }
  return normalizeReminders(r);
}

export function removeReminder(rec, id) {
  const r = normalizeReminders(rec);
  r.times = r.times.filter((x) => x.id !== id);
  return r;
}

/* ------------------------- when it actually fires -------------------- */

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toHHMM = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** Is this clock time inside a quiet window? Windows may wrap midnight. */
export function inQuietHours(at, quiet) {
  if (!quiet) return false;
  const t = toMinutes(at), from = toMinutes(quiet.from), to = toMinutes(quiet.to);
  return from <= to ? t >= from && t < to : t >= from || t < to;
}

/**
 * One reminder → the clock times it actually fires at.
 *
 * A one-off is itself. A repeating nudge is its window, stepped, with quiet
 * hours removed. This is the single expansion everything downstream uses, so
 * the calendar file and any future in-app nudge can never disagree about when
 * something happens.
 */
export function expandTimes(t, quiet) {
  if (!t?.everyMinutes || !t.until) return [t.at];
  const start = toMinutes(t.at);
  let end = toMinutes(t.until);
  if (end < start) end += 24 * 60; // a window may run past midnight
  const out = [];
  for (let m = start; m <= end && out.length < 96; m += t.everyMinutes) {
    const at = toHHMM(m);
    if (!inQuietHours(at, quiet)) out.push(at);
  }
  return out;
}

/** The times a protocol's timed blocks suggest — a starting point, not a rule. */
export function remindersFromBlocks(protocols) {
  const seen = new Map();
  for (const p of protocols ?? []) {
    if (p?.active !== true) continue;
    for (const b of p.blocks ?? []) {
      if (!HHMM.test(String(b.start ?? ''))) continue;
      if (!seen.has(b.start)) seen.set(b.start, b.name);
    }
  }
  return [...seen.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([at, label]) => ({ at, label }));
}

/* ------------------------------ calendar ----------------------------- */
//
// iCalendar (RFC 5545), because a person's own calendar is a reminder system
// that already works while this app is closed, on every phone, offline, with
// no server and nothing to keep running. Exporting is the whole mechanism.
//
// Times are FLOATING — no timezone, no Z suffix — which is exactly right for
// "07:30, wherever I am": the calendar fires at 07:30 local, always, and
// travelling never has to be thought about.

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newline are special. */
function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines are folded at 75 octets (§3.1) — long names would break parsers. */
function fold(line) {
  const bytes = [...new TextEncoder().encode(line)];
  if (bytes.length <= 75) return line;
  const parts = [];
  let start = 0;
  while (start < bytes.length) {
    const limit = start === 0 ? 75 : 74; // continuation lines carry a leading space
    let end = Math.min(start + limit, bytes.length);
    // never split a multi-byte character
    while (end > start && end < bytes.length && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;
    const chunk = new TextDecoder().decode(new Uint8Array(bytes.slice(start, end)));
    parts.push(start === 0 ? chunk : ` ${chunk}`);
    start = end;
  }
  return parts.join('\r\n');
}

function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function localStart(dateKey, at) {
  return `${String(dateKey).replace(/-/g, '')}T${at.replace(':', '')}00`;
}

/**
 * The schedule as a calendar file.
 *
 * One repeating event per reminder, marked TRANSPARENT so it never makes
 * anybody look busy, each carrying a VALARM that fires at the moment itself.
 * The event body says what this is and where it came from, because in six
 * months "Protocol" in a calendar needs to explain itself.
 */
export function remindersToIcs(rec, { appName = 'Shoes of Peace', from, now = new Date() } = {}) {
  const r = normalizeReminders(rec);
  const startDate = from ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dtstamp = stamp(now);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeText(appName)}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${appName} reminders`)}`,
  ];

  for (const t of r.times) {
    const rule = t.days
      ? `RRULE:FREQ=WEEKLY;BYDAY=${t.days.map((d) => DAY_CODES[d]).join(',')}`
      : 'RRULE:FREQ=DAILY';
    const title = t.label ? `${appName}: ${t.label}` : `${appName} reminder`;
    // A repeating nudge becomes one daily event per firing. Calendars handle
    // sub-daily recurrence inconsistently, and a reminder that only works in
    // some calendars is worse than none — so the app does the arithmetic and
    // hands over something every calendar understands.
    for (const at of expandTimes(t, r.quiet)) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}-${at.replace(':', '')}@protocol-app.local`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${localStart(startDate, at)}`,
      'DURATION:PT5M',
      'TRANSP:TRANSPARENT',
      rule,
      fold(`SUMMARY:${escapeText(title)}`),
      fold(`DESCRIPTION:${escapeText(`A reminder you set in ${appName}. It knows the time only — open the app to see what is actually due.`)}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT0M',
      fold(`DESCRIPTION:${escapeText(title)}`),
      'END:VALARM',
      'END:VEVENT',
    );
    }
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`; // CRLF throughout, per the spec
}
