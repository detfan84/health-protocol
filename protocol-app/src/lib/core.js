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
