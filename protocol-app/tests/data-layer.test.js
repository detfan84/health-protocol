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
import { FILE_FORMAT, STORES, SCHEMA_VERSION } from '../src/lib/schema.js';

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

test('validator: the rung a person is actually on survives the round trip', () => {
  // A catalogue item holds the whole ladder; the plan item holds the chosen
  // rung. Before this field existed everybody's day said rung 1, which is the
  // app quietly contradicting whoever set the rung.
  const res = validateFile({
    format: FILE_FORMAT,
    kind: 'protocol',
    protocol: {
      name: 'Eyes and balance',
      blocks: [{
        name: 'Session',
        items: [
          { name: 'Tracing a path with a laser', activeLevel: 2, dose: 'Hand-held' },
          { name: 'Eye jumps', activeLevel: '3' },      // string, coerced
          { name: 'Walking scoop', activeLevel: 'two' }, // nonsense, ignored
          { name: 'Side lunge' },                        // absent stays absent
        ],
      }],
    },
  });
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  const items = res.value.protocol.blocks[0].items;
  assert.equal(items[0].activeLevel, 2, 'the chosen rung is kept');
  assert.equal(items[1].activeLevel, 3, 'a numeric string is coerced, like every other number here');
  assert.equal(items[2].activeLevel, undefined, 'nonsense is dropped rather than guessed');
  assert.equal(items[3].activeLevel, undefined, 'no rung chosen stays no rung chosen');
  assert.ok(
    res.warnings.some((w) => /activeLevel/.test(w.path)),
    'the dropped rung is reported, not hidden',
  );
});

test('validator: an image records whether anybody has actually looked at it', () => {
  // D38 as amended (Kevin, 28 Aug): images ship found-but-unchecked and are
  // confirmed or rejected by doing the thing. `approx` is a different claim —
  // "close, not exactly this drill" — and the two coexist.
  const res = validateFile({
    format: FILE_FORMAT,
    kind: 'protocol',
    protocol: {
      name: 'Body work',
      blocks: [{
        name: 'Release',
        items: [{
          name: 'Base of skull',
          photos: [
            { set: 'A_Set', status: 'checked' },
            { set: 'B_Set', status: 'rejected', rejectedReason: 'the model is holding the position, not moving through it' },
            { set: 'C_Set', status: 'rejected' },                      // no reason
            { set: 'D_Set', status: 'looks-fine' },                    // not a status
            { set: 'E_Set', status: 'checked', rejectedReason: 'stale' }, // reason without a rejection
            { set: 'F_Set', approx: true, status: 'found-unchecked' },  // both claims
            { set: 'G_Set' },                                           // absent stays absent
          ],
        }],
      }],
    },
  });
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  const photos = res.value.protocol.blocks[0].items[0].photos;
  const bySet = Object.fromEntries(photos.map((ph) => [ph.set, ph]));

  assert.equal(bySet.A_Set.status, 'checked');
  assert.equal(bySet.B_Set.status, 'rejected');
  assert.match(bySet.B_Set.rejectedReason, /holding the position/, 'the reason is kept — it is the whole point of a rejection');
  assert.equal(bySet.C_Set.status, 'rejected', 'a reasonless rejection is still a rejection, not a discard');
  assert.equal(bySet.C_Set.rejectedReason, undefined);
  assert.equal(bySet.D_Set.status, undefined, 'an unknown status is ignored rather than invented');
  assert.equal(bySet.E_Set.rejectedReason, undefined, 'a reason means nothing without a rejection');
  assert.equal(bySet.F_Set.approx, true, 'approx and status are different claims');
  assert.equal(bySet.F_Set.status, 'found-unchecked');
  assert.equal(bySet.G_Set.status, undefined, 'nobody has looked is not the same as unchecked-was-chosen');

  const paths = res.warnings.map((w) => w.path).join(' ');
  for (const i of [2, 3, 4]) {
    assert.match(paths, new RegExp(`photos\\[${i}\\]`), `photo ${i} was repaired and said so`);
  }
});

test('validator: who a careful line is for survives into the day', () => {
  // D29 as applied in strategy v0.5 §9A. The tag used to be authored inside
  // `fields`, which the validator filters to the five K3 keys — so the gating
  // model's own input never reached the day it was supposed to gate.
  const res = validateFile({
    format: FILE_FORMAT,
    kind: 'protocol',
    protocol: {
      name: 'Entry points',
      blocks: [{
        name: 'Desk',
        items: [
          { name: 'The jaw muscle', carefulAudience: 'hypermobile' },
          { name: 'Knee to chest', carefulAudience: 'hypermobile, Orthostatic' },
          { name: 'Laser trace', carefulAudience: ['orthostatic', 'hypermobile', 'orthostatic'] },
          { name: 'Eye jumps', carefulAudience: '  ' },
          { name: 'Nose breathing' },
          { name: 'Old shape', fields: { careful: 'Go gently.', carefulAudience: 'hypermobile' } },
        ],
      }],
    },
  });
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  const it = res.value.protocol.blocks[0].items;

  assert.deepEqual(it[0].carefulAudience, ['hypermobile'], 'a single tag becomes a list');
  assert.deepEqual(it[1].carefulAudience, ['hypermobile', 'orthostatic'], 'a comma list splits and lowercases');
  assert.deepEqual(it[2].carefulAudience, ['orthostatic', 'hypermobile'], 'an array is kept, deduped, in order');
  assert.equal(it[3].carefulAudience, undefined, 'empty gates nobody');
  assert.equal(it[4].carefulAudience, undefined, 'ungated content stays ungated');

  // The old placement is still filtered out — which is why build-catalog.mjs
  // refuses to ship it rather than leaving it to be discovered here.
  assert.equal(it[5].fields.careful, 'Go gently.', 'the careful text survives');
  assert.equal(it[5].fields.carefulAudience, undefined, 'the tag inside fields does not');
  assert.equal(it[5].carefulAudience, undefined);
});

test('validator: an audience it has never heard of is carried, not dropped', () => {
  // D40: a vocabulary is a census, not a cap. S4 rules on the audience list;
  // until then this file guessing which tags are legitimate would be the
  // validator inventing content policy.
  const res = validateFile({
    format: FILE_FORMAT, kind: 'protocol',
    protocol: { name: 'x', blocks: [{ name: 'b', items: [{ name: 'i', carefulAudience: 'post-surgical' }] }] },
  });
  assert.deepEqual(res.value.protocol.blocks[0].items[0].carefulAudience, ['post-surgical']);
});

test('validator: the tier travels into the day, because a hedge that stops at the library erodes', () => {
  // Canon 3.8's mechanism, across surfaces rather than document generations:
  // the library says "worth trying", the day says nothing, and by the fortieth
  // repetition the drill is just something you do.
  const res = validateFile({
    format: FILE_FORMAT, kind: 'protocol',
    protocol: {
      name: 'Eyes',
      blocks: [{
        name: 'Session',
        items: [
          { name: 'Eye jumps', tier: 'exploratory' },
          { name: 'Walking scoop', tier: 'established' },
          { name: 'Something new', tier: 'provisional' }, // unknown, kept + reported
          { name: 'Ungraded' },
        ],
      }],
    },
  });
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  const it = res.value.protocol.blocks[0].items;
  assert.equal(it[0].tier, 'exploratory');
  assert.equal(it[1].tier, 'established');
  assert.equal(it[2].tier, 'provisional', 'a label nobody recognised is still one somebody wrote on purpose');
  assert.ok(res.warnings.some((w) => /tier/.test(w.path)), 'and it is reported rather than accepted silently');
  assert.equal(it[3].tier, undefined, 'ungraded stays ungraded — no default tier is invented');
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

/** One protocol file wrapping one item — the shortest thing the validator takes. */
function protocolFile(item) {
  return {
    format: 'protocol-app/v1',
    kind: 'protocol',
    schemaVersion: SCHEMA_VERSION,
    protocol: { id: 'p', name: 'P', active: true, phases: [], blocks: [{ id: 'b', name: 'B', order: 0, items: [item] }] },
  };
}

/* ------------------------- the facets, schema 3 ------------------------- */
// docs/TAXONOMY.md §9.3. These used to die at the door: viewLibrary translated
// a handful of fields on the way into a day and the validator had no slot for
// the rest, so what an item WAS stopped being known the moment it was yours.

test('an item carries its facets through validation', () => {
  const r = validateFile(JSON.stringify(protocolFile({
    id: 'i1', name: '90/90 Hip Switch',
    type: 'practice', technique: 'tech-contract-relax', performedBy: 'self', tradition: 'physio',
    effect: ['mobilise'], tissue: ['muscle', 'fascia', 'nerve'],
    target: ['hip', 'hip-external-rotation'], context: ['floor'],
    equipment: ['none'], demands: ['room'],
  })));
  assert.equal(r.ok, true);
  const item = r.value.protocol.blocks[0].items[0];
  assert.equal(item.type, 'practice');
  assert.equal(item.technique, 'tech-contract-relax');
  assert.deepEqual(item.tissue, ['muscle', 'fascia', 'nerve']);
  assert.deepEqual(item.target, ['hip', 'hip-external-rotation']);
  assert.deepEqual(item.demands, ['room']);
});

test('an unrecognised facet value is kept, because somebody wrote it on purpose', () => {
  // D40: a vocabulary is data. A validator that decides which values are
  // legitimate is a validator writing content policy — the same reasoning that
  // already governs carefulAudience. check-vocab polices vocabulary; this
  // file polices shape.
  const r = validateFile(JSON.stringify(protocolFile({
    id: 'i1', name: 'Dry needling', effect: ['release'], technique: 'tech-needling',
    tissue: ['muscle', 'fascia', 'nerve'], target: ['some-node-nobody-has-authored-yet'],
  })));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.protocol.blocks[0].items[0].target, ['some-node-nobody-has-authored-yet']);
});

test('absent facets stay absent — an untagged item is not an item tagged with nothing', () => {
  const r = validateFile(JSON.stringify(protocolFile({ id: 'i1', name: 'Walk' })));
  const item = r.value.protocol.blocks[0].items[0];
  for (const k of ['type', 'effect', 'tissue', 'target', 'context', 'equipment', 'demands', 'performedBy', 'amount']) {
    assert.ok(!(k in item), `${k} should be absent, not empty`);
  }
});

test('a facet handed a single value instead of a list is reported, not silently kept', () => {
  const r = validateFile(JSON.stringify(protocolFile({ id: 'i1', name: 'Walk', effect: 'release' })));
  assert.ok(!('effect' in r.value.protocol.blocks[0].items[0]));
  assert.ok(r.warnings.some((w) => w.path.endsWith('.effect')), 'the person is told it was ignored');
});

test('duplicates within one facet collapse', () => {
  const r = validateFile(JSON.stringify(protocolFile({
    id: 'i1', name: 'Walk', target: ['hip', 'hip', ' hip '],
  })));
  assert.deepEqual(r.value.protocol.blocks[0].items[0].target, ['hip']);
});

test('a file from a newer app is imported with a warning, not silently thinned', () => {
  // Until schema 3 this number was read, stored, and never looked at, so a
  // newer file imported clean and whatever this version had no slot for went
  // with it. Carrying on with less while looking fine is what D24 forbids.
  const r = validateFile(JSON.stringify({ ...protocolFile({ id: 'i1', name: 'Walk' }), schemaVersion: 99 }));
  assert.equal(r.ok, true, 'most of a newer file is ordinary and must still import');
  assert.ok(r.warnings.some((w) => w.path === 'schemaVersion' && /newer version/.test(w.message)));
});

test('a file from this version or older says nothing about versions', () => {
  for (const v of [SCHEMA_VERSION, 1, undefined]) {
    const f = protocolFile({ id: 'i1', name: 'Walk' });
    if (v === undefined) delete f.schemaVersion; else f.schemaVersion = v;
    const r = validateFile(JSON.stringify(f));
    assert.ok(!r.warnings.some((w) => w.path === 'schemaVersion'), `version ${v} should not warn`);
  }
});

/* ---------------- the rename: current structure wins the name ------------ */
// Kevin, 29 Aug: reformat things to fit the current structure rather than
// letting older versions dictate what happens now. `target` on an item meant
// sets/reps/seconds since PLAN §4.2; TAXONOMY.md §2.1 names the anatomy facet
// "target". The dose moved to `amount` rather than the facet taking second
// choice, and old files are translated on the way in.

test('a file written before the rename still imports, with the dose intact', () => {
  const f = protocolFile({ id: 'i1', name: 'Plank', tracking: 'duration', target: { seconds: 30 } });
  f.schemaVersion = 2;
  const r = validateFile(JSON.stringify(f));
  const item = r.value.protocol.blocks[0].items[0];
  assert.deepEqual(item.amount, { seconds: 30 }, 'read from the old key, saved under the new one');
  assert.ok(!('target' in item), 'and the old key does not survive as anatomy');
});

test('the reader is told the shape moved — once for the file, not once per item', () => {
  const f = protocolFile({ id: 'i1', name: 'Plank', target: { seconds: 30 } });
  f.protocol.blocks[0].items.push({ id: 'i2', name: 'Squat', target: { sets: 3, reps: 10 } });
  f.schemaVersion = 2;
  const r = validateFile(JSON.stringify(f));
  const notices = r.warnings.filter((w) => /"target"/.test(w.message));
  assert.equal(notices.length, 1, 'a backup with hundreds of items must not shout hundreds of times');
  assert.match(notices[0].message, /nothing was lost/i);
});

test('the two meanings are told apart by shape, so a current file is untouched', () => {
  const r = validateFile(JSON.stringify(protocolFile({
    id: 'i1', name: '90/90', target: ['hip'], amount: { seconds: 45 },
  })));
  const item = r.value.protocol.blocks[0].items[0];
  assert.deepEqual(item.target, ['hip'], 'a list is the facet');
  assert.deepEqual(item.amount, { seconds: 45 }, 'an object under amount is the dose');
  assert.ok(!r.warnings.some((w) => /"target"/.test(w.message)), 'and nothing is reported, because nothing was legacy');
});

test('amount wins when a file somehow carries both meanings on one item', () => {
  const r = validateFile(JSON.stringify(protocolFile({
    id: 'i1', name: 'Plank', target: { seconds: 30 }, amount: { seconds: 45 },
  })));
  assert.deepEqual(r.value.protocol.blocks[0].items[0].amount, { seconds: 45 }, 'the current key is the current answer');
});
