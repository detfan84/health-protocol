// trackerOps.js — the trackers' core, as pure functions over records.
//
// Day records are WHAT HAPPENED. These ops append and amend the record for a
// local calendar day; they never read or reshape the plan. One tap is the
// whole daily ask: toggleCheck is the entire interaction for an item.
//
// The app records; it never grades. Nothing here computes streaks, totals
// across days, or "you haven't done X" — and nothing downstream should either.
//
// Supply lives in the SETTINGS store (keys "supply:<itemId>"). The ratified
// protocol shape has no supply field, and the file validator strips unknown
// fields from protocols on import — so supply on the plan would be lost in a
// backup round trip. Settings records pass through imports untouched, so
// counts survive export → wipe → import like everything else.

import { newId, nowIso } from '../lib/core.js';
import { legacyGlassesToMl } from '../lib/units.js';

function clone(x) {
  return structuredClone(x);
}

/* ----------------------------- day record ---------------------------- */

/** A fresh, empty record for a local date key ('YYYY-MM-DD').
 *  No `waterMl` field: absence means "never logged" (ruling A, Aug 18 2026).
 *  A zero enters a record only when the person's own taps put it there. */
export function blankDay(date) {
  return { date, checks: {}, food: [], updatedAt: nowIso() };
}

/** Normalize a loaded day so every op can rely on the fields existing. */
export function normalizeDay(day, date) {
  const d = day ? clone(day) : blankDay(date);
  d.date = d.date ?? date;
  d.checks = d.checks ?? {};
  d.food = Array.isArray(d.food) ? d.food : [];
  // A day record written by v0.2 counts water in "glasses". Adopt it into
  // millilitres here — the same conversion the schema-2 rung uses — so a day
  // that arrives through an old backup import reads the same as one that was
  // in the database at upgrade time. The provenance rides along: a converted
  // number is never presented as one the person logged.
  if (Number.isFinite(d.water) && !Number.isFinite(d.waterMl)) {
    d.waterMl = legacyGlassesToMl(d.water);
    d.waterFromGlasses = d.water;
  }
  delete d.water;
  // Ruling A: absent stays absent. Coercing a missing volume into 0 is the
  // exact bug class this law exists to kill — an unlogged day is not a
  // zero-water day. A stored, finite number (including a real 0 the person
  // tapped down to) passes through untouched; anything else is absence.
  if (!Number.isFinite(d.waterMl)) {
    delete d.waterMl;
    delete d.waterFromGlasses;
  }
  // The training log is an object of item id → what was done. Absent means
  // nothing was recorded, which is not the same as nothing was done.
  if (d.log && (typeof d.log !== 'object' || Array.isArray(d.log))) delete d.log;
  if (d.log && Object.keys(d.log).length === 0) delete d.log;
  return d;
}

/**
 * The one tap. Unchecked → checked (with the moment it happened);
 * checked → unchecked. Nothing else changes.
 */
export function toggleCheck(day, itemId, at = nowIso()) {
  const d = clone(day);
  if (d.checks[itemId]) delete d.checks[itemId];
  else d.checks[itemId] = { at };
  d.updatedAt = nowIso();
  return d;
}

export function setJournal(day, text) {
  const d = clone(day);
  const t = String(text ?? '');
  if (t.trim() === '') delete d.journal;
  else d.journal = t;
  d.updatedAt = nowIso();
  return d;
}

export function addFood(day, text, at = nowIso()) {
  const t = String(text ?? '').trim();
  if (!t) return day;
  const d = clone(day);
  d.food.push({ id: newId(), at, text: t });
  d.updatedAt = nowIso();
  return d;
}

export function removeFood(day, foodId) {
  const d = clone(day);
  d.food = d.food.filter((f) => f.id !== foodId);
  d.updatedAt = nowIso();
  return d;
}

/** Water is a volume the person drank — the record itself, not a target.
 *  Stored in millilitres whatever the screen reads (K2); `deltaMl` is one
 *  tap's worth, from units.js.
 *
 *  Three-state (ruling A): before the first tap there is no number at all.
 *  A minus-tap on nothing stays nothing — it does not invent an explicit 0.
 *  Once tapped, the volume is real; tapping down to 0 stores a true,
 *  user-made zero, which is a different fact from "never logged". */
export function bumpWaterMl(day, deltaMl) {
  const has = Number.isFinite(day.waterMl);
  if (!has && deltaMl <= 0) return day; // nothing logged; nothing to lower
  const d = clone(day);
  d.waterMl = Math.max(0, (has ? d.waterMl : 0) + deltaMl);
  d.updatedAt = nowIso();
  return d;
}

/** The typed total, in ml. `undefined` clears the day back to never-logged —
 *  emptying the box is a correction, not a zero. */
export function setWaterMl(day, ml) {
  const d = clone(day);
  if (ml === undefined) delete d.waterMl;
  else d.waterMl = Math.max(0, Math.round(ml));
  delete d.waterFromGlasses; // a typed number is logged, not derived
  d.updatedAt = nowIso();
  return d;
}

/* ---------------------------- training log ---------------------------- */
//
// What you actually did, not just that you did it (PLAN §4.2, decision 22 as
// extended). Sets with reps and load, or a duration — recorded at the moment
// of the tap, in the day record, so it outlives every later edit to the plan.
//
// Two rules this shape exists to keep:
//
//   The tap is still the whole ask. Logging is optional and always was; an
//   item you tick without typing anything is complete.
//
//   Typed numbers are never destroyed by a tap. The log lives beside the
//   checks, not inside them, so un-checking something by accident cannot
//   erase the work you wrote down (ruling B: typed content is never
//   stranded). Load is stored in kilograms, whatever the screen shows.

function logOf(day, itemId) {
  return day.log?.[itemId];
}

function withLog(day, itemId, change) {
  const d = clone(day);
  d.log = d.log ?? {};
  const current = d.log[itemId] ?? {};
  const next = change(clone(current));
  if (!next || (!next.sets?.length && !Number.isFinite(next.seconds))) {
    delete d.log[itemId];                       // nothing recorded is nothing
    if (Object.keys(d.log).length === 0) delete d.log;
  } else {
    next.updatedAt = nowIso();
    d.log[itemId] = next;
  }
  d.updatedAt = nowIso();
  return d;
}

/** A blank set, ready to be typed into. Nothing is a zero until it is typed. */
export function addSet(day, itemId, initial = {}) {
  return withLog(day, itemId, (log) => {
    const sets = Array.isArray(log.sets) ? log.sets : [];
    sets.push(cleanSet(initial));
    return { ...log, sets };
  });
}

/** Patch one set. `reps` and `kg` may each be undefined — that is "not said". */
export function updateSet(day, itemId, index, patch) {
  return withLog(day, itemId, (log) => {
    const sets = Array.isArray(log.sets) ? [...log.sets] : [];
    if (!sets[index]) return log;
    sets[index] = cleanSet({ ...sets[index], ...patch });
    return { ...log, sets };
  });
}

export function removeSet(day, itemId, index) {
  return withLog(day, itemId, (log) => {
    const sets = Array.isArray(log.sets) ? log.sets.filter((_, i) => i !== index) : [];
    return { ...log, sets };
  });
}

/** For holds and walks: one number, in seconds. undefined clears it. */
export function setDuration(day, itemId, seconds) {
  return withLog(day, itemId, (log) => {
    const next = { ...log };
    if (Number.isFinite(seconds) && seconds > 0) next.seconds = Math.round(seconds);
    else delete next.seconds;
    return next;
  });
}

function cleanSet(raw) {
  const out = {};
  if (Number.isFinite(raw.reps) && raw.reps > 0) out.reps = Math.round(raw.reps);
  if (Number.isFinite(raw.kg) && raw.kg > 0) out.kg = Math.round(raw.kg * 1000) / 1000;
  if (Number.isFinite(raw.seconds) && raw.seconds > 0) out.seconds = Math.round(raw.seconds);
  return out;
}

/** The log for one item on one day, or undefined. */
export function trainingLog(day, itemId) {
  return logOf(day, itemId);
}

/**
 * The last day before `before` that has a log for this item, with its log.
 * This is what makes a training screen worth opening: you train against last
 * time's numbers, and an app that cannot show them is a checklist.
 */
export function lastLoggedBefore(history, itemId, before) {
  let best = null;
  for (const [date, rec] of Object.entries(history ?? {})) {
    if (date >= before) continue;
    const log = rec?.log?.[itemId];
    if (!log) continue;
    if (!best || date > best.date) best = { date, log };
  }
  return best;
}

/* ------------------------------- supply ------------------------------ */

export function supplyKey(itemId) {
  return `supply:${itemId}`;
}

/**
 * Build/patch a supply record for the settings store.
 * `name` is a label snapshot so the record stays readable even if the item
 * is later removed from the plan (records outlive plans by design).
 */
export function makeSupply(itemId, { name, count, note } = {}, existing) {
  const rec = existing ? clone(existing) : { key: supplyKey(itemId), itemId };
  if (name !== undefined) rec.name = String(name);
  if (count !== undefined) {
    // Careful: Number('') is 0 in JS. A cleared field must mean "not
    // tracking a number for this" — never a silent "zero on hand".
    const blank = count === null || String(count).trim() === '';
    const c = Number(count);
    if (!blank && Number.isFinite(c) && c >= 0) rec.count = c;
    else delete rec.count;
  }
  if (note !== undefined) {
    const n = String(note).trim();
    if (n) rec.note = n;
    else delete rec.note;
  }
  rec.updatedAt = nowIso();
  return rec;
}

/* ------------------------------- pause -------------------------------- */
//
// Pausing is Kevin's answer to K4 (R16, Aug 22): if you cannot do something
// right now, the app should stop asking — and you should be able to start it
// again whenever you want, without editing your plan or losing your history.
//
// Two ways an item becomes unavailable:
//   - you paused it, deliberately;
//   - you ran out of it, which the app can see from the supply count it is
//     already keeping. Decision 22 says run-out gaps are data, never nags;
//     this is that rule with teeth — the data changes what the app ASKS of
//     you, and still says nothing about you.
//
// Pause lives in the SETTINGS store, not on the plan (decision 19): it is
// personal state, so it survives an import untouched, and sharing a protocol
// never tells anyone else what you have stopped taking.

export function pauseKey(itemId) {
  return `pause:${itemId}`;
}

/**
 * @param reason 'manual' — you paused it. (Running out is derived live from
 *               the supply count; it is not written down as a pause, so the
 *               moment you restock, the item is simply back.)
 */
export function makePause(itemId, { name, note, reason = 'manual' } = {}) {
  const rec = { key: pauseKey(itemId), itemId, reason, pausedAt: nowIso(), updatedAt: nowIso() };
  if (name !== undefined) rec.name = String(name); // label snapshot, as elsewhere
  if (note !== undefined) {
    const n = String(note).trim();
    if (n) rec.note = n;
  }
  return rec;
}

/**
 * Why this item is not being asked for — or null if it is.
 * Pure: the caller brings the pause record and the supply record.
 */
export function unavailableReason(itemId, { pause, supply } = {}) {
  if (pause) return { kind: 'paused', since: pause.pausedAt, note: pause.note };
  // Three-state: no count means "not tracking supply for this", which is not
  // the same as none left. Only a real, stored zero means out.
  if (supply && Number.isFinite(supply.count) && supply.count <= 0) {
    return { kind: 'out-of-stock', since: supply.updatedAt };
  }
  return null;
}
