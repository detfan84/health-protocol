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

/** Off, with nothing scheduled. Opt-in is the hard rule (decision 12). */
export function blankReminders() {
  return { key: REMINDERS_KEY, enabled: false, times: [] };
}

/** Everything the rest of the app can rely on existing. */
export function normalizeReminders(rec) {
  const r = rec ? structuredClone(rec) : blankReminders();
  r.key = REMINDERS_KEY;
  r.enabled = r.enabled === true;
  r.times = Array.isArray(r.times) ? r.times.filter(isTime).map(fixTime) : [];
  r.times.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return r;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isTime = (t) => t && typeof t === 'object' && HHMM.test(String(t.at ?? ''));

function fixTime(t) {
  const out = { id: String(t.id ?? newId()), at: String(t.at) };
  const label = String(t.label ?? '').trim();
  if (label) out.label = label;
  // days: 0 = Sunday … 6 = Saturday. Absent means every day.
  if (Array.isArray(t.days)) {
    const days = [...new Set(t.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
    if (days.length && days.length < 7) out.days = days.sort();
  }
  return out;
}

export function addReminder(rec, { at, label, days } = {}) {
  const r = normalizeReminders(rec);
  if (!HHMM.test(String(at ?? ''))) return r; // a broken time is not a schedule
  r.times.push(fixTime({ id: newId(), at, label, days }));
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
  return normalizeReminders(r);
}

export function removeReminder(rec, id) {
  const r = normalizeReminders(rec);
  r.times = r.times.filter((x) => x.id !== id);
  return r;
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
export function remindersToIcs(rec, { appName = 'Protocol', from, now = new Date() } = {}) {
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
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@protocol-app.local`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${localStart(startDate, t.at)}`,
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

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`; // CRLF throughout, per the spec
}
