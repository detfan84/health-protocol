// The shipped starter file and the app's idea of what's in it must agree.
//
// This exists because they once didn't: the app checked for a single protocol
// id, the file later grew to nine, and anyone who had already loaded the
// smaller version was never offered the rest — the content was on the server
// and unreachable from the screen. A list kept by hand needs a test, or it
// quietly rots the moment the converter's output changes.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BUNDLED_IDS, hasBundled } from '../src/app/bundledProtocol.js';
import { validateFile } from '../src/lib/protocolFile.js';

const file = JSON.parse(await readFile(new URL('../starter-protocols.json', import.meta.url), 'utf8'));

test('the shipped starter file is one this app would accept', () => {
  const result = validateFile(file);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.warnings, [], 'the file should need no repair on the way in');
});

test('BUNDLED_IDS matches what the file actually contains', () => {
  const inFile = file.data.protocols.map((p) => p.id).sort();
  assert.deepEqual([...BUNDLED_IDS].sort(), inFile);
});

test('the offer stands until every bundled protocol is present', () => {
  assert.equal(hasBundled([]), false);
  // the exact trap that hid the movement content: supplements in, rest missing
  assert.equal(hasBundled([{ id: 'supplement-protocol' }]), false);
  assert.equal(hasBundled(BUNDLED_IDS.map((id) => ({ id }))), true);
});

test('only the supplements arrive switched on', () => {
  const on = file.data.protocols.filter((p) => p.active === true).map((p) => p.id);
  assert.deepEqual(on, ['supplement-protocol']);
});
