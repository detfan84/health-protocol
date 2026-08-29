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

// Where an image stands with the person using it (D38 as amended, Kevin
// 28 Aug 2026). Images ship found-but-unchecked and are confirmed or rejected
// by doing the thing they illustrate, not by a review pass before shipping.
const PHOTO_STATUSES = ['found-unchecked', 'checked', 'rejected'];

// Content tiers (FRAMEWORK, "The content system"): the basics, and the ones
// clearly labelled worth trying.
const TIERS = ['established', 'exploratory'];

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
  // The five structured fields (K3, ruled Aug 19 and never built until now).
  // A body-work card is not a supplement row: what tool, what to do, what to
  // load afterwards, what to notice, and what to be careful of are five
  // different KINDS of thing, and flattening them into one paragraph is how
  // the app lost the content it already had. Careful is styled as a warning
  // downstream precisely because it is not just another paragraph.
  if (isObj(raw.fields)) {
    const fields = {};
    for (const k of ['tool', 'release', 'load', 'notice', 'careful']) {
      const v = asTrimmed(raw.fields[k] == null ? '' : String(raw.fields[k]));
      if (v) fields[k] = v;
    }
    if (Object.keys(fields).length) item.fields = fields;
  }
  // Who a careful line is FOR (D29 as applied in strategy v0.5 §9A). Universal
  // stop signals are taught once and belong to everybody; POPULATION cautions —
  // hypermobile dosing, orthostatic positioning, PEM pacing — ride behind
  // self-selection or a toggle, and are neither forced on general users nor
  // withheld from the community they serve.
  //
  // It sits BESIDE `fields` rather than inside it, so the five K3 keys stay
  // five (Kevin's call, 28 Aug). Before this, the tag was authored inside
  // `fields` and filtered out here — the gating model's own input never
  // reached the day it was supposed to gate.
  //
  // The audience list is open, not a closed set: D40's rule is that a
  // vocabulary is a census, not a cap. An unknown audience is carried, not
  // dropped — S4 rules on the vocabulary, and until then guessing which tags
  // are legitimate would be this file inventing content policy.
  if (raw.carefulAudience != null) {
    const raw_list = Array.isArray(raw.carefulAudience)
      ? raw.carefulAudience
      : String(raw.carefulAudience).split(',');
    const audiences = [...new Set(
      raw_list.map((a) => asTrimmed(String(a)).toLowerCase()).filter(Boolean),
    )];
    if (audiences.length) item.carefulAudience = audiences;
    else ctx.warn(path + '.carefulAudience', 'Empty — ignored, so this careful text is not gated to anybody.');
  }
  // Photos: two frames of the real movement, which a still cannot show.
  // `approx` means "close, but not exactly this drill" and the card says so —
  // a picture that quietly misleads is worse than no picture.
  if (Array.isArray(raw.photos)) {
    const photos = raw.photos
      .filter(isObj)
      .map((ph, i) => {
        const set = asTrimmed(String(ph.set ?? ''));
        if (!set || !/^[A-Za-z0-9_.-]+$/.test(set)) return null; // no paths, no traversal
        const out = { set };
        const caption = asTrimmed(String(ph.caption ?? ''));
        if (caption) out.caption = caption;
        if (ph.approx === true) out.approx = true;
        // `approx` and `status` are different claims and both can be true.
        // `approx` is what the caption already says — close, not exactly this
        // drill. `status` is whether a human has actually looked at it yet.
        //
        // An ABSENT status stays absent. It means nobody has recorded a view,
        // which is not the same as somebody choosing "unchecked" — three-state
        // absence, the same rule as everywhere else in this app.
        const status = asTrimmed(String(ph.status ?? ''));
        if (PHOTO_STATUSES.includes(status)) {
          out.status = status;
          const reason = asTrimmed(String(ph.rejectedReason ?? ''));
          if (status === 'rejected') {
            if (reason) out.rejectedReason = reason;
            else ctx.warn(`${path}.photos[${i}].rejectedReason`, 'This image is marked rejected with no reason — kept as rejected, but a rejection nobody can read teaches the next person nothing.');
          } else if (reason) {
            ctx.warn(`${path}.photos[${i}].rejectedReason`, `A reason only means something on a rejection — dropped, because this image is "${status}".`);
          }
        } else if (status) {
          ctx.warn(`${path}.photos[${i}].status`, `"${ph.status}" is not an image status — ignored. Known: ${PHOTO_STATUSES.join(', ')}.`);
        }
        return out;
      })
      .filter(Boolean);
    if (photos.length) item.photos = photos;
  }
  // How this item is tracked: a tick, sets of reps, or a duration (PLAN §4.2).
  // Anything else is a tick, because an unknown tracking type must not make an
  // item unloggable — it just makes it ordinary.
  const tracking = asTrimmed(String(raw.tracking ?? ''));
  if (tracking === 'sets' || tracking === 'duration') item.tracking = tracking;
  else if (tracking && tracking !== 'check') {
    ctx.warn(path + '.tracking', `"${raw.tracking}" is not a way of tracking — treated as a simple tick. Known: check, sets, duration.`);
  }
  // What the plan asks for. Optional, and never a floor or a judgement — the
  // log records what happened, this only says what was written down.
  if (isObj(raw.target)) {
    const target = {};
    for (const k of ['sets', 'reps', 'seconds']) {
      const n = asNumber(raw.target[k]);
      if (n !== undefined && Number.isFinite(n) && n > 0) target[k] = Math.round(n);
    }
    if (Object.keys(target).length) item.target = target;
  }
  // Which rung of the ladder this person is actually on. A catalogue item
  // carries the whole progression (`levels`); the plan item carries the one
  // that was chosen. Without it the app hands everybody rung 1, which is not a
  // neutral default: a clinician who deliberately regresses somebody to an
  // easier rung is then contradicted by their own app.
  // The tier travels into the day, and the grade behind it does not.
  //
  // Canon 3.8 is about hedges eroding as information is summarised across
  // document generations. The same mechanism runs across SURFACES: the library
  // says "worth trying", the day said nothing, and by the fortieth repetition
  // an exploratory drill is just something you do. One word carries the hedge;
  // the full grade stays reference material in the library (Kevin, 28 Aug).
  //
  // An unfamiliar tier is KEPT and reported, never dropped — a label nobody
  // recognised is still a label somebody wrote on purpose.
  const tier = asTrimmed(String(raw.tier ?? ''));
  if (tier) {
    item.tier = tier;
    if (!TIERS.includes(tier)) {
      ctx.warn(path + '.tier', `"${raw.tier}" is not a content tier we know — kept as written. The known ones are ${TIERS.join(' and ')}.`);
    }
  }
  const activeLevel = asNumber(raw.activeLevel);
  if (activeLevel !== undefined && Number.isInteger(activeLevel) && activeLevel > 0) {
    item.activeLevel = activeLevel;
  } else if (raw.activeLevel != null) {
    ctx.warn(path + '.activeLevel', `"${raw.activeLevel}" is not a rung number — ignored, so this item has no chosen rung.`);
  }
  // The facets (schema 3, docs/TAXONOMY.md §2). What kind of record this is,
  // what it does, what tissue and anatomy it acts on, how it is done, what it
  // needs, who performs it, where it came from.
  //
  // These used to be dropped. `viewLibrary` translated a catalogue item on the
  // way into a day and this validator had no slot for the rest, so `category`,
  // `kind`, `role`, `regions`, `muscles`, `equipment`, `context`, `swapGroup`,
  // `loadAfter` and `nerves` all died at the door — and the 119 items in the
  // shipped day protocols carry none of them. A composer reading that day would
  // be dealing from a deck with no suits.
  //
  // The values are NOT checked against the vocabularies, deliberately. D40 says
  // a vocabulary is data, and `carefulAudience` already set the precedent: a
  // validator that decides which values are legitimate is a validator writing
  // content policy. Shape is this file's business; vocabulary is
  // `scripts/check-vocab.mjs` and the content build. An unrecognised facet
  // value is carried, because somebody wrote it on purpose.
  //
  // The anatomy facet is stored as `anatomy`, not `target`: TAXONOMY.md names
  // the facet "target", and `target` has meant sets/reps/seconds here since
  // PLAN §4.2. The older meaning keeps the key.
  for (const k of ['type', 'technique', 'performedBy', 'tradition']) {
    if (raw[k] == null) continue;
    const v = asTrimmed(String(raw[k]));
    if (v) item[k] = v;
    else ctx.warn(`${path}.${k}`, `Empty — ignored, so this item says nothing about ${k}.`);
  }
  for (const k of ['effect', 'tissue', 'anatomy', 'context', 'equipment', 'demands']) {
    if (raw[k] == null) continue;
    if (!Array.isArray(raw[k])) {
      ctx.warn(`${path}.${k}`, `Expected a list — ignored. An item can have more than one, which is why it is a list even when there is one.`);
      continue;
    }
    const values = [...new Set(raw[k].map((v) => asTrimmed(String(v))).filter(Boolean))];
    if (values.length) item[k] = values;
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

  // A file written by a NEWER app than this one. Until schema 3 this number
  // was read, stored, and never once looked at — so a newer file imported
  // silently and whatever this version has no slot for vanished with it. That
  // is the exact failure D24 exists to forbid: carrying on with less, and
  // looking fine while doing it.
  //
  // It is a warning and not an error on purpose. Most of a newer file is
  // ordinary and imports correctly; refusing the whole thing would lose more
  // than it saves. The person is told what to expect instead.
  const fileVersion = asNumber(raw.schemaVersion);
  if (fileVersion !== undefined && Number.isFinite(fileVersion) && fileVersion > SCHEMA_VERSION) {
    ctx.warn(
      'schemaVersion',
      `This file was written by a newer version of the app (format ${fileVersion}; this one reads ${SCHEMA_VERSION}). Everything this version understands is imported — anything newer is not, and will not appear.`,
    );
  }

  const out = {
    format: FILE_FORMAT,
    kind,
    schemaVersion: fileVersion ?? SCHEMA_VERSION,
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
