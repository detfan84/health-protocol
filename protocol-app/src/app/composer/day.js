// day.js — the one thing the composer writes.
//
// FRAMEWORK: the composer "reads ledger + findings + targets + context +
// quiz/template presets; writes nothing but the dealt day."
//
// WHY THE DEALT DAY IS STORED AT ALL, since the dealer is deterministic and
// could just be re-run: because its inputs move while you are using it. Check
// something off and the coverage ledger changes; re-deal from the new ledger
// and the session rearranges under the person mid-morning — items they had not
// done yet quietly swapped for other items. A plan that edits itself while you
// are working through it is not a plan.
//
// So a day is dealt once, written down, and read back for the rest of that day.
// Tomorrow reads the ledger that today's taps produced, which is the loop the
// whole subsystem exists to close.
//
// A PAST DAY IS NEVER DEALT. Decision 21: looking back changes nothing. If no
// day was dealt on 3 March then 3 March has no dealt session, forever, and
// inventing one now would be writing a plan for a day that has already gone.

import * as store from '../store.js';
import { nowIso, localDateKey } from '../../lib/core.js';
import { buildLedger, reachableNodes } from './ledger.js';
import { weighFindings, itemPreferences } from './findings.js';
import { dealDay } from './dealer.js';
import { dealWake } from './wake.js';

export const dealtKey = (date) => `dealt:${date}`;

let catalogCache = null;

/** The shelf, once. */
export async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const res = await fetch(new URL('../../content/library.json', import.meta.url));
  if (!res.ok) throw new Error(`the catalogue did not load: HTTP ${res.status}`);
  const lib = await res.json();
  catalogCache = {
    items: lib.items ?? [],
    itemsById: Object.fromEntries((lib.items ?? []).map((i) => [i.id, i])),
    anatomy: Object.fromEntries(Object.values(lib.anatomy ?? {}).map((n) => [n.id, n])),
  };
  return catalogCache;
}

export function _resetCatalogForTests() { catalogCache = null; }

/** What was dealt for this date, or null. Reading never deals. */
export async function storedDeal(date) {
  const rec = await store.getSetting(dealtKey(date));
  return rec?.session ? rec : null;
}

/**
 * The dealt day for `date` — read if it exists, dealt and written if it does
 * not and the date is today.
 */
export async function dealtFor(date, { now = new Date(), dial } = {}) {
  const existing = await storedDeal(date);
  if (existing) return existing;
  // Decision 21, and the REAL clock rather than the caller's idea of now.
  // Today hands most things `asOf` — the end of whichever day is on screen —
  // and taking that as "now" made yesterday look like today and dealt a session
  // into a day that had already happened. Whether it is today is not a
  // parameter.
  if (date !== localDateKey()) return null;

  const catalog = await loadCatalog();
  const [days, findings, settings, kit, sleep] = await Promise.all([
    store.loadRecentDays(date),
    store.loadFindings(),
    store.getSetting('composer.dial'),
    store.getSetting('composer.equipment'),
    store.getSetting('composer.sleep'),
  ]);

  const ledger = buildLedger({ days: Object.values(days ?? {}), itemsById: catalog.itemsById, now });
  const dealt = dealDay({
    items: catalog.items,
    anatomy: catalog.anatomy,
    ledger,
    weights: weighFindings({ events: findings, now }),
    preferences: itemPreferences({ events: findings }),
    dial: dial ?? settings?.value ?? 'standard',
    // Absent means unanswered, not empty-handed — the dealer filters nothing
    // until somebody has actually said (D24).
    equipment: Array.isArray(kit?.value) ? kit.value : null,
    date,
  });

  // Ids and reasons, not whole items. The catalogue is the source of the item;
  // storing a copy would mean a card edited tomorrow still showing yesterday's
  // wording forever.
  // The wake block rotates by sleep position — unwind-the-night, finally
  // implemented (Kevin, 1 Sep: "the wake block should not be fixed content").
  // Same equipment rule as the main deal: unanswered filters nothing (D24).
  const owns = Array.isArray(kit?.value) ? new Set([...kit.value, 'none']) : null;
  const usable = (i) => owns === null || (i.equipment ?? []).every((e) => owns.has(e));
  const wake = dealWake({ position: sleep?.value ?? null, date, itemsById: catalog.itemsById, usable });

  const record = {
    key: dealtKey(date),
    date,
    dial: dealt.dial,
    wake,
    dealtAt: nowIso(),
    session: dealt.session.map((c) => ({ id: c.item.id, why: c.why })),
    snacks: dealt.snacks.map((c) => ({ id: c.item.id, why: c.why })),
    medicine: dealt.medicine ? { id: dealt.medicine.item.id, why: dealt.medicine.why } : null,
    notes: dealt.notes,
    updatedAt: nowIso(),
  };
  await store.putSetting(record);
  return record;
}

/**
 * The dealt day as protocol blocks, so Today can render it with everything it
 * already knows how to do — checking off, cadence, the session runner.
 *
 * NO WINDOW ON EITHER BLOCK, deliberately. FRAMEWORK calls session 1 "early by
 * default… movable for real schedules", and every clock time in this app so far
 * was invented by me and is wrong for Kevin — 06:30, 07:00, 20:00, 22:00,
 * none of them asked for. Rather than invent a fifth, these sort after the rise
 * block and carry no times at all. The onboarding question about when a day
 * actually starts is what fills this in.
 */
export function blocksFrom(dealt, catalog) {
  if (!dealt) return [];
  const resolve = (row) => {
    const item = catalog.itemsById[row.id];
    if (!item) return null; // dealt yesterday, gone from the catalogue today
    return { ...item, why: row.why ?? item.why };
  };
  const session = [
    ...dealt.session.map(resolve),
    ...(dealt.medicine ? [resolve(dealt.medicine)] : []),
  ].filter(Boolean);
  const snacks = dealt.snacks.map(resolve).filter(Boolean);
  const wake = (dealt.wake ?? []).map(resolve).filter(Boolean);

  const blocks = [];
  // First among the dealt cards, because it is the first thing in the day. No
  // clock on it, for the same reason nothing composed carries one — but it
  // leads by order, and its name says what it is for.
  if (wake.length) {
    blocks.push({
      id: 'composed-wake',
      name: 'Unwind the night',
      order: 0,
      items: wake,
    });
  }
  if (session.length) {
    blocks.push({
      id: 'composed-session',
      name: 'Session',
      order: 2,
      items: session,
    });
  }
  if (snacks.length) {
    blocks.push({
      id: 'composed-snacks',
      name: 'Movement snacks',
      order: 4,
      // Three passes and it stops asking — the same cadence the rise block uses,
      // for the same reason: an opportunity that never goes away is an
      // obligation.
      items: snacks.map((i) => ({ ...i, cadence: i.cadence ?? { kind: 'timesPerDay', n: 3 } })),
    });
  }
  return blocks;
}

/** The dealt day as a protocol, to sit alongside the standing appointments. */
export function protocolFrom(dealt, catalog) {
  const blocks = blocksFrom(dealt, catalog);
  if (!blocks.length) return null;
  return {
    id: 'composed-today',
    name: 'Today, composed',
    notes: 'Dealt for today from what you have and have not worked. It changes tomorrow.',
    active: true,
    phases: [],
    blocks,
    createdAt: dealt.dealtAt,
    updatedAt: dealt.updatedAt ?? dealt.dealtAt,
  };
}
