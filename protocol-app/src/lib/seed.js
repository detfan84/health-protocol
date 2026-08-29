// seed.js — which shipped protocols a device should be handed, and which of the
// ones it already holds should be brought up to date.
//
// The bug this exists to end (Kevin, 29 Aug: "stuff I thought we had worked on
// that hasn't changed"):
//
//   device says applied version : a366b1dba3d1
//   file  says version          : a366b1dba3d1      ← the same
//   device holds block named    : "While the kettle boils"     ← the old name
//   file  holds block named     : "While you’re already up"    ← the new one
//
// `protocolsToOffer` filtered on `!have.has(p.id)`, so a protocol the device
// already held was never a candidate for anything. New PROTOCOLS arrived; a
// revision to an existing one could not. And the version was stamped as
// applied regardless, so the record asserted that content had landed which
// never had — the one thing that would have made this visible.
//
// It is the shipping lesson one layer further in. Content that does not ship
// does not exist; content that ships and cannot reach an installed app does
// not exist either, and this one had a receipt saying otherwise.
//
// The rule, in one line: **replace what the app gave you and you have not
// touched; never replace what you have made your own.**

const STAMPS = ['createdAt', 'updatedAt', 'exportedAt', 'seedVersion'];

/**
 * The same value with timestamps removed and keys in a fixed order.
 *
 * Ordering matters because this is hashed. `JSON.stringify` follows insertion
 * order, and a record that has been through IndexedDB and back is not promised
 * to come out with its keys in the order it went in — so an unsorted hash
 * would report edits that never happened, and refuse to update content that
 * had. Timestamps come out for the reason `scripts/build-content.mjs` takes
 * them out of the seed version: a field that moves for no reason makes
 * everything downstream of it move for no reason.
 */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).filter((k) => !STAMPS.includes(k)).sort()) {
      out[key] = canonical(value[key]);
    }
    return out;
  }
  return value;
}

/**
 * Two cheap 32-bit hashes side by side.
 *
 * This is change detection, not security, and it runs on a phone at launch —
 * `crypto.subtle` is async and would have to be awaited in the middle of the
 * seed path for no benefit. Two different mixes make an accidental collision
 * vanishingly unlikely; the cost of one would be a content update quietly not
 * arriving, which is the failure this file exists to fix, so it is worth the
 * second loop.
 */
function hash(text) {
  let a = 5381;
  let b = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = ((a * 33) ^ c) >>> 0;
    b = (c + (b << 6) + (b << 16) - b) >>> 0;
  }
  return `${a.toString(36)}${b.toString(36)}`;
}

/**
 * What a protocol SAYS, ignoring whose it is and when.
 *
 * `id` stays out because it is the identity, not the content. `active` stays
 * out because switching a plan off is a person's decision about their day and
 * has nothing to do with whether the content behind it is current — somebody
 * who turned the pull day off must still get its corrected instructions.
 */
export function contentFingerprint(protocol) {
  const { id, active, ...content } = protocol ?? {};
  return hash(JSON.stringify(canonical(content)));
}

/** The fingerprint of every shipped protocol, to record as the new baseline. */
export function baselinesOf(shipped = []) {
  return Object.fromEntries(shipped.map((p) => [p.id, contentFingerprint(p)]));
}

/**
 * What to do with the shipped content, given what this device has.
 *
 * → { fresh, refresh, kept }
 *     fresh   — never seen here: hand it over
 *     refresh — held, unchanged since the app gave it: bring it up to date
 *     kept    — held and edited: leave it alone, it is theirs now
 *
 * `baselines[id]` is the fingerprint of the shipped protocol AS INSTALLED. It
 * is the whole mechanism: comparing what is stored against what was handed
 * over says whether a person has changed anything, which is a different
 * question from whether it matches what ships today.
 *
 * **The migration, stated rather than hidden.** Devices seeded before
 * baselines existed have no record of what they were given, so "have you
 * edited this?" falls back to `updatedAt === createdAt` — proof that
 * `store.saveProtocol` has never once run on it. That is exact in one
 * direction and blunt in the other: switching a plan on or off also stamps
 * `updatedAt`, so a protocol somebody merely toggled reads as edited and stops
 * receiving updates. It errs toward never overwriting somebody's work, which
 * is the right way to be wrong, and it is one-time — every device gets a real
 * baseline from this version on.
 */
export function seedPlan({ shipped = [], have = [], offered = new Set(), baselines = {} } = {}) {
  const held = new Map(have.map((p) => [p.id, p]));
  const fresh = [];
  const refresh = [];
  const kept = [];

  for (const p of shipped) {
    const stored = held.get(p.id);
    if (!stored) {
      // Never seen, and not deleted after being offered — a decision to throw
      // something away still sticks (that half was always right).
      if (!offered.has(p.id)) fresh.push(p);
      continue;
    }
    const storedPrint = contentFingerprint(stored);
    if (storedPrint === contentFingerprint(p)) continue; // already current

    const base = baselines[p.id];
    const untouched = base ? storedPrint === base : stored.createdAt === stored.updatedAt;
    if (untouched) refresh.push({ shipped: p, stored });
    else kept.push(p.id);
  }

  return { fresh, refresh, kept };
}

/**
 * A refreshed protocol: the shipped content, carrying over the two things that
 * belong to the person rather than to the content.
 *
 * `active` is their decision about their day. `createdAt` is when this arrived
 * on this device, and rewriting it would be a small lie in the record. The
 * stamp moves because `updatedAt` is the merge referee (decision 15) and the
 * incoming copy has to win.
 */
export function refreshed(shippedProtocol, stored, nowIsoStr) {
  return {
    ...shippedProtocol,
    active: stored.active,
    createdAt: stored.createdAt ?? shippedProtocol.createdAt,
    updatedAt: nowIsoStr,
  };
}
