// bundledProtocol.js — the one-tap way to get the old app's content in.
//
// The protocols ship alongside the app as a plain file rather than baked into
// the code, because content here is data you own: it is the same shape as any
// backup you export, and once it is on the device the app has no further
// interest in where it came from.
//
// Import merges and never deletes, and `updatedAt` is the referee — so if you
// have already edited an item, loading this again keeps YOUR version, not the
// shipped one. That is what makes it safe to offer more than once.

import * as store from './store.js';

/**
 * The ids the shipped file contains. The offer stands until every one of them
 * is on the device — otherwise someone who loaded an earlier, smaller version
 * of this file would never be shown the rest, which is exactly the trap that
 * hid the movement content after the supplements had already been brought in.
 *
 * A test keeps this list honest against starter-protocols.json.
 */
export const BUNDLED_IDS = [
  'supplement-protocol',
  'body-work',
  'stretching',
  'routine-full-body',
  'routine-upper-body',
  'routine-lower-body',
  'routine-push-day',
  'routine-pull-day',
  'routine-mobility-flow',
];

export function hasBundled(protocols) {
  const here = new Set(protocols.map((p) => p.id));
  return BUNDLED_IDS.every((id) => here.has(id));
}

export async function loadBundledProtocol() {
  const res = await fetch('./starter-protocols.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`The protocol file didn't load (HTTP ${res.status}).`);
  const result = await store.importBackup(await res.text());
  if (!result.ok) {
    throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join(' '));
  }
  return result;
}
