// editorOps.js — the protocol editor's core, as pure functions.
//
// Every function takes a protocol (or piece of one) and returns a NEW object;
// inputs are never mutated. Rendering stays dumb; these ops carry the rules:
//   - IDs are permanent; names are labels. Renaming never changes an id,
//     so history (day-record checks pointing at item ids) survives every edit.
//   - Editing the plan never touches day records (plan/record separation).
//     Nothing in this file reads or writes the days store — by construction.
//   - `updatedAt` is stamped at save time (store.saveProtocol), not per edit.

import { newId, nowIso } from '../lib/core.js';

function clone(x) {
  return structuredClone(x);
}

/* ----------------------------- protocol ----------------------------- */

export function newProtocol(name = '') {
  const t = nowIso();
  return {
    id: newId(),
    name,
    active: false,
    phases: [],
    blocks: [],
    createdAt: t,
    updatedAt: t,
  };
}

export function setProtocolFields(p, patch) {
  const out = clone(p);
  if (patch.name !== undefined) out.name = String(patch.name);
  if (patch.notes !== undefined) {
    const n = String(patch.notes).trim();
    if (n) out.notes = n;
    else delete out.notes;
  }
  if (patch.active !== undefined) out.active = patch.active === true;
  return out;
}

/* ------------------------------ phases ------------------------------ */

export function addPhase(p, { name = 'New phase', days } = {}) {
  const out = clone(p);
  const phase = { id: newId(), name, order: out.phases.length };
  if (Number.isFinite(days)) phase.days = days;
  out.phases.push(phase);
  return out;
}

export function updatePhase(p, phaseId, patch) {
  const out = clone(p);
  const ph = out.phases.find((x) => x.id === phaseId);
  if (!ph) return out;
  if (patch.name !== undefined) ph.name = String(patch.name);
  if (patch.days !== undefined) {
    const d = Number(patch.days);
    if (Number.isFinite(d) && d > 0) ph.days = d;
    else delete ph.days; // blank/invalid means "no set length" — phases may be open-ended
  }
  return out;
}

/**
 * Removing a phase also removes its id from every item's phaseIds, so no item
 * is left pointing at a phase that no longer exists. An item whose only tag
 * was the removed phase becomes untagged — visible in every phase — rather
 * than silently hidden.
 */
export function removePhase(p, phaseId) {
  const out = clone(p);
  out.phases = out.phases.filter((x) => x.id !== phaseId);
  out.phases.forEach((ph, i) => (ph.order = i));
  for (const b of out.blocks) {
    for (const it of b.items) {
      if (Array.isArray(it.phaseIds)) {
        it.phaseIds = it.phaseIds.filter((id) => id !== phaseId);
        if (it.phaseIds.length === 0) delete it.phaseIds;
      }
    }
  }
  return out;
}

export function movePhase(p, phaseId, dir) {
  const out = clone(p);
  out.phases.sort((a, b) => a.order - b.order);
  const i = out.phases.findIndex((x) => x.id === phaseId);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= out.phases.length) return out;
  [out.phases[i], out.phases[j]] = [out.phases[j], out.phases[i]];
  out.phases.forEach((ph, k) => (ph.order = k));
  return out;
}

/* ------------------------------ blocks ------------------------------ */

const HHMM = /^\d{2}:\d{2}$/;

export function addBlock(p, { name = 'New block', start, end } = {}) {
  const out = clone(p);
  const block = { id: newId(), name, order: out.blocks.length, items: [] };
  if (typeof start === 'string' && HHMM.test(start)) block.start = start;
  if (typeof end === 'string' && HHMM.test(end)) block.end = end;
  out.blocks.push(block);
  return out;
}

export function updateBlock(p, blockId, patch) {
  const out = clone(p);
  const b = out.blocks.find((x) => x.id === blockId);
  if (!b) return out;
  if (patch.name !== undefined) b.name = String(patch.name);
  for (const k of ['start', 'end']) {
    if (patch[k] === undefined) continue;
    const v = String(patch[k]).trim();
    if (v === '') delete b[k]; // times are optional — an untimed block is fine
    else if (HHMM.test(v)) b[k] = v;
    // anything else: leave the stored value alone; the field never holds junk
  }
  return out;
}

export function removeBlock(p, blockId) {
  const out = clone(p);
  out.blocks = out.blocks.filter((x) => x.id !== blockId);
  out.blocks.forEach((b, i) => (b.order = i));
  return out;
}

export function moveBlock(p, blockId, dir) {
  const out = clone(p);
  out.blocks.sort((a, b) => a.order - b.order);
  const i = out.blocks.findIndex((x) => x.id === blockId);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= out.blocks.length) return out;
  [out.blocks[i], out.blocks[j]] = [out.blocks[j], out.blocks[i]];
  out.blocks.forEach((b, k) => (b.order = k));
  return out;
}

/* ------------------------------- items ------------------------------ */

export function addItem(p, blockId, { name = 'New item', dose, why, notes } = {}) {
  const out = clone(p);
  const b = out.blocks.find((x) => x.id === blockId);
  if (!b) return out;
  const item = { id: newId(), name };
  if (dose) item.dose = String(dose);
  if (why) item.why = String(why);
  if (notes) item.notes = String(notes);
  b.items.push(item);
  return out;
}

export function updateItem(p, blockId, itemId, patch) {
  const out = clone(p);
  const b = out.blocks.find((x) => x.id === blockId);
  const it = b?.items.find((x) => x.id === itemId);
  if (!it) return out;
  if (patch.name !== undefined) it.name = String(patch.name);
  for (const k of ['dose', 'why', 'notes']) {
    if (patch[k] === undefined) continue;
    const v = String(patch[k]).trim();
    if (v) it[k] = v;
    else delete it[k];
  }
  return out;
}

/**
 * Removing an item removes it from the PLAN only. Any check-offs recorded
 * against its id remain in the day records, untouched — that history is what
 * happened, and editing the plan never rewrites what happened.
 */
export function removeItem(p, blockId, itemId) {
  const out = clone(p);
  const b = out.blocks.find((x) => x.id === blockId);
  if (!b) return out;
  b.items = b.items.filter((x) => x.id !== itemId);
  return out;
}

export function moveItem(p, blockId, itemId, dir) {
  const out = clone(p);
  const b = out.blocks.find((x) => x.id === blockId);
  if (!b) return out;
  const i = b.items.findIndex((x) => x.id === itemId);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= b.items.length) return out;
  [b.items[i], b.items[j]] = [b.items[j], b.items[i]];
  return out;
}

/** Toggle an item's membership in a phase. Empty phaseIds → field removed
 *  (an untagged item appears in every phase). */
export function toggleItemPhase(p, blockId, itemId, phaseId) {
  const out = clone(p);
  const b = out.blocks.find((x) => x.id === blockId);
  const it = b?.items.find((x) => x.id === itemId);
  if (!it) return out;
  const ids = new Set(it.phaseIds ?? []);
  if (ids.has(phaseId)) ids.delete(phaseId);
  else ids.add(phaseId);
  if (ids.size) it.phaseIds = [...ids];
  else delete it.phaseIds;
  return out;
}
