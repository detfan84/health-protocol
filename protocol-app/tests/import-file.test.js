// The import door. Before this existed the app accepted backups only, while
// telling anyone holding a protocol file to use a screen that had no import
// on it — so a perfectly valid file had nowhere to go. These tests pin the
// behaviour that replaced it, including the rule that matters most: an
// import adds and updates, and never destroys what you already edited.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as store from '../src/app/store.js';
import { FILE_FORMAT } from '../src/lib/schema.js';

let n = 0;
async function freshStore() {
  store._resetForTests();
  return store.ready({ name: `import-test-${++n}` });
}

function protocol(overrides = {}) {
  return {
    id: 'p1',
    name: 'Morning',
    active: true,
    phases: [],
    blocks: [{ id: 'b1', name: 'Wake', order: 0, items: [{ id: 'i1', name: 'Water', phaseIds: [] }] }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const asProtocolFile = (p) => JSON.stringify({
  format: FILE_FORMAT, kind: 'protocol', schemaVersion: 1,
  exportedAt: '2026-01-01T00:00:00.000Z', protocol: p,
});

const asBackup = (protocols) => JSON.stringify({
  format: FILE_FORMAT, kind: 'backup', schemaVersion: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: { protocols, days: [], labs: [], settings: [] },
});

test('a protocol file imports as a protocol', async () => {
  await freshStore();
  const res = await store.importFile(asProtocolFile(protocol()));
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  const saved = await store.loadProtocols();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, 'Morning');
});

test('a backup file still imports', async () => {
  await freshStore();
  const res = await store.importFile(asBackup([protocol(), protocol({ id: 'p2', name: 'Evening' })]));
  assert.equal(res.ok, true, JSON.stringify(res.errors));
  assert.equal((await store.loadProtocols()).length, 2);
});

test('re-importing the same file keeps YOUR edit, not the file\'s version', async () => {
  await freshStore();
  await store.importFile(asProtocolFile(protocol()));

  // edit locally — saveProtocol stamps a newer updatedAt
  const mine = (await store.loadProtocols())[0];
  mine.name = 'Morning (mine)';
  await store.saveProtocol(mine);

  await store.importFile(asProtocolFile(protocol()));
  const after = await store.loadProtocols();
  assert.equal(after.length, 1, 'no duplicate — ids match, so it merges');
  assert.equal(after[0].name, 'Morning (mine)', 'the newer record wins');
});

test('an import never removes a protocol the file does not mention', async () => {
  await freshStore();
  await store.importFile(asBackup([protocol({ id: 'keep-me', name: 'Keep me' })]));
  await store.importFile(asProtocolFile(protocol({ id: 'other', name: 'Other' })));
  const names = (await store.loadProtocols()).map((p) => p.name).sort();
  assert.deepEqual(names, ['Keep me', 'Other']);
});

test('a fragment is refused with a usable reason, not a shrug', async () => {
  await freshStore();
  const res = await store.importFile(JSON.stringify({
    format: FILE_FORMAT, kind: 'fragment', schemaVersion: 1, protocol: { name: 'bit' },
  }));
  assert.equal(res.ok, false);
  assert.match(res.errors[0].message, /fragment/i);
  assert.ok(res.errors[0].hint, 'a refusal must say what to do instead');
});

test('a file that is not ours is refused and changes nothing', async () => {
  await freshStore();
  await store.importFile(asProtocolFile(protocol()));
  const res = await store.importFile('{"hello":"world"}');
  assert.equal(res.ok, false);
  assert.equal((await store.loadProtocols()).length, 1, 'the good protocol survives');
});
