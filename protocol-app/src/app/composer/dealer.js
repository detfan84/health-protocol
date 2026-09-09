// dealer.js — the composer. It deals a day and writes nothing else.
//
// FRAMEWORK: "One runtime composer — two inputs. v1 composer scope: ARITHMETIC,
// NOT AI. Day templates per dial, weighted rotation, swap groups, and the laws
// as hard constraints. There is no second composition engine anywhere in the
// system."
//
// WHAT IT DOES NOT TOUCH: the anchors. Law 4 — "rhythm before variety: anchors
// stay stable; variety lives in the main block and snacks." The wake, rise,
// evening and bed blocks are the same few minutes every day on purpose, which
// is exactly why they could ship before this existed. The dealer fills part 3
// (the main session) and part 4's movement snacks. Nothing else.
//
// Two honest limits, both of them the catalogue's rather than the design's, and
// both reported by `gaps` on every deal rather than papered over:
//
//   1. THE DIAL IS SPECIFIED IN MINUTES AND THE CATALOGUE CANNOT ANSWER IN
//      MINUTES. 14 of 601 items say how long they take. So a slot budget is a
//      COUNT, not a duration. Estimating "a squat takes 45 seconds" across 587
//      items to make the arithmetic look right would be the invented-number
//      failure this project keeps naming — a made-up figure is worse than a
//      coarser honest one. Budgets become minutes when the content does.
//
//   2. THERE IS NO `snack` FACET. The opportunity layer's real mechanism is
//      `demands` versus a moment's `occupies` (TAXONOMY §6) and `demands` is
//      authored on 2 of 343 practices. Until it is filled, snacks are picked by
//      a stated proxy — needs no equipment — and `gaps` says so.

import { EFFECT_COUNTS, nodesOf } from './ledger.js';
import { weightOf, sideOf, BASELINE } from './findings.js';
import { estimateFor } from '../../lib/estimates.js';
import { paceOf } from '../../lib/durations.js';

/**
 * The dial's count budgets — now the FALLBACK, for anybody who has never set
 * their time. Kevin's 9 Sep redirect replaced tiers with one number the person
 * chooses; the dealer fills minutes when it is given minutes (see dealDay's
 * `minutes`) and falls back to these counts when it is not.
 */
export const DIALS = {
  light: { session: 2, snacks: 2 },
  standard: { session: 4, snacks: 3 },
  deep: { session: 6, snacks: 3 },
};

/**
 * What an item costs in minutes, in order of trust:
 *
 *   1. YOUR OWN RECORDED PACE — the median of what it has actually taken you,
 *      from the session clock and typed times. Kevin, 9 Sep: "if we find that
 *      I'm taking twice as much time… route according to the updated time,
 *      because otherwise things that I should be doing are being left undone."
 *      A measured you beats an authored anybody. Wall-clock, so no side
 *      doubling — both sides are already inside the number.
 *   2. The authored time on the card.
 *   3. The estimates layer.
 *   4. Sixty seconds, the last resort.
 *
 * The scaffolding comes down on its own: every session you run replaces a
 * guess about you with a fact about you, and the very next deal budgets by it.
 */
export function minutesOf(item, history = null) {
  const pace = history ? paceOf(history, item.id) : { times: 0 };
  if (pace.times) return pace.typical / 60;
  const authored = Number.isFinite(item.amount?.seconds) ? item.amount.seconds : null;
  const est = authored === null ? estimateFor(item)?.seconds : null;
  const seconds = authored ?? est ?? 60;
  const mult = (item.amount?.perSide || (authored === null && estimateFor(item)?.perSide)) && item.sides !== false ? 2 : 1;
  return (seconds * mult) / 60;
}

/**
 * What switching costs. An estimated 90-second release is not 90 seconds of a
 * person's session — they read the card, get on the floor, find the spot, get
 * back up. Without this a 26-minute budget dealt SEVENTEEN items, which is a
 * scramble, not a session. Three-quarters of a minute per item is a stated
 * assumption like every number in estimates.js — argue with it there.
 */
export const PER_ITEM_OVERHEAD_MINUTES = 0.75;

// The evening deals downshift and opening, never loading — FRAMEWORK's part 5:
// deep release, "the melt-into-the-floor response is the body's signal that
// it's safe to downshift", then breath. A kettlebell snatch at 21:30 is a
// different app.
const EVENING_EFFECTS = new Set(['release', 'lengthen', 'calm', 'circulate', 'mobilise']);

const OPENS = new Set(['release', 'lengthen']);
const LOADS = new Set(['load', 'activate']);

/** Deterministic per date: opening the app twice must not reshuffle the day. */
function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rngFrom(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Every ancestor of a node, so "the region" can be reasoned about. */
export function ancestorsOf(anatomy, id, seen = new Set()) {
  const node = anatomy?.[id];
  for (const parent of node?.parents ?? []) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    ancestorsOf(anatomy, parent, seen);
  }
  return seen;
}

const opens = (item) => (item.effect ?? []).some((e) => OPENS.has(e));
const loads = (item) => (item.effect ?? []).some((e) => LOADS.has(e));

/**
 * Does `loader` load the region `openedNode` belongs to?
 *
 * Law 1 says the session that opens a REGION ends by loading it — the region,
 * not the exact muscle. Resolving up the anatomy tree is what makes the law
 * satisfiable: 31 muscles have a release item and no loading item of their own,
 * and every one of them pairs once you look at the region it belongs to.
 */
export function pairsWith(anatomy, loader, openedNode) {
  if (!loads(loader)) return false;
  const up = ancestorsOf(anatomy, openedNode);
  for (const t of nodesOf(loader)) {
    if (t === openedNode) return true;              // the same thing
    if (up.has(t)) return true;                     // a region containing it
    if (ancestorsOf(anatomy, t).has(openedNode)) return true; // a part of it
  }
  // Deliberately NOT siblings. Sharing an ancestor would let a calf loader
  // "pair" a hamstring release because both hang off the leg, which satisfies
  // the letter of law 1 while doing none of what the law is for. Under the
  // strict reading exactly two release nodes in the catalogue have no partner —
  // thoracic-spine and thenar — and those are content gaps worth seeing rather
  // than a rule worth loosening.
  return false;
}

/**
 * How badly each candidate is wanted, and why in a sentence.
 *
 * Coverage law: "regions and muscles rotate by RECENCY and WEIGHT." Those are
 * the two terms, multiplied — a muscle you reported and have not worked beats
 * one you reported and did yesterday, and both beat one nobody has mentioned.
 */
export function scoreCandidates({ items = [], ledger, weights = {}, preferences = {}, windowDays = 7 } = {}) {
  const out = [];
  for (const item of items) {
    const nodes = nodesOf(item);
    if (!nodes.length) continue;
    if (!(item.effect ?? []).some((e) => EFFECT_COUNTS[e] === 'perTarget')) continue;

    let best = 0;
    let bestNode = null;
    let bestDays = null;
    for (const node of nodes) {
      const seen = ledger?.nodes?.[node];
      // Never touched inside the window is the emptiest account there is, and
      // scores as if it had been waiting the whole window plus a day.
      const days = seen?.lastAt
        ? Math.max(0, Math.floor((Date.parse(ledger.window.to + 'T23:59:59Z') - Date.parse(seen.lastAt)) / 86400000))
        : windowDays + 1;
      const score = (days + 1) * weightOf(weights, node);
      if (score > best) { best = score; bestNode = node; bestDays = seen?.lastAt ? days : null; }
    }

    // "Deal this less" — a preference, never a ban. Said once it halves; said
    // repeatedly it fades. It can never reach zero, because a thing you dislike
    // that your body needs is exactly what the medicine drop is for.
    const disliked = preferences[item.id] ?? 0;
    const score = best / (1 + disliked);

    const reported = weightOf(weights, bestNode) > BASELINE;
    // The side travels with the why, when every report agreed on one. Items are
    // not left/right specific, so this cannot steer WHICH card is dealt — what
    // it does is tell the person which hip to pay attention to while they work.
    const side = reported ? sideOf(weights, bestNode) : null;
    const label = side ? `${bestNode} (${side} side)` : bestNode;
    const why = bestDays === null
      ? `${label} has not been worked this week`
      : `${label} was last worked ${bestDays === 0 ? 'today' : `${bestDays} day${bestDays === 1 ? '' : 's'} ago`}`;

    out.push({
      item,
      score,
      node: bestNode,
      why: reported ? `${why}, and you reported it` : why,
      reported,
      disliked,
    });
  }
  return out.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
}

/**
 * Deal one day.
 *
 * Writes nothing. Given the same date and the same living state it returns the
 * same day, because a day that reshuffles when you reopen the app is not a plan.
 */
export function dealDay({
  items = [],
  anatomy = {},
  ledger,
  weights = {},
  preferences = {},
  dial = 'standard',
  date,
  windowDays = 7,
  equipment = null,
  // Minute budgets, when the person has set their time (timeplan.js). Given
  // these, the dealer fills to minutes with estimated durations; without them
  // it falls back to the dial's counts. `evening` deals a wind-down block.
  minutes = null,
  // Recent day records, keyed by date — the source of the person's own
  // recorded pace, which outranks every estimate (minutesOf).
  history = null,
} = {}) {
  const budget = DIALS[dial] ?? DIALS.standard;
  const sessionMinutes = Number.isFinite(minutes?.session) ? minutes.session : null;
  const eveningMinutes = Number.isFinite(minutes?.evening) ? minutes.evening : null;
  const rng = rngFrom(seedFrom(String(date ?? '')));
  // Rotation needs a tie-break, and it has to be stable within a day and
  // different between days. Without one, a flat ledger — nothing done yet, every
  // account equally empty — deals the same session every morning, which is the
  // complaint this whole build exists to answer.
  const jitter = (id) => seedFrom(`${date}|${id}`) / 4294967296;

  // Anchors are not the dealer's business (law 4).
  //
  // Equipment: `null` means nobody has said what they have, which is NOT the
  // same as having nothing (D24) — so nothing is filtered until somebody
  // answers. Once they have, work needing kit they do not own is not dealt,
  // because an undoable item in a five-item session is a fifth of the day gone.
  const owns = equipment === null ? null : new Set([...equipment, 'none']);
  const usable = (i) => owns === null || (i.equipment ?? []).every((e) => owns.has(e));
  const pool = items.filter((i) => i.type === 'practice'
    && !String(i.id).startsWith('arc-')
    && usable(i));
  const ranked = scoreCandidates({ items: pool, ledger, weights, preferences, windowDays })
    .sort((a, b) => {
      const d = Math.round(b.score * 1000) - Math.round(a.score * 1000);
      return d || jitter(a.item.id) - jitter(b.item.id);
    });

  const chosen = [];
  const takenIds = new Set();
  const coveredNodes = new Set();
  const notes = [];

  const take = (cand, why) => {
    if (!cand || takenIds.has(cand.item.id)) return false;
    takenIds.add(cand.item.id);
    for (const n of nodesOf(cand.item)) coveredNodes.add(n);
    chosen.push({ ...cand, why: why ?? cand.why });
    return true;
  };

  // ---- the session -------------------------------------------------------
  // Highest need first, and one region at a time: two releases on the same
  // muscle is not a session, it is a repetition.
  //
  // With a minute budget, fill until the estimated minutes reach it — the last
  // item may run slightly over, which beats stopping a session at 80% of what
  // was asked for. Without one, the dial's count.
  let sessionCost = 0;
  for (const cand of ranked) {
    if (sessionMinutes !== null) {
      if (sessionCost >= sessionMinutes) break;
    } else if (chosen.length >= budget.session) break;
    if (coveredNodes.has(cand.node) && chosen.length) continue;
    if (take(cand)) sessionCost += minutesOf(cand.item, history) + PER_ITEM_OVERHEAD_MINUTES;
  }

  // ---- law 1, the hard one ----------------------------------------------
  // "Release is never scheduled alone; the session that opens a region ends by
  // loading it." Enforced after selection rather than during, because whether a
  // release is alone is a fact about the whole session.
  const unpaired = [];
  for (const picked of [...chosen]) {
    if (!opens(picked.item)) continue;
    const already = chosen.some((c) => c.item.id !== picked.item.id && pairsWith(anatomy, c.item, picked.node));
    if (already) continue;
    const partner = ranked.find((c) => !takenIds.has(c.item.id) && pairsWith(anatomy, c.item, picked.node));
    if (partner) {
      take(partner, `loads ${picked.node} after opening it — the pairing law`);
      // A hard law outranks a soft budget. FRAMEWORK calls the pairing law hard
      // and the dial a budget to fill, so the partner goes in even when the slot
      // is full — and the day says so rather than quietly running long.
      if (chosen.length > budget.session) {
        notes.push(`over the ${dial} budget by ${chosen.length - budget.session}: the pairing law is hard and the budget is not`);
      }
    } else {
      unpaired.push(picked);
    }
  }
  // A release with no loading partner anywhere in the catalogue does not get
  // dealt. The law is hard, and dealing half of it is worse than dealing none.
  for (const orphan of unpaired) {
    const at = chosen.findIndex((c) => c.item.id === orphan.item.id);
    if (at >= 0) chosen.splice(at, 1);
    takenIds.delete(orphan.item.id);
    notes.push(`${orphan.item.id} was dropped: nothing in the catalogue loads ${orphan.node}`);
  }

  // ---- law 9, the medicine drop -----------------------------------------
  // "Periodically the composer deals one avoided-but-needed item; one honest tap
  // skips it, and it returns." ~1–2×/week, deterministic from the date so it
  // does not depend on how many times the screen was opened.
  let medicine = null;
  if (rng() < 2 / 7) {
    medicine = ranked.find((c) => !takenIds.has(c.item.id) && c.disliked > 0)
      ?? ranked.find((c) => !takenIds.has(c.item.id) && c.reported) ?? null;
    if (medicine) {
      medicine = { ...medicine, why: 'you have been skipping this one, and it is still owed', medicineDrop: true };
      takenIds.add(medicine.item.id);
    }
  }

  // ---- the snacks --------------------------------------------------------
  // The stated proxy, until `demands` is authored. Equipment-free, so it can
  // happen wherever the person already is.
  const snacks = [];
  const snackPool = ranked.filter((c) => !takenIds.has(c.item.id)
    && !(c.item.equipment ?? []).length
    && !opens(c.item));
  for (const cand of snackPool) {
    if (snacks.length >= budget.snacks) break;
    takenIds.add(cand.item.id);
    snacks.push(cand);
  }

  // ---- the evening -------------------------------------------------------
  // Dealt only when elected with minutes. Downshift and opening exclusively,
  // and never something already dealt this morning — the evening is where the
  // day's tension gets released, not a second copy of the session.
  const evening = [];
  if (eveningMinutes !== null && eveningMinutes > 0) {
    let cost = 0;
    for (const cand of ranked) {
      if (cost >= eveningMinutes) break;
      if (takenIds.has(cand.item.id)) continue;
      if (!(cand.item.effect ?? []).every((e) => EVENING_EFFECTS.has(e))) continue;
      takenIds.add(cand.item.id);
      evening.push({ ...cand, why: `${cand.why} — released before sleep, where today landed` });
      cost += minutesOf(cand.item, history) + PER_ITEM_OVERHEAD_MINUTES;
    }
  }

  return {
    date,
    dial,
    session: chosen,
    snacks,
    evening,
    medicine,
    notes,
    gaps: {
      // Reported every deal, so a thin catalogue is visible rather than felt.
      budgetIsCount: 'the dial is specified in minutes; 14 of 601 items say how long they take, so slots are budgeted by count',
      snacksAreProxy: 'snacks are picked as equipment-free items; the real mechanism is `demands` vs a moment\'s `occupies`, authored on 2 of 343 practices',
      candidates: ranked.length,
      ...(history && (sessionMinutes !== null || eveningMinutes !== null) ? {
        pacedItems: [...chosen, ...evening].filter((c) => paceOf(history, c.item.id).times > 0).length,
      } : {}),
      ...(owns === null ? { equipmentUnknown: 'nobody has said what equipment they have, so nothing was filtered out' } : {}),
    },
  };
}
