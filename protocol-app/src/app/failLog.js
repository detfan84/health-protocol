// failLog.js — the breadcrumb channel (ruling B, point 3).
//
// When a write fails, the moment is announced on screen — that announcement
// is the guarantee. This file is the SUPPLEMENT: a best-effort note on a
// separate channel (localStorage), surfaced at next launch until dismissed,
// so a failure from Tuesday can still be amended accurately on Friday.
//
// Explicitly best-effort: localStorage sometimes survives when IndexedDB
// fails and sometimes fails with it. Nothing depends on this channel —
// every function here swallows its own errors and reports plain booleans.
// Recording a failed write is itself a write; this file never pretends
// otherwise.

const KEY = 'protocol-app.failed-writes.v1';

// Bounded so a repeating failure can't grow without limit. The number is
// housekeeping, not a claim — any small cap serves.
const MAX_ENTRIES = 20;

function storage() {
  return globalThis.localStorage ?? null;
}

/** Note a failed write. Returns true only if the note itself stored. */
export function recordFailure({ what, error } = {}) {
  try {
    const s = storage();
    if (!s) return false;
    const list = pendingFailures();
    list.push({
      at: new Date().toISOString(),
      what: String(what ?? 'A write'),
      name: error?.name ?? null,
      message: error?.message ?? null,
    });
    while (list.length > MAX_ENTRIES) list.shift();
    s.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // the live announcement already happened; this was the supplement
  }
}

/** Failures noted earlier and not yet dismissed. Always an array. */
export function pendingFailures() {
  try {
    const s = storage();
    if (!s) return [];
    const raw = s.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** The person has seen the notes — clear them. */
export function dismissFailures() {
  try {
    const s = storage();
    if (!s) return false;
    s.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
