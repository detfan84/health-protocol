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
 * The one tap. Unchecked → checked; checked → unchecked. Nothing else changes.
 *
 * What lands in the record is a SNAPSHOT, taken at tap time (decision 20): the
 * item's name and dose as they were configured when you tapped, and the units
 * actually taken where a supply dose is configured. Plans get edited — an item
 * gets renamed, a dose gets halved — and a record that only stores an id reads
 * a year later as whatever the plan says today. Records outlive plan edits, so
 * they have to carry their own copy of what they were about.
 *
 * `snapshot` may be a plain ISO string, which is the older call shape and still
 * means "just the moment".
 */
export function toggleCheck(day, itemId, snapshot = {}) {
  const s = typeof snapshot === 'string' ? { at: snapshot } : (snapshot ?? {});
  const d = clone(day);
  if (d.checks[itemId]) {
    delete d.checks[itemId];
  } else {
    const rec = { at: s.at ?? nowIso() };
    // Every field optional, and absent means "not configured" rather than
    // empty (ruling A) — a nameless item writes no name, not "".
    if (s.name) rec.name = String(s.name);
    if (s.dose) rec.dose = String(s.dose);
    if (Number.isFinite(s.units)) rec.units = s.units;
    if (s.unitName) rec.unitName = String(s.unitName);
    d.checks[itemId] = rec;
  }
  d.updatedAt = nowIso();
  return d;
}

/* ------------------------------ supply dose --------------------------- */
//
// Decision 22: per item, an optional dose config — how many units one check-off
// consumes, what a unit is called, and how strong one is. Check-off decrements
// silently; the units are visible and editable after the tap; un-checking
// restores exactly. Blank is not zero: an item with no dose configured is not
// being dose-tracked, and nothing about it moves.

/**
 * How many units one check-off of this item consumes, or null when it is not
 * being tracked that way. Both halves are required — a count with no dose is
 * somebody keeping a number by hand, and a dose with no count has nothing to
 * come out of.
 */
export function doseUnits(supply) {
  if (!supply) return null;
  if (!Number.isFinite(supply.unitsPerDose) || supply.unitsPerDose <= 0) return null;
  if (!Number.isFinite(supply.count)) return null;
  return supply.unitsPerDose;
}

/** A supply record with its count moved by `delta`, or undefined if it cannot move. */
function moveCount(supply, delta) {
  if (!supply || !Number.isFinite(supply.count) || delta === 0) return undefined;
  return { ...supply, count: Math.max(0, supply.count + delta), updatedAt: nowIso() };
}

/**
 * One tap, with the bottle it comes out of — the pure half of decision 22.
 *
 * → { day, supply? } — `supply` present only when the count actually moved.
 * The caller writes both in one transaction (db.mutateAcross), because a tick
 * against a bottle that never went down is a record that lies.
 *
 * What is deducted is what the count can cover: a bottle that says 1 left
 * cannot give up a dose of 2, and the honest reading of that is that the count
 * was wrong, not that the app should invent stock or go negative. The units are
 * recorded as deducted, so un-checking restores exactly what was taken, and the
 * editable line after the tap is where somebody says what they really took.
 */
export function applyCheckToggle({ day, item, supply, at = nowIso() } = {}) {
  const existing = day.checks?.[item.id];

  if (existing) {
    const next = toggleCheck(day, item.id);
    const back = Number.isFinite(existing.units) ? existing.units : 0;
    return { day: next, supply: moveCount(supply, back) };
  }

  const perDose = doseUnits(supply);
  const snapshot = { at, name: item.name, dose: item.dose };
  if (perDose !== null) {
    snapshot.units = Math.min(perDose, supply.count);
    snapshot.unitName = supply.unitName;
  }
  return {
    day: toggleCheck(day, item.id, snapshot),
    supply: perDose === null ? undefined : moveCount(supply, -snapshot.units),
  };
}

/**
 * Correct the units on a check that has already happened — "it says two, I took
 * one." The count moves by the difference, so the bottle and the record stay
 * in step, and clearing the field means "I am not saying", not zero.
 */
export function setCheckUnits({ day, supply, itemId, units } = {}) {
  const existing = day.checks?.[itemId];
  if (!existing) return {}; // nothing recorded to correct

  const was = Number.isFinite(existing.units) ? existing.units : 0;
  const now = Number.isFinite(units) && units >= 0 ? Math.round(units) : null;
  if (now === was) return {};

  const rec = { ...existing };
  if (now === null) delete rec.units;
  else rec.units = now;

  const d = clone(day);
  d.checks[itemId] = rec;
  d.updatedAt = nowIso();
  return { day: d, supply: moveCount(supply, was - (now ?? 0)) };
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
export function makeSupply(itemId, { name, count, note, unitsPerDose, unitName, unitStrength } = {}, existing) {
  const rec = existing ? clone(existing) : { key: supplyKey(itemId), itemId };
  if (name !== undefined) rec.name = String(name);

  // Careful: Number('') is 0 in JS. A cleared field must mean "not tracking a
  // number for this" — never a silent "zero on hand" (ruling A).
  const num = (raw, { min = 0 } = {}) => {
    const blank = raw === null || String(raw).trim() === '';
    const n = Number(raw);
    return !blank && Number.isFinite(n) && n >= min ? n : undefined;
  };
  const text = (raw) => {
    const t = String(raw).trim();
    return t || undefined;
  };
  const set = (key, value) => {
    if (value === undefined) delete rec[key];
    else rec[key] = value;
  };

  if (count !== undefined) set('count', num(count));
  // Zero units per dose is not a dose, so the floor here is 1 rather than 0.
  if (unitsPerDose !== undefined) set('unitsPerDose', num(unitsPerDose, { min: 1 }));
  if (unitName !== undefined) set('unitName', text(unitName));
  if (unitStrength !== undefined) set('unitStrength', text(unitStrength));
  if (note !== undefined) set('note', text(note));

  rec.updatedAt = nowIso();
  return rec;
}

/** Is this item being supply-tracked at all? Any one field is enough. */
export function isTracked(supply) {
  if (!supply) return false;
  return Number.isFinite(supply.count)
    || Number.isFinite(supply.unitsPerDose)
    || Boolean(supply.unitName)
    || Boolean(supply.unitStrength)
    || Boolean(supply.note);
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
