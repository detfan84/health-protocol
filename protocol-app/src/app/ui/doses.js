// doses.js — "how much of that food would I need to eat?"
//
// Kevin, 31 Aug: "nothing compares 'eat this much of this food to equal a
// standard dose of the vitamin supplement' or something like that. So you see a
// bunch of foods that also have it, but how much do they have? And compared to
// what? How much of that food would I need to eat? I can't tell."
//
// Two sides, both of them real numbers already on file:
//
//   food        a measured amount per serving, from USDA SR Legacy, joined on
//               in scripts/build-food-amounts.mjs with its fdc_id attached
//   supplement  the typical dose the shelf already printed, as a string a human
//               wrote — "200–400 mg elemental", "1000–2000 IU", "per label"
//
// The only arithmetic is a ratio between them, and it is refused rather than
// fudged wherever the two cannot honestly be put in the same unit.

const MASS = { g: 1000, mg: 1, mcg: 0.001, µg: 0.001, ug: 0.001 };

/**
 * A dose string as a range in milligrams, or null when it cannot be read.
 *
 * "per label", "one sachet" and "5 ml" are not refusals to try — they are the
 * honest state of a shelf where some products only say what is in them on the
 * tub. A null here means the screen says nothing, which is correct.
 */
export function parseDose(text, nutrient) {
  if (typeof text !== 'string') return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:[–—-]\s*(\d+(?:\.\d+)?))?\s*(g|mg|mcg|µg|ug|IU)\b/i);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] === undefined ? lo : Number(m[2]);
  const unit = m[3].toLowerCase() === 'iu' ? 'IU' : m[3].toLowerCase();

  if (unit === 'IU') {
    // IU is not a mass. The conversion is per-substance, and only one of these
    // is unambiguous enough to do silently.
    //
    //   vitamin D   1 µg cholecalciferol = 40 IU, exactly, always.
    //   vitamin A   depends on whether the capsule is retinol or beta-carotene,
    //               and the factor differs by more than threefold.
    //   vitamin E   depends on natural d-alpha versus synthetic dl-alpha.
    //
    // So D converts and the other two do not. Guessing which form is in
    // somebody's bottle is exactly the invented number this app refuses.
    if (nutrient !== 'vitamin-d') return { unreadable: 'IU', text };
    return { lo: (lo / 40) * MASS.mcg, hi: (hi / 40) * MASS.mcg, unit: 'mcg', converted: 'from IU at 40 IU per microgram' };
  }
  const factor = MASS[unit];
  if (!factor) return null;
  return { lo: lo * factor, hi: hi * factor, unit };
}

/** A measured food amount in milligrams. */
export function amountInMg(amount) {
  if (!amount || !Number.isFinite(amount.perServing)) return null;
  const factor = MASS[amount.unit];
  return Number.isFinite(factor) ? amount.perServing * factor : null;
}

/** Round the way somebody reads a portion, not the way a scale does. */
export function servingsToMatch(foodMg, dose) {
  if (!foodMg || !dose || dose.unreadable || foodMg <= 0) return null;
  const n = (mg) => mg / foodMg;
  const tidy = (x) => (x >= 10 ? Math.round(x) : Math.round(x * 2) / 2);
  const lo = tidy(n(dose.lo));
  const hi = tidy(n(dose.hi));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { lo, hi };
}

/** "178 mg", "1.7 g", "192 mcg" — the unit the number reads best in. */
export function formatMg(mg) {
  if (!Number.isFinite(mg)) return null;
  if (mg >= 1000) return `${Number((mg / 1000).toPrecision(3))} g`;
  if (mg < 1) return `${Number((mg * 1000).toPrecision(3))} mcg`;
  return `${Number(mg.toPrecision(3))} mg`;
}

/**
 * The whole comparison for one food and one nutrient, or null.
 *
 * `servings` is absent whenever the ratio would have required an assumption
 * nobody stated — a dose that says "per label", or an IU figure for a vitamin
 * whose IU conversion depends on which form is in the bottle.
 */
export function compare({ amount, doseText, nutrient }) {
  const foodMg = amountInMg(amount);
  if (foodMg === null) return null;
  const dose = doseText ? parseDose(doseText, nutrient) : null;
  const out = { food: formatMg(foodMg), foodMg };
  if (!dose) return out;
  if (dose.unreadable) return { ...out, doseText, unreadable: dose.unreadable };
  out.dose = dose.lo === dose.hi
    ? formatMg(dose.lo)
    : `${formatMg(dose.lo)}–${formatMg(dose.hi)}`.replace(/ (mg|g|mcg)–/, '–');
  if (dose.converted) out.converted = dose.converted;
  const servings = servingsToMatch(foodMg, dose);
  if (servings) out.servings = servings;
  return out;
}
