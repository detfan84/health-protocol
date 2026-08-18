// Protocol editor tests. The editor's core is pure ops (editorOps.js); these
// prove the rules the editor must never break: what it builds is valid in the
// published format, ids are permanent, editing the plan never rewrites
// history, and everything it makes survives the round-trip gate.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  newProtocol,
  setProtocolFields,
  addPhase,
  updatePhase,
  removePhase,
  addBlock,
  updateBlock,
  removeBlock,
  moveBlock,
  addItem,
  updateItem,
  removeItem,
  toggleItemPhase,
} from '../src/app/editorOps.js';
import { toggleCheck } from '../src/app/trackerOps.js';
import * as store from '../src/app/store.js';
import { validateFile } from '../src/lib/protocolFile.js';
import { FILE_FORMAT, STORES } from '../src/lib/schema.js';
import { getAll } from '../src/lib/db.js';

let n = 0;
async function freshStore() {
  store._resetForTests();
  return store.ready({ name: `editor-test-${++n}` });
}

/** Build a realistic protocol entirely through the editor's ops. */
function buildViaEditor() {
  let p = newProtocol('Nervous-system foundation');
  p = setProtocolFields(p, { active: true, notes: 'Built in the editor test' });
  p = addPhase(p, { name: 'Settle', days: 14 });
  p = addPhase(p, { name: 'Build', days: 28 });
  p = addBlock(p, { name: 'Morning', start: '07:00', end: '09:00' });
  p = addBlock(p, { name: 'Evening wind-down', start: '20:30' });
  const [morning, evening] = p.blocks;
  p = addItem(p, morning.id, {
    name: 'Box breathing',
    why: 'Downregulation before anything else',
  });
  p = addItem(p, morning.id, { name: 'Electrolyte water', dose: '500 ml' });
  p = addItem(p, evening.id, { name: 'Hip release', why: 'Let the day out of the tissue' });
  // tag the hip release to the Build phase only
  const buildPhase = p.phases[1];
  p = toggleItemPhase(p, evening.id, p.blocks[1].items[0].id, buildPhase.id);
  return p;
}

/* ------------------------------ validity ------------------------------ */

test('editor: what it builds is valid in the published format, no repairs needed', () => {
  const p = buildViaEditor();
  const res = validateFile({ format: FILE_FORMAT, kind: 'protocol', protocol: p });
  assert.equal(res.ok, true);
  assert.equal(res.errors.length, 0);
  assert.equal(res.warnings.length, 0); // nothing to repair — the editor emits clean records
  assert.equal(res.value.protocol.blocks.length, 2);
  assert.equal(res.value.protocol.phases.length, 2);
});

test('editor ops are pure and ids are permanent across renames', () => {
  const before = buildViaEditor();
  const frozen = JSON.stringify(before);
  const itemId = before.blocks[0].items[0].id;

  const renamed = updateItem(before, before.blocks[0].id, itemId, { name: 'Slow nasal breathing' });
  assert.equal(JSON.stringify(before), frozen); // input untouched
  assert.equal(renamed.blocks[0].items[0].id, itemId); // same id, new label
  assert.equal(renamed.blocks[0].items[0].name, 'Slow nasal breathing');

  const rePhased = updatePhase(before, before.phases[0].id, { name: 'Ground', days: 21 });
  assert.equal(rePhased.phases[0].id, before.phases[0].id);
  assert.equal(rePhased.phases[0].days, 21);

  const reordered = moveBlock(before, before.blocks[1].id, -1);
  assert.equal(reordered.blocks[0].name, 'Evening wind-down');
  assert.deepEqual(reordered.blocks.map((b) => b.order), [0, 1]); // orders resettled
});

test('editor: clearing an optional field removes it instead of storing junk', () => {
  let p = buildViaEditor();
  const b = p.blocks[0];
  p = updateBlock(p, b.id, { end: '' });
  assert.equal(p.blocks[0].end, undefined);
  p = updateItem(p, p.blocks[0].id, p.blocks[0].items[1].id, { dose: '   ' });
  assert.equal(p.blocks[0].items[1].dose, undefined);
});

test('removing a phase untags its items — nothing becomes silently hidden', () => {
  let p = buildViaEditor();
  const buildPhase = p.phases[1];
  const eveningBlock = p.blocks[1];
  assert.deepEqual(p.blocks[1].items[0].phaseIds, [buildPhase.id]); // tagged before

  p = removePhase(p, buildPhase.id);
  assert.equal(p.phases.length, 1);
  assert.equal(p.blocks[1].items[0].phaseIds, undefined); // untagged → visible everywhere
  assert.equal(p.blocks[1].id, eveningBlock.id); // blocks untouched otherwise
});

/* ----------------------- plan/record separation ----------------------- */

test('SEPARATION: editing the plan never rewrites history', async () => {
  await freshStore();
  let p = buildViaEditor();
  p = await store.saveProtocol(p);

  // A check-off happens against the breathing item…
  const breathId = p.blocks[0].items[0].id;
  let day = await store.loadDay('2026-08-17');
  day = toggleCheck(day, breathId, '2026-08-17T07:05:00.000Z');
  await store.saveDay(day);

  // …then the item is removed from the plan and the plan is saved.
  p = removeItem(p, p.blocks[0].id, breathId);
  await store.saveProtocol(p);

  const savedDay = await store.loadDay('2026-08-17');
  assert.deepEqual(savedDay.checks[breathId], { at: '2026-08-17T07:05:00.000Z' }); // history intact
  const savedProt = await store.loadProtocol(p.id);
  assert.equal(savedProt.blocks[0].items.find((i) => i.id === breathId), undefined); // plan changed
});

test('deleting a protocol removes the plan only; day records stay', async () => {
  const db = await freshStore();
  let p = buildViaEditor();
  p = await store.saveProtocol(p);
  let day = await store.loadDay('2026-08-16');
  day = toggleCheck(day, p.blocks[0].items[0].id);
  await store.saveDay(day);

  await store.deleteProtocol(p.id);
  assert.equal(await store.loadProtocol(p.id), undefined);
  const days = await getAll(db, STORES.DAYS);
  assert.equal(days.length, 1); // what happened is still what happened
});

/* --------------------- the gate, editor edition ----------------------- */

test('ROUND-TRIP: a protocol built in the editor + a tracked day lose nothing', async () => {
  await freshStore();
  let p = buildViaEditor();
  p = await store.saveProtocol(p);

  let day = await store.loadDay('2026-08-17');
  day = toggleCheck(day, p.blocks[0].items[1].id, '2026-08-17T07:10:00.000Z');
  await store.saveDay(day);

  const backup = await store.exportBackup();
  await store.eraseEverything();
  assert.deepEqual(await store.loadProtocols(), []); // truly gone

  const res = await store.importBackup(backup);
  assert.equal(res.ok, true);
  const after = await store.exportBackup();
  assert.deepEqual(after.data, backup.data); // NOTHING lost — including editor-built plans
});
