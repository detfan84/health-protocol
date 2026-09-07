// offers.js — affiliate links, on the reorder state and nowhere else.
//
// Kevin, 30 Aug: "what might be nice is to do affiliate links to amazon, rho,
// or other products to maybe make some money that way." Parked behind the
// composer on 31 Aug; the composer shipped, so here it is.
//
// The placement rule, on record since the handoff and load-bearing: THE MONEY
// FOLLOWS A DECISION ALREADY MADE. A reorder link appears when somebody's own
// count says they are running out of a thing they already take. It never
// appears on the education — not on the shelf browse, not on a food card, not
// in a nutrient note, not in Learn. An app that recommends nothing (rule 1 of
// the whole tab) cannot have its education pages earning commission on what
// they teach, and a test enforces the boundary.
//
// CONFIGURATION IS THE OFF SWITCH. Ship state: both ids empty, every link
// dormant, zero rendered anywhere. Kevin drops his tags in the block below and
// the mechanism wakes. Nothing else to wire.

export const AFFILIATE = {
  // Amazon Associates tag, e.g. 'shoesofpeace-20'. Empty = no Amazon links.
  amazonTag: '',
  // Rho (or another retailer) referral code. Empty = no Rho links. The URL
  // shape is a guess pending a real code — fix buildRhoUrl when it arrives.
  rhoCode: '',
};

let overrides = null;
/** Tests flip the config without editing the shipped constant. */
export function _setAffiliateForTests(cfg) { overrides = cfg; }
const config = () => overrides ?? AFFILIATE;

/**
 * Running out is the reorder state: a tracked count that covers a week or
 * less. "A week" is a judgement — long enough to reorder before it matters,
 * short enough that the link only shows when the decision is genuinely near.
 */
export const LOW_DOSES = 7;

export function isReorderState(supply) {
  if (!supply || !Number.isFinite(supply.count)) return false;
  if (!Number.isFinite(supply.unitsPerDose) || supply.unitsPerDose <= 0) return false;
  return Math.floor(supply.count / supply.unitsPerDose) <= LOW_DOSES;
}

function buildAmazonUrl(item, tag) {
  const q = encodeURIComponent(item.substance && item.substance.length < 40 ? item.substance : item.name);
  return `https://www.amazon.com/s?k=${q}&tag=${encodeURIComponent(tag)}`;
}

/**
 * The offer for one item in one supply state, or null.
 *
 * Null is the common case and the safe one: unconfigured, untracked, not an
 * intake, or simply not running low — all null, no link, nothing rendered.
 */
export function offerFor(item, supply) {
  const cfg = config();
  if (!item || item.type !== 'intake' || item.intakeKind === 'food') return null;
  if (!isReorderState(supply)) return null;
  if (cfg.amazonTag) {
    return {
      label: `Reorder ${item.name}`,
      url: buildAmazonUrl(item, cfg.amazonTag),
      rel: 'sponsored noopener',
      disclosure: 'Reorder links can earn this app a commission. The price does not change.',
    };
  }
  return null; // Rho waits on a real code and a real URL shape.
}
