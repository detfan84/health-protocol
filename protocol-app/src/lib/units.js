// units.js — one place that knows how volumes are stored and how they read.
//
// Decision K2 (Kevin, Aug 19 2026): a single global unit setting, imperial by
// default. The April brief asked for ounces and v0.2 shipped "glasses", which
// is not a unit — it is a guess about the size of somebody's cup. PLAN.md
// section 2 lists that as a regression; this file is the fix.
//
// Storage is canonical MILLILITRES, always, whatever the person reads. A
// stored number means the same thing on every device, so flipping the setting
// re-reads history rather than reinterpreting it.

export const ML_PER_FL_OZ = 29.5735295625; // US fluid ounce
export const IMPERIAL_STEP_ML = 237; // 8 fl oz — the glass the old tap meant
export const METRIC_STEP_ML = 250;

/** 'imperial' | 'metric' — imperial is the default (K2). */
export function unitsOf(setting) {
  return setting?.value === 'metric' ? 'metric' : 'imperial';
}

/** How much one tap of the + button is worth, in ml. */
export function stepMl(units) {
  return units === 'metric' ? METRIC_STEP_ML : IMPERIAL_STEP_ML;
}

/** The unit's short label, for chips and aria text. */
export function volumeUnitLabel(units) {
  return units === 'metric' ? 'ml' : 'oz';
}

/**
 * Stored ml → what the screen shows. Whole units: nobody logs 23.7 oz of
 * water, and a decimal here would imply a precision the tap does not have.
 * Returns a number, or undefined when there is nothing stored — absence is
 * a state of its own (ruling A) and must not become 0 here.
 */
export function displayVolume(ml, units) {
  if (!Number.isFinite(ml)) return undefined;
  return units === 'metric' ? Math.round(ml) : Math.round(ml / ML_PER_FL_OZ);
}

/** What the person typed → ml. Blank or nonsense is undefined, never 0. */
export function parseVolume(text, units) {
  const t = String(text ?? '').trim();
  if (t === '') return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return units === 'metric' ? Math.round(n) : Math.round(n * ML_PER_FL_OZ);
}

/**
 * The legacy conversion, in one place so the migration ladder and the
 * import path can never drift apart: a v0.2 "glass" was 8 fl oz.
 *
 * This is an assumption, and it is recorded as one — every converted record
 * keeps `waterFromGlasses`, so a person (or a future us) can see that the
 * number was derived rather than logged, and what it was derived from.
 */
export function legacyGlassesToMl(glasses) {
  if (!Number.isFinite(glasses)) return undefined;
  return Math.round(glasses * IMPERIAL_STEP_ML);
}

/* ------------------------------- weight ------------------------------ */
//
// Same rule as volume: stored canonical (kilograms), read in whatever the
// person set. A training log that changes meaning when somebody flips a
// setting is a log you cannot trust, and a log you cannot trust is worse
// than no log.

export const KG_PER_LB = 0.45359237;

export function weightUnitLabel(units) {
  return units === 'metric' ? 'kg' : 'lb';
}

/** Stored kg → what the screen shows. Half units, because plates are real. */
export function displayWeight(kg, units) {
  if (!Number.isFinite(kg)) return undefined;
  const n = units === 'metric' ? kg : kg / KG_PER_LB;
  return Math.round(n * 2) / 2;
}

/** What the person typed → kg. Blank or nonsense is undefined, never 0. */
export function parseWeight(text, units) {
  const t = String(text ?? '').trim();
  if (t === '') return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return units === 'metric' ? n : n * KG_PER_LB;
}

/* ---------------------- units that follow the equipment ------------------ *
 *
 * Kevin, 29 Aug: "allow them to toggle the units based on the equipment."
 *
 * One global toggle cannot tell the truth about a rack that has both.
 * Kettlebells are sold in kilograms nearly everywhere, including where
 * everything else is sold in pounds — so somebody doing a goblet squat with a
 * 24 and a bench press with 135 is reading two scales, and asking them to pick
 * one is asking them to do arithmetic in their head every session.
 *
 * Only equipment that carries a load can carry a unit. A foam roller has no
 * weight to express.
 *
 * Storage does not change: everything is kilograms underneath, as it always
 * was. This is a reading preference, so switching it re-reads history rather
 * than reinterpreting it — the rule the global toggle already follows.
 */
export const WEIGHTED_EQUIPMENT = ['dumbbell', 'kettlebell', 'mace'];

/**
 * Which unit to show for one item.
 *
 * An absent preference means "same as everything else", which is a different
 * fact from "metric". Nobody is told their kettlebells are in kilos because
 * kettlebells usually are — theirs might not be.
 *
 * An item can need more than one piece of equipment, so the first weighted one
 * in the order above decides. The answer is then stable rather than dependent
 * on how a card happened to list its kit.
 */
export function unitsForItem(item, { units = 'imperial', byEquipment = {} } = {}) {
  const kit = item?.equipment ?? [];
  for (const eq of WEIGHTED_EQUIPMENT) {
    if (!kit.includes(eq)) continue;
    const pref = byEquipment[eq];
    if (pref === 'metric' || pref === 'imperial') return pref;
  }
  return units;
}

/** The stored shape for the per-equipment preferences, with junk dropped. */
export function cleanByEquipment(raw) {
  const out = {};
  for (const eq of WEIGHTED_EQUIPMENT) {
    const v = raw?.[eq];
    if (v === 'metric' || v === 'imperial') out[eq] = v;
  }
  return out;
}
