// store.js — the app's one door to storage. Everything goes through db.js;
// no view touches IndexedDB directly. This file adds nothing clever: it names
// the operations the screens need and stamps updatedAt where saving is the
// meaningful event (protocols). Day and settings records arrive already
// stamped by the ops that changed them.

import { STORES, FILE_FORMAT } from '../lib/schema.js';
import { validateFile } from '../lib/protocolFile.js';
import { nowIso, localDateKey } from '../lib/core.js';
import { addDays } from '../lib/cadence.js';
import {
  openDb,
  put,
  mutate,
  mutateAcross,
  getOne,
  getAll,
  removeOne,
  exportAll,
  wipe,
  importMerge,
} from '../lib/db.js';
import { normalizeDay } from './trackerOps.js';
import { supplyKey, pauseKey, makePause } from './trackerOps.js';
import { phaseKey, phaseAsOf, makePhaseSetting } from './todayModel.js';

let _db = null;

export async function ready(opts) {
  if (!_db) _db = await openDb(opts);
  return _db;
}

/* Allow tests to point the store at a fresh fake-indexeddb database. */
export function _resetForTests() {
  _db = null;
}

/* ----------------------------- protocols ----------------------------- */

export async function loadProtocols() {
  const db = await ready();
  return getAll(db, STORES.PROTOCOLS);
}

export async function loadProtocol(id) {
  const db = await ready();
  return getOne(db, STORES.PROTOCOLS, id);
}

/** Saving is the moment a plan edit becomes real — stamp updatedAt here. */
export async function saveProtocol(protocol) {
  const db = await ready();
  const rec = structuredClone(protocol);
  rec.updatedAt = nowIso();
  await put(db, STORES.PROTOCOLS, rec);
  return rec;
}

/**
 * Deleting a protocol removes the PLAN only. Day records — every check-off
 * ever made against its items — stay exactly where they are.
 */
export async function deleteProtocol(id) {
  const db = await ready();
  await removeOne(db, STORES.PROTOCOLS, id);
}

/* ------------------------------- days -------------------------------- */

export async function loadDay(date = localDateKey()) {
  const db = await ready();
  const rec = await getOne(db, STORES.DAYS, date);
  return normalizeDay(rec, date);
}

export async function saveDay(day) {
  const db = await ready();
  await put(db, STORES.DAYS, day);
  return day;
}

// Day writes run one at a time, in the order the taps happened. IndexedDB
// serialises overlapping readwrite transactions on its own; this chain also
// keeps the ORDER honest, so the last tap is the one that stands.
let dayQueue = Promise.resolve();

/**
 * Change today's record safely: read and write in one transaction, behind the
 * queue. `change(day)` gets the normalized record and returns its successor
 * (or the same object to write nothing new).
 *
 * Every tracker write on Today goes through here rather than load-then-save,
 * because seventeen quick taps must be seventeen recorded taps.
 */
export function mutateDay(date, change) {
  const run = dayQueue.then(async () => {
    const db = await ready();
    let result;
    await mutate(db, STORES.DAYS, date, (raw) => {
      const current = normalizeDay(raw, date);
      const next = change(current);
      result = next;
      // An op that returns its input means "nothing to record" — a minus-tap
      // on an unlogged tally, say. Writing anyway would stamp a record into
      // existence that the person never made (ruling A).
      return next === current ? undefined : next;
    });
    return result;
  });
  // The queue must survive a failed write — one rejected tap cannot wedge
  // every tap after it.
  dayQueue = run.catch(() => {});
  return run;
}

/**
 * A check-off, and the bottle it comes out of, in one transaction.
 *
 * Decision 22's auto-decrement, done where it cannot half-happen: the day
 * record and the supply count are read, moved together and written together,
 * so there is no window in which a tick exists against stock that never went
 * down (ruling B, point 6). Behind the same queue as every other day write,
 * because a fast thumb is still a fast thumb.
 *
 * `apply({ day, supply })` is the pure decision — see trackerOps — and returns
 * { day, supply? }. Resolves to the day record, like mutateDay.
 */
export function mutateDayWithSupply(date, itemId, apply) {
  const run = dayQueue.then(async () => {
    const db = await ready();
    let result;
    await mutateAcross(
      db,
      [
        { store: STORES.DAYS, key: date },
        { store: STORES.SETTINGS, key: supplyKey(itemId) },
      ],
      ([rawDay, rawSupply]) => {
        const current = normalizeDay(rawDay, date);
        const out = apply({ day: current, supply: rawSupply }) ?? {};
        result = out.day ?? current;
        // Same rule as mutateDay: an op that changed nothing writes nothing,
        // rather than stamping a record into existence nobody made (ruling A).
        return [
          out.day && out.day !== current ? out.day : undefined,
          out.supply,
        ];
      },
    );
    return result;
  });
  dayQueue = run.catch(() => {});
  return run;
}

/* ----------------------------- settings ------------------------------ */

export async function getSetting(key) {
  const db = await ready();
  return getOne(db, STORES.SETTINGS, key);
}

/**
 * Change one settings record safely — read and write in ONE transaction.
 *
 * The same lesson as mutateDay, learned again on the supply screen: a save that
 * loads the record, edits it in JavaScript and puts it back has a gap in the
 * middle, and three fields saved in quick succession all read the same
 * pre-edit record and the last one wins. Two of the three edits vanish, with a
 * green tick over each of them — a silent failure of exactly the class ruling A
 * and ruling B exist to end.
 *
 * `change(current)` gets the stored record (undefined if none) and returns its
 * successor, synchronously.
 */
export async function mutateSetting(key, change) {
  const db = await ready();
  return mutate(db, STORES.SETTINGS, key, change);
}

export async function putSetting(record) {
  const db = await ready();
  const rec = structuredClone(record);
  if (!rec.updatedAt) rec.updatedAt = nowIso();
  await put(db, STORES.SETTINGS, rec);
  return rec;
}

export async function allSettings() {
  const db = await ready();
  return getAll(db, STORES.SETTINGS);
}

/** { [protocolId]: phaseSettingRecord } for buildToday. */
export async function loadPhaseSettings(protocols) {
  const out = {};
  for (const p of protocols) {
    const rec = await getSetting(phaseKey(p.id));
    if (rec) out[p.id] = rec;
  }
  return out;
}

/**
 * Move every phased protocol's pointer to where the calendar says it is
 * (decision 14), and hand back the settings as they now stand.
 *
 * The arithmetic is pure and lives in todayModel; this only writes, and only
 * for a protocol whose pointer genuinely belongs somewhere else. A write here
 * is the app catching up with the plan the person already made — the phase
 * lengths are theirs — so it is not a decision being taken on their behalf.
 *
 * Call it for today only. Looking back at last Tuesday must never advance
 * anybody's plan (decision 21: viewing a past day changes nothing).
 */
export async function advancePhases(protocols, settings, today = localDateKey()) {
  const out = { ...settings };
  for (const p of protocols ?? []) {
    if (p.active !== true || (p.phases ?? []).length === 0) continue;
    const at = phaseAsOf(p, out[p.id], today);
    if (!at.moved || !at.phase || !at.startedAt) continue;
    const rec = makePhaseSetting(p.id, at.phase.id, at.startedAt, nowIso());
    await putSetting(rec);
    out[p.id] = rec;
  }
  return out;
}

/** { [itemId]: supplyRecord } for the supply screen. */
/* ------------------------------- findings -------------------------------- */
// What the body reported about itself (D42). Append-only by nature: an event is
// a thing that happened, and history is not edited. The weight table is
// computed from these by src/app/composer/findings.js — there is no stored
// number here to drift.

/** Every finding event, oldest first. */
export async function loadFindings() {
  const db = await ready();
  const all = await getAll(db, STORES.FINDINGS);
  return all.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** Record one tap. */
export async function addFinding(event) {
  const db = await ready();
  await put(db, STORES.FINDINGS, event);
  return event;
}

export async function loadSupplies() {
  const all = await allSettings();
  const out = {};
  for (const rec of all) {
    if (typeof rec.key === 'string' && rec.key.startsWith('supply:') && rec.itemId) {
      out[rec.itemId] = rec;
    }
  }
  return out;
}

/** { [itemId]: pauseRecord } — what the app has been asked to stop asking for. */
export async function loadPauses() {
  const all = await allSettings();
  const out = {};
  for (const rec of all) {
    if (typeof rec.key === 'string' && rec.key.startsWith('pause:') && rec.itemId) {
      out[rec.itemId] = rec;
    }
  }
  return out;
}

export async function pauseItem(itemId, opts) {
  return putSetting(makePause(itemId, opts));
}

/** Resuming removes the record — there is no "unpaused" state to store. */
export async function resumeItem(itemId) {
  const db = await ready();
  await removeOne(db, STORES.SETTINGS, pauseKey(itemId));
}

/**
 * Day records from the last `days` days, as { [dateKey]: record }, for the
 * cadence maths ("have I done this three times this week?").
 *
 * Reads the whole store and filters: a year of days is a few hundred small
 * records, and a range cursor here would be complexity bought with nothing.
 */
export async function loadRecentDays(through = localDateKey(), days = 21) {
  const db = await ready();
  const all = await getAll(db, STORES.DAYS);
  const from = addDays(through, -Math.abs(days));
  const out = {};
  for (const rec of all) {
    if (typeof rec?.date === 'string' && rec.date >= from && rec.date <= through) {
      out[rec.date] = normalizeDay(rec, rec.date);
    }
  }
  return out;
}

/* --------------------------- backup / wipe ---------------------------- */

export async function exportBackup() {
  const db = await ready();
  return exportAll(db);
}

export async function importBackup(fileInput) {
  const db = await ready();
  return importMerge(db, fileInput);
}

/**
 * Import whatever kind of file a person picked.
 *
 * The app used to accept backups only, while telling anyone holding a
 * protocol file to "import it from the Protocols screen" — a screen with no
 * import on it. This is that door, and it takes either kind.
 *
 * A protocol file is wrapped as a one-protocol backup rather than saved
 * directly, so it goes through the same merge referee as everything else:
 * newer `updatedAt` wins, nothing is ever deleted, and re-importing a file
 * after you have edited an item keeps YOUR version.
 */
export async function importFile(fileInput) {
  const v = validateFile(fileInput);
  if (!v.ok) return { ok: false, errors: v.errors, warnings: v.warnings };

  if (v.kind === 'fragment') {
    return {
      ok: false,
      errors: [{
        path: 'kind',
        message: 'This is a fragment — a piece of a protocol, not a whole one.',
        hint: 'Fragments merge into an existing protocol from its edit screen.',
      }],
      warnings: v.warnings,
    };
  }

  if (v.kind === 'protocol') {
    return importBackup({
      format: FILE_FORMAT,
      kind: 'backup',
      schemaVersion: v.value.schemaVersion,
      exportedAt: v.value.exportedAt,
      data: { protocols: [v.value.protocol], days: [], labs: [], settings: [] },
    });
  }

  return importBackup(fileInput);
}

/** User-initiated only. Imports never call this — nothing about an import
 *  can erase what's on the device. */
export async function eraseEverything() {
  const db = await ready();
  return wipe(db);
}
