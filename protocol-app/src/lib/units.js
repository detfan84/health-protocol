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
