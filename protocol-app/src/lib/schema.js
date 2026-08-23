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
export const SCHEMA_VERSION = 2;

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
