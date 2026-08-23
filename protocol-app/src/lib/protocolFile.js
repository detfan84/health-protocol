// protocolFile.js — the published file format and its forgiving validator.
//
// One format, three producers:
//   kind 'backup'   — full export of everything (share-sheet backup)
//   kind 'protocol' — a complete protocol (deep-dive AI output; a saved plan)
//   kind 'fragment' — a partial protocol: module / sub-module content that
//                     merges INTO an existing protocol (the composition model,
//                     Kevin Aug 17 — modules are bolt-on building blocks)
//
// Forgiveness policy: AI output is sloppy and humans make typos. The validator
// repairs what it safely can (trims strings, coerces numeric strings, supplies
// missing IDs and timestamps, drops unknown keys) and records every repair as
// a warning. When it cannot repair, it fails with a kind, specific message —
// path, problem, and a hint — never a shrug.

import { FILE_FORMAT, SCHEMA_VERSION } from './schema.js';
import { newId, nowIso } from './core.js';
import { CADENCE_KINDS } from './cadence.js';

const KINDS = ['backup', 'protocol', 'fragment'];

function isObj(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function asTrimmed(x) {
  return typeof x === 'string' ? x.trim() : x;
}

/** Coerce "3" → 3. Returns undefined when not safely numeric. */
function asNumber(x) {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x)))
    return Number(x);
  return undefined;
}

class Ctx {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }
  err(path, message, hint) {
    this.errors.push({ path, message, hint });
  }
  warn(path, message) {
    this.warnings.push({ path, message });
  }
}

/* ------------------------- piece validators ------------------------ */

function fixItem(raw, path, ctx) {
  if (!isObj(raw)) {
    ctx.err(path, 'Each item should be an object.', 'Example: { "name": "Magnesium", "dose": "200 mg" }');
    return null;
  }
  const item = {};
  item.id = asTrimmed(raw.id) || newId();
  if (!raw.id) ctx.warn(path + '.id', 'Missing id — generated one.');
  item.name = asTrimmed(raw.name);
  if (!item.name) {
    ctx.err(path + '.name', 'Every item needs a name.', 'Add a "name" field, e.g. "Morning walk".');
    return null;
  }
  for (const k of ['dose', 'why', 'notes']) {
    if (raw[k] != null) item[k] = asTrimmed(String(raw[k]));
  }
  if (raw.phaseIds != null) {
    if (Array.isArray(raw.phaseIds)) item.phaseIds = raw.phaseIds.map(String);
    else ctx.warn(path + '.phaseIds', 'Expected a list — ignored.');
  }
  // Cadence travels with the plan: "3× a week" is part of what the protocol
  // says to do, so a protocol shared with somebody else carries it. What does
  // NOT travel is anything personal about doing it — a pause lives in the
  // settings store (decision 19), so importing somebody's protocol never
  // imports the fact that they stopped taking something.
  if (raw.cadence != null) {
    const c = fixCadence(raw.cadence, path + '.cadence', ctx);
    if (c) item.cadence = c;
  }
  return item;
}

/** A cadence, or nothing — a broken one is a warning and daily, never a crash. */
function fixCadence(raw, path, ctx) {
  if (!isObj(raw)) {
    ctx.warn(path, 'Expected something like { "kind": "timesPerWeek", "n": 3 } — ignored, so this is every day.');
    return null;
  }
  const kind = asTrimmed(raw.kind);
  if (!CADENCE_KINDS.includes(kind)) {
    ctx.warn(path + '.kind', `"${raw.kind}" is not a cadence — ignored, so this is every day. Known: ${CADENCE_KINDS.join(', ')}.`);
    return null;
  }
  if (kind === 'daily' || kind === 'asNeeded') return { kind };
  const n = asNumber(raw.n);
  if (n === undefined || !Number.isInteger(n) || n < 1) {
    ctx.warn(path + '.n', `"${raw.n}" is not a whole number of days — ignored, so this is every day.`);
    return null;
  }
  return { kind, n: Math.min(n, kind === 'timesPerWeek' ? 7 : 365) };
}

function fixBlock(raw, path, ctx, order) {
  if (!isObj(raw)) {
    ctx.err(path, 'Each block should be an object.', 'Example: { "name": "Morning", "start": "07:00", "items": [...] }');
    return null;
  }
  const block = {};
  block.id = asTrimmed(raw.id) || newId();
  if (!raw.id) ctx.warn(path + '.id', 'Missing id — generated one.');
  block.name = asTrimmed(raw.name);
  if (!block.name) {
    ctx.err(path + '.name', 'Every time block needs a name.', 'e.g. "Morning" or "Evening wind-down".');
    return null;
  }
  for (const k of ['start', 'end']) {
    const v = asTrimmed(raw[k]);
    if (v == null || v === '') continue;
    if (/^\d{1,2}:\d{2}$/.test(v)) block[k] = v.padStart(5, '0');
    else ctx.warn(path + '.' + k, `"${v}" is not HH:MM — ignored.`);
  }
  const ord = asNumber(raw.order);
  block.order = ord !== undefined ? ord : order;
  block.items = [];
  const items = raw.items ?? [];
  if (!Array.isArray(items)) {
    ctx.err(path + '.items', '"items" should be a list.', 'Wrap the items in [ ... ].');
  } else {
    items.forEach((it, i) => {
      const fixed = fixItem(it, `${path}.items[${i}]`, ctx);
      if (fixed) block.items.push(fixed);
    });
  }
  return block;
}

function fixPhase(raw, path, ctx, order) {
  if (!isObj(raw)) {
    ctx.err(path, 'Each phase should be an object.', 'Example: { "name": "Phase 1", "days": 14 }');
    return null;
  }
  const phase = {};
  phase.id = asTrimmed(raw.id) || newId();
  if (!raw.id) ctx.warn(path + '.id', 'Missing id — generated one.');
  phase.name = asTrimmed(raw.name);
  if (!phase.name) {
    ctx.err(path + '.name', 'Every phase needs a name.', 'e.g. "Weeks 1–2".');
    return null;
  }
  const days = asNumber(raw.days);
  if (days !== undefined) phase.days = days;
  else if (raw.days != null)
    ctx.warn(path + '.days', `"${raw.days}" is not a number — ignored.`);
  const ord = asNumber(raw.order);
  phase.order = ord !== undefined ? ord : order;
  return phase;
}

/**
 * Validate + repair a protocol object. `partial: true` relaxes for fragments
 * (a fragment may carry only blocks, only phases, or only items-in-blocks).
 */
export function fixProtocol(raw, path, ctx, { partial = false } = {}) {
  if (!isObj(raw)) {
    ctx.err(path, 'The protocol should be an object.', 'Top level must be { ... }, not a list or text.');
    return null;
  }
  const p = {};
  p.id = asTrimmed(raw.id) || newId();
  if (!raw.id) ctx.warn(path + '.id', 'Missing id — generated one.');
  p.name = asTrimmed(raw.name);
  if (!p.name) {
    if (partial) p.name = 'Imported module';
    else {
      ctx.err(path + '.name', 'The protocol needs a name.', 'Add "name": "My protocol".');
      return null;
    }
  }
  if (raw.notes != null) p.notes = asTrimmed(String(raw.notes));
  p.active = raw.active === true;

  p.phases = [];
  const phases = raw.phases ?? [];
  if (!Array.isArray(phases))
    ctx.err(path + '.phases', '"phases" should be a list (it may be empty — phases are optional).', 'Use "phases": [] if there are none.');
  else phases.forEach((ph, i) => {
    const fixed = fixPhase(ph, `${path}.phases[${i}]`, ctx, i);
    if (fixed) p.phases.push(fixed);
  });

  p.blocks = [];
  const blocks = raw.blocks ?? [];
  if (!Array.isArray(blocks))
    ctx.err(path + '.blocks', '"blocks" should be a list.', 'Wrap the time blocks in [ ... ].');
  else blocks.forEach((b, i) => {
    const fixed = fixBlock(b, `${path}.blocks[${i}]`, ctx, i);
    if (fixed) p.blocks.push(fixed);
  });

  if (!partial && p.blocks.length === 0)
    ctx.warn(path + '.blocks', 'No time blocks — the protocol will import empty.');

  p.createdAt = asTrimmed(raw.createdAt) || nowIso();
  p.updatedAt = asTrimmed(raw.updatedAt) || nowIso();
  return p;
}

/* --------------------------- file validator ------------------------ */

/**
 * validateFile(anything) → { ok, kind?, value?, errors, warnings }
 * Accepts a parsed object or a JSON string (it will parse for you).
 */
export function validateFile(input) {
  const ctx = new Ctx();
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      ctx.err('(file)', "This isn't valid JSON.", 'If an AI produced it, ask it to output only the JSON, with no extra text before or after.');
      return { ok: false, errors: ctx.errors, warnings: ctx.warnings };
    }
  }
  if (!isObj(raw)) {
    ctx.err('(file)', 'The file should contain a single JSON object.', 'Top level must be { ... }.');
    return { ok: false, errors: ctx.errors, warnings: ctx.warnings };
  }
  if (raw.format !== FILE_FORMAT) {
    ctx.err('format', `Missing or wrong "format" — expected "${FILE_FORMAT}".`, 'Add "format": "' + FILE_FORMAT + '" at the top level.');
    return { ok: false, errors: ctx.errors, warnings: ctx.warnings };
  }
  const kind = asTrimmed(raw.kind);
  if (!KINDS.includes(kind)) {
    ctx.err('kind', `"kind" must be one of ${KINDS.join(', ')}.`, 'A full backup is "backup"; a single plan is "protocol"; module content is "fragment".');
    return { ok: false, errors: ctx.errors, warnings: ctx.warnings };
  }

  const out = {
    format: FILE_FORMAT,
    kind,
    schemaVersion: asNumber(raw.schemaVersion) ?? SCHEMA_VERSION,
    exportedAt: asTrimmed(raw.exportedAt) || nowIso(),
  };

  if (kind === 'protocol' || kind === 'fragment') {
    const p = fixProtocol(raw.protocol ?? raw.data ?? {}, 'protocol', ctx, {
      partial: kind === 'fragment',
    });
    if (p) out.protocol = p;
  } else {
    const d = raw.data;
    if (!isObj(d)) {
      ctx.err('data', 'A backup needs a "data" object.', 'Expected { "protocols": [...], "days": [...], "labs": [...], "settings": [...] }.');
    } else {
      out.data = {};
      for (const key of ['protocols', 'days', 'labs', 'settings']) {
        const arr = d[key] ?? [];
        if (!Array.isArray(arr)) {
          ctx.err(`data.${key}`, `"${key}" should be a list.`, `Use "${key}": [] if empty.`);
          continue;
        }
        if (key === 'protocols') {
          out.data.protocols = [];
          arr.forEach((p, i) => {
            const fixed = fixProtocol(p, `data.protocols[${i}]`, ctx);
            if (fixed) out.data.protocols.push(fixed);
          });
        } else {
          out.data[key] = arr.filter((rec, i) => {
            if (!isObj(rec)) {
              ctx.err(`data.${key}[${i}]`, 'Should be an object.', undefined);
              return false;
            }
            return true;
          });
        }
      }
    }
  }

  const ok = ctx.errors.length === 0;
  return ok
    ? { ok, kind, value: out, errors: [], warnings: ctx.warnings }
    : { ok, kind, errors: ctx.errors, warnings: ctx.warnings };
}

/* --------------------- composition: fragment merge ------------------ */

/**
 * Merge a validated fragment into an existing protocol — the composition
 * model's core move. Blocks match by id (newer wins per-block metadata;
 * items union by id, incoming-newer wins). Unmatched blocks/phases append.
 * The target's own content is never deleted. Returns a NEW protocol object.
 */
export function mergeFragmentIntoProtocol(target, fragment) {
  const out = structuredClone(target);
  out.updatedAt = nowIso();

  const blockById = new Map(out.blocks.map((b) => [b.id, b]));
  for (const inc of fragment.blocks ?? []) {
    const existing = blockById.get(inc.id);
    if (!existing) {
      const copy = structuredClone(inc);
      copy.order = out.blocks.length;
      out.blocks.push(copy);
      blockById.set(copy.id, copy);
      continue;
    }
    const itemById = new Map(existing.items.map((it) => [it.id, it]));
    for (const item of inc.items ?? []) {
      if (itemById.has(item.id)) {
        // same item id — keep whichever the fragment says, but never lose
        // fields the local copy has and the fragment lacks
        const local = itemById.get(item.id);
        Object.assign(local, { ...item, ...stripUndefined(local, item) });
      } else {
        existing.items.push(structuredClone(item));
        itemById.set(item.id, item);
      }
    }
  }

  const phaseIds = new Set(out.phases.map((p) => p.id));
  for (const ph of fragment.phases ?? []) {
    if (!phaseIds.has(ph.id)) {
      const copy = structuredClone(ph);
      copy.order = out.phases.length;
      out.phases.push(copy);
      phaseIds.add(copy.id);
    }
  }
  return out;
}

function stripUndefined(local, incoming) {
  // fields present locally but absent on the incoming item survive the merge
  const keep = {};
  for (const k of Object.keys(local)) {
    if (incoming[k] === undefined) keep[k] = local[k];
  }
  return keep;
}
