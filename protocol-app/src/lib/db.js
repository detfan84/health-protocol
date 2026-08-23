// db.js — the storage layer. IndexedDB, opened through the migration ladder.
// Import MERGES and never replaces; nothing is ever deleted by an import.
//
// Fail-loudly layer (ruling B, Aug 18 2026): every operation here rejects
// with a contextual error — which operation, which store, and the original
// browser error as `cause` — so the announcer upstream can speak plainly.
// Nothing in this file swallows a failure, and a transaction either
// completes whole or rejects; the import writes ALL stores in ONE
// transaction, so a mid-import failure applies nothing (ruling B, point 6).

import { DB_NAME, SCHEMA_VERSION, STORES, MIGRATIONS, FILE_FORMAT } from './schema.js';
import { mergeCollections, nowIso } from './core.js';
import { validateFile } from './protocolFile.js';

/** Wrap a raw storage error with what was being attempted, keeping the
 *  original as `cause` and its name for plain-language mapping upstream. */
function ctx(action, storeNames, cause) {
  const where = Array.isArray(storeNames) ? storeNames.join(' + ') : String(storeNames);
  const base = cause?.message || cause?.name || 'unknown storage error';
  const e = new Error(`${action} ("${where}") failed: ${base}`);
  if (cause?.name) e.name = cause.name;
  e.cause = cause;
  return e;
}

/** Open (and if needed upgrade) the database. Resolves to an IDBDatabase. */
export function openDb({ name = DB_NAME, factory = globalThis.indexedDB } = {}) {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = factory.open(name, SCHEMA_VERSION);
    } catch (err) {
      reject(ctx('Opening the database', name, err));
      return;
    }
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      for (const rung of MIGRATIONS) {
        if (rung.to > ev.oldVersion) rung.run(db, req.transaction);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(ctx('Opening the database', name, req.error));
    req.onblocked = () =>
      reject(ctx('Opening the database', name, new Error('blocked by another tab')));
  });
}

/** One transaction, completed whole or rejected with context. The body runs
 *  synchronously against the transaction; a body that throws aborts it. */
function tx(db, stores, mode, body, action = 'A storage operation') {
  return new Promise((resolve, reject) => {
    let t;
    try {
      t = db.transaction(stores, mode);
    } catch (err) {
      reject(ctx(action, stores, err));
      return;
    }
    let out;
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(ctx(action, stores, t.error));
    t.onabort = () => reject(ctx(action, stores, t.error ?? new Error('transaction aborted')));
    try {
      out = body(t);
    } catch (err) {
      try { t.abort(); } catch { /* already dead — the reject above fires */ }
      reject(ctx(action, stores, err));
    }
  });
}

/** One read request, resolved with its result or rejected with context. */
function read(db, store, action, run) {
  return new Promise((resolve, reject) => {
    let req;
    try {
      const t = db.transaction([store], 'readonly');
      req = run(t.objectStore(store));
    } catch (err) {
      reject(ctx(action, store, err));
      return;
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(ctx(action, store, req.error));
  });
}

/* ------------------------------ CRUD ------------------------------- */

export function put(db, store, value) {
  return tx(db, [store], 'readwrite', (t) => {
    t.objectStore(store).put(value);
    return value;
  }, 'Saving');
}

export function getOne(db, store, key) {
  return read(db, store, 'Loading', (os) => os.get(key));
}

/**
 * Read a record and write its successor inside ONE transaction.
 *
 * Why this exists: a check-off is read-modify-write, and a morning is
 * seventeen of them as fast as a thumb moves. Done as separate read and write
 * transactions, two taps that overlap both read the same record and the
 * second write erases the first — a tap that painted green and did not
 * happen. That is precisely the silent failure decision 24 forbids, so the
 * whole cycle happens where the database can serialise it.
 *
 * `change(current)` is called with the stored record (undefined if none) and
 * must return the record to store, synchronously — an await inside would let
 * the transaction close underneath it. Returning undefined writes nothing.
 */
export function mutate(db, store, key, change) {
  let out;
  let thrown = null;
  return tx(db, [store], 'readwrite', (t) => {
    const os = t.objectStore(store);
    const req = os.get(key);
    req.onsuccess = () => {
      try {
        out = change(req.result);
        if (out !== undefined) os.put(out);
      } catch (err) {
        // A throw inside a database event handler aborts the transaction and
        // is then lost — the caller would hear "transaction aborted" and never
        // the real reason. Keep it and re-throw it once the abort has landed,
        // so the announcer says what actually went wrong (ruling B).
        thrown = err;
        try { t.abort(); } catch { /* already aborting */ }
      }
    };
    return null;
  }, 'Saving').then(
    () => out,
    (err) => { throw thrown ?? err; },
  );
}

/**
 * The same read-modify-write cycle as `mutate`, across SEVERAL records that
 * may live in different stores — all inside one transaction.
 *
 * A check-off that decrements a supply count is two records in two stores that
 * have to move together: a tick recorded against a bottle that never went down,
 * or a bottle that went down with no tick to explain it, are both records that
 * lie about what happened. Ruling B, point 6 says multi-store mutations happen
 * in one transaction, and this is the machinery for it — either both land or
 * neither does.
 *
 * `targets` is [{ store, key }, …]. `change(currentValues)` receives them in
 * the same order (undefined where nothing is stored) and returns an array of
 * successors, again in order; an `undefined` entry writes nothing. It must be
 * synchronous — an await inside would let the transaction close underneath it.
 */
export function mutateAcross(db, targets, change) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return Promise.reject(ctx('Saving', 'nothing', new Error('no records named')));
  }
  let out;
  let thrown = null;
  const stores = [...new Set(targets.map((t) => t.store))];
  return tx(db, stores, 'readwrite', (t) => {
    const current = new Array(targets.length);
    let pending = targets.length;
    targets.forEach((target, i) => {
      const req = t.objectStore(target.store).get(target.key);
      req.onsuccess = () => {
        current[i] = req.result;
        pending -= 1;
        if (pending > 0) return;
        try {
          out = change(current);
          (out ?? []).forEach((value, j) => {
            if (value !== undefined) t.objectStore(targets[j].store).put(value);
          });
        } catch (err) {
          // Same reason as `mutate`: a throw inside a database event handler
          // aborts the transaction and is then lost. Keep it, re-throw once the
          // abort has landed, so the announcer says what actually went wrong.
          thrown = err;
          try { t.abort(); } catch { /* already aborting */ }
        }
      };
    });
    return null;
  }, 'Saving').then(
    () => out,
    (err) => { throw thrown ?? err; },
  );
}

export function getAll(db, store) {
  return read(db, store, 'Loading', (os) => os.getAll());
}

export function removeOne(db, store, key) {
  return tx(db, [store], 'readwrite', (t) => {
    t.objectStore(store).delete(key);
  }, 'Deleting');
}

/* --------------------------- export / wipe -------------------------- */

const ALL_STORES = [STORES.PROTOCOLS, STORES.DAYS, STORES.LABS, STORES.SETTINGS];

/** Full backup, in the published file format. */
export async function exportAll(db) {
  const [protocols, days, labs, settings] = await Promise.all(
    ALL_STORES.map((s) => getAll(db, s)),
  );
  return {
    format: FILE_FORMAT,
    kind: 'backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    data: { protocols, days, labs, settings },
  };
}

/** Erase everything (user-initiated only — imports NEVER call this).
 *  One transaction across every store: all gone or nothing gone. */
export function wipe(db) {
  return tx(db, ALL_STORES, 'readwrite', (t) => {
    for (const s of ALL_STORES) t.objectStore(s).clear();
  }, 'Erasing');
}

/* ------------------------------ import ------------------------------ */

const KEY_OF = {
  [STORES.PROTOCOLS]: (r) => r.id,
  [STORES.DAYS]: (r) => r.date,
  [STORES.LABS]: (r) => r.id,
  [STORES.SETTINGS]: (r) => r.key,
};

/**
 * Import a backup file. Validates first (forgiving), then merges record by
 * record — newer `updatedAt` wins, nothing is deleted, unknown records are
 * added. All four stores are written in ONE transaction: a failure anywhere
 * applies nothing, so there is no such thing as a half-imported device.
 * Returns { ok, stats?, errors, warnings }.
 */
export async function importMerge(db, fileInput) {
  const v = validateFile(fileInput);
  if (!v.ok) return { ok: false, errors: v.errors, warnings: v.warnings };
  if (v.kind !== 'backup')
    return {
      ok: false,
      errors: [
        {
          path: 'kind',
          message: `This is a "${v.kind}" file, not a backup.`,
          hint:
            v.kind === 'protocol'
              ? 'Import it from the Protocols screen to add it as a plan.'
              : 'Fragments merge into an existing protocol from its edit screen.',
        },
      ],
      warnings: v.warnings,
    };

  const incoming = v.value.data;

  // Read everything first, merge in memory…
  const stats = {};
  const mergedByStore = {};
  for (const store of ALL_STORES) {
    const local = await getAll(db, store);
    const { merged, stats: s } = mergeCollections(local, incoming[store] ?? [], KEY_OF[store]);
    mergedByStore[store] = merged;
    stats[store] = s;
  }

  // …then write it all in one transaction. Whole or not at all.
  await tx(db, ALL_STORES, 'readwrite', (t) => {
    for (const store of ALL_STORES) {
      const os = t.objectStore(store);
      for (const rec of mergedByStore[store]) os.put(rec);
    }
  }, 'Importing');

  return { ok: true, stats, errors: [], warnings: v.warnings };
}
