// bundledProtocol.js — the one-tap way to get the supplement protocol in.
//
// The protocol ships alongside the app as a plain file rather than baked into
// the code, because content here is data you own: it is the same shape as any
// backup you export, and once it is on the device the app has no further
// interest in where it came from.
//
// Import merges and never deletes, and `updatedAt` is the referee — so if you
// have already edited an item, loading this again keeps YOUR version, not the
// shipped one. That is what makes it safe to offer more than once.

import * as store from './store.js';

/** Matches the id the converter writes. Used to tell "not loaded" from "loaded". */
export const BUNDLED_ID = 'supplement-protocol';

export function hasBundled(protocols) {
  return protocols.some((p) => p.id === BUNDLED_ID);
}

export async function loadBundledProtocol() {
  const res = await fetch('./supplement-protocol.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`The protocol file didn't load (HTTP ${res.status}).`);
  const result = await store.importBackup(await res.text());
  if (!result.ok) {
    throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join(' '));
  }
  return result;
}
