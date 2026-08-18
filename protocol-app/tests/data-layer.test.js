// Phase 1 keystone tests. The round-trip test at the bottom is the roadmap's
// finish line, written on day one: export → wipe → import loses nothing.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { newerWins, mergeCollections, localDateKey } from '../src/lib/core.js';
import {
  validateFile,
  mergeFragmentIntoProtocol,
} from '../src/lib/protocolFile.js';
import { openDb, put, getAll, exportAll, wipe, importMerge } from '../src/lib/db.js';
import { FILE_FORMAT, STORES } from '../src/lib/schema.js';

/* ------------------------------ helpers ----------------------------- */

let dbCount = 0;
async function freshDb() {
  // unique name per test — fake-indexeddb keeps databases per-process
  return openDb({ name: `test-db-${++dbCount}` });
}

function sampleProtocol() {
  return {
    id: 'prot-1',
    name: 'Morning foundation',
    active: true,
    phases: [{ id: 'ph-1', name: 'Weeks 1–2', days: 14, order: 0 }],
    blocks: [
      {
        id: 'blk-morning',
        name: 'Morning',
        start: '07:00',
        order: 0,
        items: [
          { id: 'it-breath', name: 'Box breathing', why: 'Downregulation first' },
          { id: 'it-water', name: 'Electrolyte water', dose: '500 ml' },
        ],
      },
    ],
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  };
}

function backupFile(data) {
  return {
    format: FILE_FORMAT,
    kind: 'backup',
    schemaVersion: 1,
    exportedAt: '2026-08-10T00:00:00.000Z',
    data: { protocols: [], days: [], labs: [], settings: [], ...data },
  };
}

/* ----------------------------- core tests --------------------------- */

test('localDateKey uses the local calendar day, zero-padded', () => {
  const d = new Date(2026, 0, 5, 21, 30); // Jan 5, 9:30pm LOCAL
  assert.equal(localDateKey(d), '2026-01-05');
});

test('newerWins: later updatedAt wins; ties and missing keep local', () => {
  const a = { updatedAt: '2026-08-01T00:00:00Z', v: 'old' };
  const b = { updatedAt: '2026-08-02T00:00:00Z', v: 'new' };
  assert.equal(newerWins(a, b).v, 'new');
  assert.equal(newerWins(b, a).v, 'new');
  assert.equal(newerWins(a, { ...a, v: 'tie' }).v, 'old'); // tie → local
  assert.equal(newerWins(null, b).v, 'new');
  assert.equal(newerWins(a, null).v, 'old');
});

test('mergeCollections never deletes and reports honest stats', () => {
  const local = [
    { id: 'x', updatedAt: '2026-08-05T00:00:00Z', note: 'fresh local' },
    { id: 'only-local', updatedAt: '2026-08-01T00:00:00Z' },
  ];
  const incoming = [
    { id: 'x', updatedAt: '2026-08-01T00:00:00Z', note: 'stale import' },
    { id: 'only-import', updatedAt: '2026-08-02T00:00:00Z' },
  ];
  const { merged, stats } = mergeCollections(local, incoming, (r) => r.id);
  const byId = Object.fromEntries(merged.map((r) => [r.id, r]));
  assert.equal(byId['x'].note, 'fresh local'); // stale backup cannot bulldoze
  assert.ok(byId['only-local']); // nothing deleted
  assert.ok(byId['only-import']); // new records added
  assert.deepEqual(stats, { added: 1, updated: 0, kept: 1 });
});

/* --------------------------- validator tests ------------------------- */

test('validator: clean protocol file passes untouched', () => {
  const res = validateFile({
    format: FILE_FORMAT,
    kind: 'protocol',
    protocol: sampleProtocol(),
  });
  assert.equal(res.ok, true);
  assert.equal(res.value.protocol.name, 'Morning foundation');
  assert.equal(res.errors.length, 0);
});

test('validator: forgives AI sloppiness — string numbers, missing ids, stray whitespace', () => {
  const res = validateFile({
    format: FILE_FORMAT,
    kind: 'protocol',
    protocol: {
      name: '  Gut reset  ',
      phases: [{ name: 'Ramp', days: '14' }], // days as a string
      blocks: [
        {
          name: 'Evening',
          start: '7:30', // one-digit hour
          items: [{ name: ' Magnesium ' }], // no id, padded name
        },
      ],
    },
  });
  assert.equal(res.ok, true);
  const p = res.value.protocol;
  assert.equal(p.name, 'Gut reset');
  assert.equal(p.phases[0].days, 14);
  assert.equal(p.blocks[0].start, '07:30');
  assert.equal(p.blocks[0].items[0].name, 'Magnesium');
  assert.ok(p.blocks[0].items[0].id); // generated
  assert.ok(res.warnings.length >= 2); // repairs were reported, not hidden
});

test('validator: failures are kind and specific, never a shrug', () => {
  const res = validateFile({ format: FILE_FORMAT, kind: 'protocol', protocol: { blocks: [{ items: [] }] } });
  assert.equal(res.ok, false);
  const messages = res.errors.map((e) => e.path + ': ' + e.message).join(' | ');
  assert.match(messages, /protocol\.name/); // says WHERE
  assert.ok(res.errors.every((e) => e.hint || e.message.length > 10)); // says HOW to fix

  const notJson = validateFile('Here is your protocol! ```json {"a":1}```');
  assert.equal(notJson.ok, false);
  assert.match(notJson.errors[0].hint, /only the JSON/); // the exact AI failure mode
});

test('validator: wrong format is caught with the fix in the hint', () => {
  const res = validateFile({ kind: 'backup', data: {} });
  assert.equal(res.ok, false);
  assert.equal(res.errors[0].path, 'format');
  assert.match(res.errors[0].hint, new RegExp(FILE_FORMAT));
});

/* ------------------------ composition (fragments) --------------------- */

test('fragment merges into a protocol: adds blocks/items, never clobbers', () => {
  const base = sampleProtocol();
  const fragRes = validateFile({
    format: FILE_FORMAT,
    kind: 'fragment',
    protocol: {
      name: 'Fascia module',
      blocks: [
        {
          id: 'blk-morning', // same block — items should union
          name: 'Morning',
          items: [{ id: 'it-feet', name: 'Foot rollout', why: 'Wake the chain from the ground up' }],
        },
        {
          id: 'blk-evening', // new block — should append
          name: 'Evening wind-down',
          items: [{ id: 'it-release', name: 'Hip release' }],
        },
      ],
    },
  });
  assert.equal(fragRes.ok, true);

  const merged = mergeFragmentIntoProtocol(base, fragRes.value.protocol);
  const morning = merged.blocks.find((b) => b.id === 'blk-morning');
  assert.equal(morning.items.length, 3); // 2 original + 1 new
  assert.ok(morning.items.find((i) => i.id === 'it-breath')); // originals intact
  assert.ok(merged.blocks.find((b) => b.id === 'blk-evening')); // appended
  assert.equal(base.blocks[0].items.length, 2); // input untouched (pure)
});

/* --------------------------- round-trip (the gate) -------------------- */

test('ROUND-TRIP: export → wipe → import loses nothing', async () => {
  const db = await freshDb();
  const day = {
    date: '2026-08-16',
    checks: { 'it-breath': { at: '2026-08-16T07:05:00Z' } },
    journal: 'Feet waking up. Calves talking.',
    food: [{ id: 'f1', at: '2026-08-16T12:00:00Z', text: 'Bone broth' }],
    water: 6,
    updatedAt: '2026-08-16T21:00:00Z',
  };
  const lab = {
    id: 'lab-1',
    date: '2026-07-30',
    testId: 'ferritin',
    testName: 'Ferritin',
    value: 42,
    unit: 'ng/mL',
    printedRange: '30–400',
    updatedAt: '2026-07-31T00:00:00Z',
  };
  await put(db, STORES.PROTOCOLS, sampleProtocol());
  await put(db, STORES.DAYS, day);
  await put(db, STORES.LABS, lab);
  await put(db, STORES.SETTINGS, { key: 'darkMode', value: true, updatedAt: '2026-08-01T00:00:00Z' });

  const backup = await exportAll(db);
  await wipe(db);
  assert.deepEqual(await getAll(db, STORES.DAYS), []); // truly gone

  const res = await importMerge(db, backup);
  assert.equal(res.ok, true);

  const after = await exportAll(db);
  assert.deepEqual(after.data, backup.data); // NOTHING lost
  assert.equal(res.stats[STORES.DAYS].added, 1);
});

test('import merge: stale backup cannot bulldoze fresh data; imports never delete', async () => {
  const db = await freshDb();
  const freshDay = {
    date: '2026-08-16',
    journal: 'fresh entry, written today',
    water: 8,
    updatedAt: '2026-08-16T22:00:00Z',
  };
  const localOnlyDay = { date: '2026-08-15', journal: 'only on device', updatedAt: '2026-08-15T21:00:00Z' };
  await put(db, STORES.DAYS, freshDay);
  await put(db, STORES.DAYS, localOnlyDay);

  const staleBackup = backupFile({
    days: [
      { date: '2026-08-16', journal: 'old backup version', water: 2, updatedAt: '2026-08-10T00:00:00Z' },
      { date: '2026-08-14', journal: 'only in backup', updatedAt: '2026-08-14T20:00:00Z' },
    ],
  });

  const res = await importMerge(db, staleBackup);
  assert.equal(res.ok, true);
  const days = Object.fromEntries((await getAll(db, STORES.DAYS)).map((d) => [d.date, d]));
  assert.equal(days['2026-08-16'].journal, 'fresh entry, written today'); // fresh wins
  assert.ok(days['2026-08-15']); // never deleted
  assert.equal(days['2026-08-14'].journal, 'only in backup'); // new added
  assert.deepEqual(res.stats[STORES.DAYS], { added: 1, updated: 0, kept: 1 });
});

test('import: a protocol file aimed at the backup importer gets a helpful redirect', async () => {
  const db = await freshDb();
  const res = await importMerge(db, {
    format: FILE_FORMAT,
    kind: 'protocol',
    protocol: sampleProtocol(),
  });
  assert.equal(res.ok, false);
  assert.match(res.errors[0].hint, /Protocols screen/);
});
