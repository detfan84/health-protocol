// ledger.js — what the body has actually had, so the composer can deal what it
// has not.
//
// FRAMEWORK, coverage law: "Regions and muscles rotate by recency and weight;
// the promise is everything touched within its window, not everything daily."
//
// So this answers one question, and it is a question about absence: given what
// was checked off over the last N days, WHAT HAS NOT BEEN TOUCHED. Everything
// the composer does downstream is a consequence of that list.
//
// Four rules, each of them a way of not lying about coverage:
//
//   1. COMPUTED, never stored. FRAMEWORK's data list says so outright —
//      "streaks/coverage: computed views, never stored counters." A stored
//      counter drifts from the records it summarises, and then two places
//      disagree about the same week with no way to tell which one is wrong.
//
//   2. CHECKS, not plans. A day record is what happened. An item that sat on
//      the screen untouched all day contributed nothing, and the ledger must
//      not quietly credit it.
//
//   3. SYSTEMIC EFFECTS ARE NOT COVERAGE. This is the whole reason `counts`
//      exists in the effect vocabulary (facets.json, settled 29 Aug): a rope
//      session tags the calves, and counting that as coverage OF the calves
//      would let the pairing law believe a debt was paid that was not. What an
//      effect touches and what it covers are different questions.
//
//   4. IT REPORTS WHAT IT COULD NOT ATTRIBUTE. 21 practices carry no resolved
//      anatomy, so a session made only of those yields an empty ledger — which
//      reads exactly like "you did nothing" while actually meaning "nobody
//      tagged these yet". Two different facts (D24), and `unattributed` is what
//      keeps them apart.

import { localDateKey } from '../../lib/core.js';

// Mirrors the `counts` field on every effect value in
// src/content/vocab/facets.json. It lives here as a constant because the
// vocabulary file is not shipped to the browser — and a test asserts the two
// agree, so a change to the vocabulary breaks the build rather than silently
// changing what coverage means.
export const EFFECT_COUNTS = {
  release: 'perTarget',
  lengthen: 'perTarget',
  load: 'perTarget',
  activate: 'perTarget',
  mobilise: 'perTarget',
  control: 'perTarget',
  calm: 'systemic',
  circulate: 'systemic',
  condition: 'systemic',
};

/** Every moment behind a check — a repeatable item is a list, a plain one is one. */
function momentsOf(check) {
  if (!check) return [];
  if (Array.isArray(check.ats) && check.ats.length) return check.ats;
  return check.at ? [check.at] : [];
}

/**
 * The anatomy this item covers.
 *
 * `target` is the resolved node-id list the catalogue build produces by folding
 * the free-text `muscles` and `regions` through anatomy-foldin.json. The prose
 * fields are kept alongside for reading; this is the one that joins.
 */
export function nodesOf(item) {
  return [...new Set(item?.target ?? [])];
}

/**
 * The coverage ledger for a window ending today.
 *
 * @param days       day records — { date, checks: { itemId: { at, ats? } } }
 * @param itemsById  the catalogue, keyed by id
 * @param now        the moment "today" means
 * @param windowDays the coverage window; 7 is the week the law talks about
 */
export function buildLedger({ days = [], itemsById = {}, now = new Date(), windowDays = 7 } = {}) {
  const todayKey = localDateKey(now);
  const from = new Date(now);
  from.setDate(from.getDate() - (windowDays - 1));
  const fromKey = localDateKey(from);

  const nodes = {};
  const effects = {};
  let checks = 0;
  let unattributed = 0;
  const unattributedItems = new Set();

  const touch = (nodeId, effect, at) => {
    const node = nodes[nodeId] ?? (nodes[nodeId] = { total: 0, lastAt: null, byEffect: {} });
    node.total += 1;
    if (!node.lastAt || at > node.lastAt) node.lastAt = at;
    const slot = node.byEffect[effect] ?? (node.byEffect[effect] = { count: 0, lastAt: null });
    slot.count += 1;
    if (!slot.lastAt || at > slot.lastAt) slot.lastAt = at;
  };

  for (const day of days) {
    if (!day?.date || day.date < fromKey || day.date > todayKey) continue;
    for (const [itemId, check] of Object.entries(day.checks ?? {})) {
      const item = itemsById[itemId];
      for (const at of momentsOf(check)) {
        checks += 1;
        const where = nodesOf(item);
        const what = item?.effect ?? [];
        if (!item || !what.length) {
          unattributed += 1;
          unattributedItems.add(itemId);
          continue;
        }
        // A systemic effect happened, and is recorded as having happened. It
        // never becomes coverage of a body part.
        let covered = false;
        for (const effect of what) {
          const bucket = effects[effect] ?? (effects[effect] = { count: 0, nodes: new Set() });
          bucket.count += 1;
          if (EFFECT_COUNTS[effect] !== 'perTarget') continue;
          for (const nodeId of where) {
            bucket.nodes.add(nodeId);
            touch(nodeId, effect, at);
            covered = true;
          }
        }
        // Tagged, done, and it still paid nothing into any anatomy account —
        // either it has no resolved target or everything it does is systemic.
        if (!covered) unattributedItems.add(itemId);
      }
    }
  }

  return {
    window: { days: windowDays, from: fromKey, to: todayKey },
    nodes,
    effects: Object.fromEntries(Object.entries(effects)
      .map(([k, v]) => [k, { count: v.count, nodes: v.nodes.size, counts: EFFECT_COUNTS[k] ?? null }])),
    checks,
    unattributed,
    unattributedItems: [...unattributedItems],
  };
}

/**
 * What the window has not covered, staleness first.
 *
 * `known` is the anatomy the catalogue can actually reach. Asking for coverage
 * of a node no item touches is asking for a debt nobody can pay, and it would
 * sit at the top of this list forever.
 */
export function staleNodes({ ledger, known = [], now = new Date() } = {}) {
  const nowMs = now.getTime();
  const out = known.map((id) => {
    const seen = ledger?.nodes?.[id];
    const lastAt = seen?.lastAt ?? null;
    const daysSince = lastAt
      ? Math.floor((nowMs - new Date(lastAt).getTime()) / 86400000)
      : null;
    return { id, lastAt, daysSince, total: seen?.total ?? 0 };
  });
  // Never-touched first — a node with no history is the emptiest account there
  // is — then longest-since, then least-often.
  out.sort((a, b) => {
    if ((a.lastAt === null) !== (b.lastAt === null)) return a.lastAt === null ? -1 : 1;
    if (a.lastAt !== null && a.daysSince !== b.daysSince) return b.daysSince - a.daysSince;
    if (a.total !== b.total) return a.total - b.total;
    return a.id.localeCompare(b.id);
  });
  return out;
}

/**
 * The anatomy the catalogue can actually reach, so coverage is a payable debt.
 *
 * Only items whose effect can cover something count here — a node reachable
 * exclusively by systemic work is not reachable for coverage purposes.
 */
export function reachableNodes(items = []) {
  const out = new Set();
  for (const item of items) {
    if (!(item?.effect ?? []).some((e) => EFFECT_COUNTS[e] === 'perTarget')) continue;
    for (const id of nodesOf(item)) out.add(id);
  }
  return [...out];
}
