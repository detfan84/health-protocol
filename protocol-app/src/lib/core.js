// core.js — IDs, time, and merge. Small on purpose; everything else leans on it.

/** Permanent random ID. The name attached to it is just a label. */
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback (older WebViews): time + randomness. Collision odds are negligible
  // for a single-user local store.
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  );
}

export function nowIso() {
  return new Date().toISOString();
}

/**
 * Local date key, 'YYYY-MM-DD'. Carried lesson from the old build: never use
 * toISOString() for day keys — it flips to UTC and a 9pm check-off lands on
 * tomorrow. Day records are keyed by the user's own calendar day.
 */
export function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ------------------------------ clock ----------------------------- */
//
// Decision 23: times are shown in the device's own convention by default, with
// an in-app override for anybody whose phone disagrees with their head — and
// the STORED format never changes. A block that starts at 'HH:MM' is stored as
// 'HH:MM' whichever way it is read, so a plan shared between two people with
// different phones is the same plan.

export const TIME_FORMATS = ['auto', '12', '24'];

/** The stored setting, made safe. Anything unrecognised means "follow the device". */
export function timeFormatOf(setting) {
  const v = setting?.value;
  return TIME_FORMATS.includes(v) ? v : 'auto';
}

/** Does this device write clock times with AM/PM? */
export function deviceUses12Hour() {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true;
  } catch {
    return false; // no Intl worth trusting: 24-hour is the unambiguous one
  }
}

/**
 * 'HH:MM' → what this person reads. Anything that is not a clock time comes
 * back untouched: an unparseable value is somebody else's data, and inventing
 * a time for it would be worse than showing it raw (ruling A).
 */
export function displayTime(value, format = 'auto') {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return String(value ?? '');
  const hour = Number(m[1]);
  const minute = m[2];
  if (hour > 23) return String(value); // '24:00' is an internal end-of-day marker
  const padded = String(hour).padStart(2, '0');
  const twelve = format === '12' || (format === 'auto' && deviceUses12Hour());
  if (!twelve) return `${padded}:${minute}`;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${suffix}`;
}

/** 'YYYY-MM-DD' from an ISO timestamp, in local time. Blank input → null. */
export function dateKeyFromIso(iso) {
  if (typeof iso !== 'string' || !iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : localDateKey(d);
}

/* ----------------------------- merge ------------------------------ */
/**
 * Record-level referee: whichever record was touched most recently wins.
 * Missing side loses to the present side. Ties keep local (stable, no churn).
 * A record with no updatedAt is treated as oldest — real records always
 * carry one; this only softens hand-made or AI-made files.
 */
export function newerWins(local, incoming) {
  if (local == null) return incoming;
  if (incoming == null) return local;
  const l = typeof local.updatedAt === 'string' ? local.updatedAt : '';
  const i = typeof incoming.updatedAt === 'string' ? incoming.updatedAt : '';
  return i > l ? incoming : local;
}

/**
 * Merge two collections of records by key. NOTHING IS EVER DELETED by a
 * merge: records present only locally stay; records present only in the
 * import are added; records present in both go to the referee.
 * Returns { merged, stats: { added, updated, kept } }.
 */
export function mergeCollections(localArr, incomingArr, keyOf) {
  const merged = new Map();
  for (const rec of localArr ?? []) merged.set(keyOf(rec), rec);
  const stats = { added: 0, updated: 0, kept: 0 };
  for (const inc of incomingArr ?? []) {
    const k = keyOf(inc);
    if (!merged.has(k)) {
      merged.set(k, inc);
      stats.added++;
      continue;
    }
    const winner = newerWins(merged.get(k), inc);
    if (winner === inc) {
      merged.set(k, inc);
      stats.updated++;
    } else {
      stats.kept++;
    }
  }
  return { merged: [...merged.values()], stats };
}
