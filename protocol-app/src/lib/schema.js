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
    // **Nothing stored is transformed, and that is the correct behaviour.** An
    // item saved before this rung has no facets — not empty ones, not defaults.
    // Absence means nobody has said, which is a different fact from "none", and
    // the three-state rule (D24) makes it the app's job to keep them apart. A
    // rung that helpfully wrote `effect: []` onto nine hundred old items would
    // be inventing an answer on their behalf.
    //
    // So why a rung at all, when IndexedDB stores whatever shape it is handed
    // and `tier` and `carefulAudience` were both added without one? Because in
    // this codebase SCHEMA_VERSION is one number doing two jobs: the database
    // version AND the `schemaVersion` stamped into every exported file. The
    // file format's MEANING changed here — a v3 backup can carry facets a v2
    // app would silently drop on import — so the number has to move, and moving
    // it moves the database version with it. The ladder is append-only, so the
    // rung is recorded even though its work is nil.
    //
    // The other half of that argument is in protocolFile.js, which until now
    // read `schemaVersion` and never once looked at it.
    to: 3,
    run() {},
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
 *       tracking?: 'check' | 'sets' | 'duration',   // how it is logged (4.2)
 *       target?: { sets?, reps?, seconds? },        // what the plan asks for
 *       fields?: { tool?, release?, load?, notice?, careful? },  // K3
 *       photos?: [ { set, caption?, approx? } ],   // two frames per set
 *
 *       // The facets (schema 3, docs/TAXONOMY.md §2). Values are ids from
 *       // src/content/vocab/*.json — data, never enums in code (D40), so the
 *       // validator checks the SHAPE and never the vocabulary.
 *       type?: 'practice' | 'measurement' | 'teaching' | 'intake' | 'record',
 *       effect?: [],        // release, load, calm…      — the ledger's words
 *       tissue?: [],        // muscle, fascia, nerve…    — multi, on purpose
 *       anatomy?: [],       // node ids from anatomy.json
 *       technique?: string, // how it is done
 *       context?: [],       // floor, bed, chair, desk…
 *       equipment?: [],     // ball, band, kettlebell…
 *       demands?: [],       // what it needs available (§6)
 *       performedBy?: 'self' | 'practitioner',
 *       tradition?: string,
 *
 *       // NOTE the field is `anatomy`, not `target`. TAXONOMY.md calls the
 *       // facet "target", and `target` on an item has meant sets/reps/seconds
 *       // since PLAN §4.2. Two different questions cannot share one key on the
 *       // same object, and the older meaning keeps the name.
 *     } ]
 *   } ]
 *   createdAt, updatedAt
 * }
 *
 * DayRecord {
 *   date 'YYYY-MM-DD' (local),                         // the key
 *   checks:  { [itemId]: { at: ISO } }                 // check-offs point at item IDs
 *   journal?, food: [ { id, at, text } ],
 *   log?: { [itemId]: { sets?: [ { reps?, kg?, seconds? } ], seconds? } },
 *                              // what was actually done — beside the checks,
 *                              // never inside them, so a tap cannot erase it
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
