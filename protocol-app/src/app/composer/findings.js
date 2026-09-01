// findings.js — what the body reported about itself, and what that is worth now.
//
// D42 (roadmap 42, as amended by R25). The shape, in Kevin's ruling:
//
//   Check-off alone is always complete — one tap stays the whole ask. The
//   difficulty rating is optional, 1–5, and only a 4–5 asks one follow-up
//   naming the limiting factor:
//
//     muscle gave out    → a finding. That muscle's weight goes up, and paired
//                          strengthening rides along per the pairing law.
//     ran out of steam   → a system limit. Timestamps the exertion for trends
//                          and the 48-hour look-back. NO muscle arithmetic.
//     it gave way        → a joint event (law 10). NO arithmetic.
//
//   Skipped follow-up is recorded without arithmetic; the app may ask once more
//   when the item next comes up.
//
// R25 is why the third chip reads "it gave way" and not "pain or joint". Pain
// is the daily baseline for the people this is built for, so a chip routing
// pain to a stop-and-evaluate card would fire on ordinary sessions and
// manufacture exactly the warning fatigue that ruling exists to prevent. A
// joint leaving position is an EVENT REPORT, not a judgement about how much
// something hurt, and it is the one thing law 10 genuinely needs to hear.
//
// Two rules that are easy to break and expensive to break:
//
//   · DIFFICULTY IS NOT HELPFULNESS. The not-helpful signal shares the same
//     optional sheet and means only "deal this less, promote its siblings".
//     It never touches a muscle weight. Easy-and-useless exists.
//
//   · TAP ARITHMETIC IS UNIFORM FOR EVERYONE. The pacing profile governs dial
//     defaults and copy (D28), never tap math. There is one set of numbers
//     below and it applies to every person using the app.
//
// The store holds events; weights are computed. See the schema rung 4 note.

import { newId, nowIso } from '../../lib/core.js';

/** Baseline. A node nobody has reported anything about sits exactly here. */
export const BASELINE = 1;

// ---------------------------------------------------------------------------
// The numbers.
//
// NONE OF THESE ARE IN THE SPEC. The rulings settle which taps exist and what
// each one may touch; they do not settle by how much. These are chosen
// defaults, gathered in one place so they can be argued with as a set rather
// than hunted for in the arithmetic.
// ---------------------------------------------------------------------------

/** One report moves a node half a step. Two say it clearly; one is a maybe. */
export const STEP = 0.5;

/** A ceiling, so a bad fortnight cannot make one muscle own every session. */
export const MAX_WEIGHT = 3;

/** And a floor, because "eased up" should never argue a node out of existence. */
export const MIN_WEIGHT = 0.25;

/**
 * How long a report keeps half its force.
 *
 * FRAMEWORK asks for "decaying weights" and gives no rate. Twenty-one days
 * means a discovery still leads three weeks later and is most of the way home
 * after two months — which is the stated intent, "so last month's discovery
 * doesn't rule forever", without discarding something reported a fortnight ago.
 */
export const HALF_LIFE_DAYS = 21;

/** An explicit "eased up" is worth more than time passing, and lands sooner. */
export const EASED_STEP = 0.5;

const DAY_MS = 86400000;

/**
 * The taps, and the one thing each is allowed to touch.
 *
 * `weighs` is the whole safety property of this file: a kind with `weighs:
 * false` can never move a muscle weight no matter what else it carries. The one
 * bad misroute D42 names by name is coding pain as "weak muscle, load it more",
 * and this table is where that is prevented rather than remembered.
 */
export const KINDS = {
  'hot-spot': { weighs: true, direction: 'up', scope: 'node' },
  'eased-up': { weighs: true, direction: 'toward-baseline', scope: 'node' },
  'muscle-gave-out': { weighs: true, direction: 'up', scope: 'node', pairsLoad: true },
  'ran-out-of-steam': { weighs: false, scope: 'system' },
  'gave-way': { weighs: false, scope: 'joint' },
  'follow-up-skipped': { weighs: false, scope: 'none' },
  'rating': { weighs: false, scope: 'item' },
  'not-helpful': { weighs: false, scope: 'item' },
};

/** Where a finding came from, for the focus list's one-line why (D41). */
export const SOURCES = ['reported', 'quiz-seed', 'template', 'retest'];

/**
 * One tap, as a record. Nothing here computes — an event is what happened.
 *
 * @param kind   one of KINDS
 * @param nodes  anatomy node ids this concerns (empty for item/system scope)
 * @param source provenance; defaults to the person having reported it
 */
export function makeEvent({ kind, nodes = [], itemId, rating, source = 'reported', at, note, side } = {}) {
  if (!KINDS[kind]) throw new Error(`unknown finding kind: ${kind}`);
  if (source && !SOURCES.includes(source)) throw new Error(`unknown finding source: ${source}`);
  // Sided, when the person said so (Kevin, 1 Sep: "findings need to be sided" —
  // his own pattern is a right hip and a right shoulder, and a finding that
  // cannot say which side flattens exactly the information he is reporting).
  // Absent means the whole of it, or that nobody said — not "both", which would
  // be an invented answer (D24).
  if (side !== undefined && side !== 'left' && side !== 'right') {
    throw new Error(`a side is left or right, not "${side}" — omit it for unsided`);
  }
  const rec = {
    id: newId(),
    kind,
    source,
    at: at ?? nowIso(),
    updatedAt: nowIso(),
  };
  // Absent means nobody said, which is not the same as empty (D24).
  if (nodes.length) rec.nodes = [...new Set(nodes)];
  if (itemId) rec.itemId = String(itemId);
  if (Number.isFinite(rating)) rec.rating = rating;
  if (note) rec.note = String(note);
  if (side) rec.side = side;
  return rec;
}

/**
 * The follow-up a rating earns, or none.
 *
 * "Check-off alone is always complete." A rating is optional on top of that,
 * and only a 4–5 asks anything further — one question, three answers.
 */
export function followUpFor(rating) {
  if (!Number.isFinite(rating) || rating < 4) return null;
  return {
    question: 'What stopped you?',
    options: [
      { kind: 'muscle-gave-out', label: 'The muscle gave out' },
      { kind: 'ran-out-of-steam', label: 'I ran out of steam' },
      { kind: 'gave-way', label: 'It gave way or felt unstable' },
    ],
  };
}

/** How much force a report still has, `days` after it was made. */
export function remainingForce(days) {
  if (!(days > 0)) return 1;
  return 0.5 ** (days / HALF_LIFE_DAYS);
}

const clamp = (w) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w));

/**
 * The weight table: every node anybody has reported anything about, and what
 * that is worth today.
 *
 * Events are applied oldest first, because "eased up" means "less than it was"
 * and cannot be evaluated out of order. Each node's entry keeps the events that
 * built it, so the focus list can say why a node is on it and who said so.
 */
export function weighFindings({ events = [], now = new Date() } = {}) {
  const ordered = [...events]
    .filter((e) => KINDS[e?.kind]?.weighs && (e.nodes ?? []).length)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));

  const nodes = {};
  for (const event of ordered) {
    const age = (now.getTime() - new Date(event.at).getTime()) / DAY_MS;
    const force = remainingForce(age);
    for (const node of event.nodes) {
      const entry = nodes[node] ?? (nodes[node] = {
        node, weight: BASELINE, sources: new Set(), events: [], pairedLoad: false,
        sidedForce: { left: 0, right: 0, unsided: 0 },
      });
      const spec = KINDS[event.kind];
      entry.sidedForce[event.side ?? 'unsided'] += force;
      if (spec.direction === 'up') {
        entry.weight = clamp(entry.weight + STEP * force);
        if (spec.pairsLoad) entry.pairedLoad = true;
      } else {
        // Toward baseline, never past it — "eased up" is a correction, not a
        // vote that a muscle matters less than one nobody has mentioned.
        const gap = entry.weight - BASELINE;
        const move = Math.sign(gap) * Math.min(Math.abs(gap), EASED_STEP * force);
        entry.weight = clamp(entry.weight - move);
      }
      entry.sources.add(event.source);
      entry.events.push(event.id);
    }
  }

  return Object.fromEntries(Object.entries(nodes).map(([id, e]) => [id, {
    node: e.node,
    weight: Number(e.weight.toFixed(3)),
    // The pairing law's hook: a muscle that gave out gets its strengthening
    // dealt alongside the release, rather than a release on its own.
    pairedLoad: e.pairedLoad,
    sources: [...e.sources],
    events: e.events,
    // Which side the reports point at — see sideOf for the strict reading.
    sidedForce: {
      left: Number(e.sidedForce.left.toFixed(3)),
      right: Number(e.sidedForce.right.toFixed(3)),
      unsided: Number(e.sidedForce.unsided.toFixed(3)),
    },
  }]));
}

/** A node's weight, or baseline when nobody has said anything about it. */
export function weightOf(table, node) {
  return table?.[node]?.weight ?? BASELINE;
}

/**
 * Which side a node's reports point at — 'left', 'right', or null.
 *
 * Strict on purpose: a side is claimed only when EVERY report on the node names
 * that one side. One unsided report, or one from the other side, and the answer
 * is null — the whole node, no adjective. Items are not left/right specific
 * yet, so the side cannot steer the deal; what it can do honestly is travel
 * with the WHY, so a card says "you reported it — right side" and the person
 * knows which hip to pay attention to while they work.
 */
export function sideOf(table, node) {
  const f = table?.[node]?.sidedForce;
  if (!f) return null;
  if (f.left > 0 && f.right === 0 && f.unsided === 0) return 'left';
  if (f.right > 0 && f.left === 0 && f.unsided === 0) return 'right';
  return null;
}

/**
 * Items the person has told us to deal less often.
 *
 * Item-level and item-level only — this is the signal that must never reach a
 * muscle weight. Returns a count per item, so the composer can lean rather than
 * ban: a thing said once is a preference, not a prohibition.
 */
export function itemPreferences({ events = [] } = {}) {
  const out = {};
  for (const e of events) {
    if (e?.kind !== 'not-helpful' || !e.itemId) continue;
    out[e.itemId] = (out[e.itemId] ?? 0) + 1;
  }
  return out;
}

/**
 * Exertion timestamps — the 48-hour look-back instrument (D28).
 *
 * "Ran out of steam" is a system limit and produces no muscle arithmetic at
 * all. What it produces is this: a list of when the person hit a ceiling, which
 * is what makes a delayed pattern visible to somebody looking for one.
 */
export function exertionMarks({ events = [], now = new Date(), hours = 48 } = {}) {
  const since = now.getTime() - hours * 3600000;
  return events
    .filter((e) => e?.kind === 'ran-out-of-steam' && new Date(e.at).getTime() >= since)
    .map((e) => ({ at: e.at, itemId: e.itemId ?? null }))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** Joint events, which law 10 wants to hear about and nothing else acts on. */
export function jointEvents({ events = [] } = {}) {
  return events.filter((e) => e?.kind === 'gave-way')
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
