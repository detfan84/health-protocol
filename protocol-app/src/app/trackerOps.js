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

function clone(x) {
  return structuredClone(x);
}

/* ----------------------------- day record ---------------------------- */

/** A fresh, empty record for a local date key ('YYYY-MM-DD').
 *  No `water` field: absence means "never logged" (ruling A, Aug 18 2026).
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
  // Ruling A: absent stays absent. Coercing a missing count into 0 is the
  // exact bug class this law exists to kill — an unlogged day is not a
  // zero-water day. A stored, finite number (including a real 0 the person
  // tapped down to) passes through untouched; anything else is absence.
  if (!Number.isFinite(d.water)) delete d.water;
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

/** Water is a simple tally of glasses — the record itself, not a target.
 *  Three-state (ruling A): before the first tap there is no number at all.
 *  A minus-tap on nothing stays nothing — it does not invent an explicit 0.
 *  Once tapped, the count is real; tapping down to 0 stores a true, user-made
 *  zero, which is a different fact from "never logged". */
export function bumpWater(day, delta) {
  const has = Number.isFinite(day.water);
  if (!has && delta <= 0) return day; // nothing logged; nothing to lower
  const d = clone(day);
  d.water = Math.max(0, (has ? d.water : 0) + delta);
  d.updatedAt = nowIso();
  return d;
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
