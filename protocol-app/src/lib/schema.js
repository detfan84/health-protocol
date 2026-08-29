// schema.js — the ratified schema (Kevin, Aug 16 2026), as real code.
//
// Principles encoded here:
//   1. Everything gets a permanent ID; names are labels. History survives renames.
//   2. Plan vs record: protocols are the plan; day records are what happened.
//      Editing the plan never rewrites history.
//   3. Every record carries `updatedAt` — the referee for record-level merge.
//   4. One SCHEMA_VERSION on the whole database, upgraded by a tested
//      migration ladder. Web updates replace code, never data.
//   5. Phases are optional. Multiple protocols may be active at once.

import { legacyGlassesToMl } from './units.js';

export const DB_NAME = 'protocol-app';
export const SCHEMA_VERSION = 3;

// Published file format identifier — shared by backups, gallery/module
// fragments, and AI-produced imports (the deep-dive and lab doors).
export const FILE_FORMAT = 'protocol-app/v1';

export const STORES = {
  PROTOCOLS: 'protocols', // keyPath: id      — the plan(s)
  DAYS: 'days',           // keyPath: date    — one record per local date
  LABS: 'labs',           // keyPath: id      — lab results (v1 scope, Kevin Aug 17)
  SETTINGS: 'settings',   // keyPath: key     — small user prefs (dark mode, faith flag…)
};

// Migration ladder. Each rung upgrades from (to - 1) → to and is append-only:
// released rungs are never edited, only new rungs added. openDb() runs every
// rung above the database's current version, in order.
export const MIGRATIONS = [
  {
    to: 1,
    run(db) {
      db.createObjectStore(STORES.PROTOCOLS, { keyPath: 'id' });
      db.createObjectStore(STORES.DAYS, { keyPath: 'date' });
      db.createObjectStore(STORES.LABS, { keyPath: 'id' });
      db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
    },
  },
  {
    // Water stops being counted in "glasses" and starts being a volume
    // (decision K2). Storage is canonical ml; the screen reads oz or ml.
    //
    // Old records are converted, not discarded, at 1 glass = 8 fl oz — and
    // every converted record keeps `waterFromGlasses`, because a derived
    // number that cannot be told apart from a logged one is exactly the kind
    // of quiet lie decision 24 exists to prevent.
    to: 2,
    run(db, transaction) {
      const days = transaction.objectStore(STORES.DAYS);
      const cursorReq = days.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return;
        const rec = cursor.value;
        if (Number.isFinite(rec?.water) && !Number.isFinite(rec?.waterMl)) {
          const glasses = rec.water;
          rec.waterMl = legacyGlassesToMl(glasses);
          rec.waterFromGlasses = glasses;
          delete rec.water;
          cursor.update(rec);
        }
        cursor.continue();
      };
    },
  },
  {
    // Items may carry the facets (docs/TAXONOMY.md): what kind of record it is,
    // what it does, what tissue and what anatomy it acts on, how it is done,
    // what it needs, who performs it, where it came from.
    //
    // No facets are invented for old items. One saved before this rung has
    // none — not empty ones, not defaults. Absence means nobody has said, which
    // is a different fact from "none", and the three-state rule (D24) makes it
    // the app's job to keep them apart. A rung that helpfully wrote
    // `effect: []` onto nine hundred old items would be inventing an answer on
    // their behalf.
    //
    // What it DOES do is rename one field, because the facet named `target` in
    // the spec wants the key that a dose has been holding since PLAN §4.2.
    // For one commit the facet was called `anatomy` so the older meaning could
    // keep it. Kevin's ruling, 29 Aug: reformat things to fit the current
    // structure rather than letting older versions dictate what happens now. So
    // the dose becomes `amount` here and in every file the validator reads, and
    // `target` means the part of the body an item works on.
    //
    // This rung was written yesterday and has not been released, which is the
    // window the append-only rule leaves open: a RELEASED rung is never edited,
    // and this one is not that yet. After it ships, a further rename needs a
    // rung of its own.
    //
    // The version had to move anyway, for a reason worth keeping: in this
    // codebase SCHEMA_VERSION is one number doing two jobs — the database
    // version AND the `schemaVersion` stamped into every exported file. The
    // file format's meaning changed, so both move together. The other half of
    // that argument is in protocolFile.js, which until schema 3 read
    // `schemaVersion` and never once looked at it.
    to: 3,
    run(db, transaction) {
      const protocols = transaction.objectStore(STORES.PROTOCOLS);
      const cursorReq = protocols.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return;
        const rec = cursor.value;
        let touched = false;
        for (const block of rec?.blocks ?? []) {
          for (const item of block.items ?? []) {
            // Only an OBJECT is the old dose. A list is already the facet, so a
            // record written by a newer build is left exactly as it is.
            if (item.target && !Array.isArray(item.target) && typeof item.target === 'object') {
              item.amount = item.target;
              delete item.target;
              touched = true;
            }
          }
        }
        if (touched) cursor.update(rec);
        cursor.continue();
      };
    },
  },
];

/* ------------------------------------------------------------------ *
 * Reference shapes (documentation — the validator enforces these)
 *
 * Protocol {
 *   id, name, notes?, active (bool),
 *   phases: [ { id, name, days?, order } ]            // optional, may be []
 *   blocks: [ {                                        // time blocks
 *     id, name, start? 'HH:MM', end? 'HH:MM', order,
 *     items: [ {
 *       id, name, dose?, why?, notes?, phaseIds?: [],
 *       cadence?: { kind, n? },                    // how often (PLAN 4.1)
 *       tracking?: 'check' | 'sets' | 'duration' | 'measure',  // how it is logged (4.2)
 *       measure?: { kind: 'number'|'scale'|'choice', unit?, name?, min?, max?, better? },
 *                                                   // what a self-test records (§5.1)
 *       outcomes?: [ { id, tell, means, points?: [], then?: [] } ],  // and what it means
 *       amount?: { sets?, reps?, seconds? },        // what the plan asks for
 *       fields?: { tool?, release?, load?, notice?, careful? },  // K3
 *       photos?: [ { set, caption?, approx? } ],   // two frames per set
 *
 *       // The facets (schema 3, docs/TAXONOMY.md §2). Values are ids from
 *       // src/content/vocab/*.json — data, never enums in code (D40), so the
 *       // validator checks the SHAPE and never the vocabulary.
 *       type?: 'practice' | 'measurement' | 'teaching' | 'intake' | 'record',
 *       effect?: [],        // release, load, calm…      — the ledger's words
 *       tissue?: [],        // muscle, fascia, nerve…    — multi, on purpose
 *       target?: [],        // node ids from anatomy.json — where it acts
 *       technique?: string, // how it is done
 *       context?: [],       // floor, bed, chair, desk…
 *       equipment?: [],     // ball, band, kettlebell…
 *       demands?: [],       // what it needs available (§6)
 *       performedBy?: 'self' | 'practitioner',
 *       tradition?: string,
 *
 *       // `target` is the anatomy facet, as TAXONOMY.md §2.1 names it. It used
 *       // to mean sets/reps/seconds; that is `amount` now. The rename runs the
 *       // way round it does on Kevin's ruling (29 Aug): the current structure
 *       // names the field and the old shape is reformatted to fit it, rather
 *       // than the oldest thing in the repo keeping the good name forever.
 *     } ]
 *   } ]
 *   createdAt, updatedAt
 * }
 *
 * DayRecord {
 *   date 'YYYY-MM-DD' (local),                         // the key
 *   checks:  { [itemId]: { at: ISO } }                 // check-offs point at item IDs
 *   journal?, food: [ { id, at, text } ],
 *   log?: { [itemId]: {
 *     sets?: [ { reps?, kg?, seconds? } ], seconds?,
 *     readings?: { left?|right?|both?: { value?, outcomeId?, tell?, at } },
 *     took?: { seconds, at, source: 'typed'|'session' },
 *                              // how long it ACTUALLY took, which is not the
 *                              // same as `seconds` (a duration-tracked dose).
 *                              // `source` is kept because a person saying and
 *                              // the runner measuring are different claims,
 *                              // and a typed one always wins.
 *   } },                       // what was actually done — beside the checks,
 *                              // never inside them, so a tap cannot erase it.
 *                              // A reading keeps the words its outcome had at
 *                              // the time (D20): reword the card later and the
 *                              // record still says what was seen.
 *   waterMl?: number,          // canonical millilitres; absent = never logged
 *                              // (ruling A); 0 only ever user-made
 *   waterFromGlasses?: number, // provenance: converted from a v0.2 "glasses"
 *                              // count by the schema-2 rung, not logged
 *   checkIn?: { [metricId]: number|string },
 *   updatedAt
 * }
 *
 * LabResult {
 *   id, date 'YYYY-MM-DD', testId, testName,
 *   value, unit?, printedRange?,                       // the range ON the report — never shipped ranges
 *   photoRef?, notes?,
 *   sources?: { manual?: {value, unit}, ai?: {value, unit} },  // dual-entry validation inputs
 *   updatedAt
 * }
 * ------------------------------------------------------------------ */
