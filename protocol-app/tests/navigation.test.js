// Navigation and content-delivery tests.
//
// Both of the things checked here have already gone wrong once, silently, and
// neither had a test that could have caught it:
//
//   - Commit 197da3e replaced the tab bar with a Home menu and dropped Supply
//     and Plans without a replacement. For one commit there was no way to
//     reach a supply count, no way to make a protocol, and no way to switch
//     one off — while Today went on telling anybody who ran out to restock on
//     the Supply screen. Every screen still rendered perfectly in isolation,
//     which is exactly why the suite stayed green.
//
//   - starter.json never carried a seedVersion, so the app's "apply the
//     shipped content once" check compared a constant to itself and returned
//     early on every launch after the first. Content added from then on would
//     reach new installs only. The file shipped; the app declined to read it.
//
// So: a screen existing is not the same as a screen being reachable, and
// content shipping is not the same as content arriving.

import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
const src = (p) => resolve(here, '../src', p);

// Deliberately no <main>: app.js boots itself when it finds one, and this file
// imports it for a pure helper rather than to run the app.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.AbortController = dom.window.AbortController;
globalThis.AbortSignal = dom.window.AbortSignal;
globalThis.localStorage = dom.window.localStorage;

const store = await import('../src/app/store.js');
const { viewHome } = await import('../src/app/ui/viewHome.js');
const { viewSupply } = await import('../src/app/ui/viewSupply.js');
const { viewProtocols } = await import('../src/app/ui/viewProtocols.js');
const { viewArea } = await import('../src/app/ui/viewArea.js');

const tick = () => new Promise((r) => setTimeout(r, 0));

function protocol(id, name, active = true) {
  return {
    id, name, active, phases: [],
    blocks: [{ id: `${id}-b`, name: 'A part', order: 0, items: [{ id: `${id}-i`, name: 'A thing' }] }],
    createdAt: 'x', updatedAt: 'x',
  };
}

/* ------------------------ every screen has a door --------------------- */

test('every screen the shell can draw has a way in', async () => {
  const shell = await readFile(src('app/ui/app.js'), 'utf8');
  const home = await readFile(src('app/ui/viewHome.js'), 'utf8');

  // Every destination the shell knows how to draw…
  const branches = [...shell.matchAll(/state\.tab === '([a-z]+)'/g)].map((m) => m[1]);
  assert.ok(branches.length >= 5, 'expected the shell to branch on several tabs');

  // …reachable either from the tab bar, or from a tile on the Home menu.
  const tabBar = [...shell.matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
  const tiles = [...home.matchAll(/tab: '([a-z]+)'/g)].map((m) => m[1]);
  const reachable = new Set([...tabBar, ...tiles]);

  const orphans = branches.filter((t) => !reachable.has(t));
  assert.deepEqual(
    orphans, [],
    `no way to reach: ${orphans.join(', ')} — a screen with no door is a screen nobody has`,
  );
});

// Deliberately widget-agnostic. Supply and Plans were tiles in a six-tile
// "More" grid, and the 29 Aug collapse made them links in a thin row — which
// is a layout decision, not a reachability one. A test that pins the widget
// makes the layout expensive to change and still would not notice the thing
// that actually went wrong in 197da3e: the door disappearing.
test('the Home menu offers Supply and Plans, and says where they go', async () => {
  store._resetForTests();
  await store.ready({ name: 'nav-1' });
  await store.saveProtocol(protocol('p-1', 'An area'));

  const opened = [];
  const view = await viewHome({ open: (arg) => opened.push(arg), startSession: () => {} });
  const byName = (name) => [...view.querySelectorAll('button')]
    .find((el) => el.textContent.trim() === name || el.querySelector('.tile-title')?.textContent === name);

  for (const name of ['Supply', 'Plans']) {
    const door = byName(name);
    assert.ok(door, `${name} is not on the menu at all`);
    door.dispatchEvent(new dom.window.Event('click'));
  }
  await tick();
  assert.deepEqual(opened, [{ tab: 'supply' }, { tab: 'plans' }]);
});

test('a screen reached from the menu carries its own way back', async () => {
  store._resetForTests();
  await store.ready({ name: 'nav-2' });
  await store.saveProtocol(protocol('p-1', 'An area'));

  for (const view of [
    await viewSupply({ back: () => {} }),
    await viewProtocols({ back: () => {}, openEditor: () => {}, reload: () => {} }),
  ]) {
    const back = [...view.querySelectorAll('button')]
      .find((b) => b.getAttribute('aria-label') === 'Back to the menu');
    assert.ok(back, 'no way back from a screen that is not in the tab bar');
  }
});

test('an area can be taken off the day as well as put on it', async () => {
  store._resetForTests();
  await store.ready({ name: 'nav-3' });
  await store.saveProtocol(protocol('p-on', 'Switched on', true));
  await store.saveProtocol(protocol('p-off', 'Switched off', false));

  const on = await viewArea({ areaId: 'p-on', back: () => {}, startSession: () => {}, openEditor: () => {} });
  const off = await viewArea({ areaId: 'p-off', back: () => {}, startSession: () => {}, openEditor: () => {} });
  const text = (v) => [...v.querySelectorAll('button')].map((b) => b.textContent).join(' | ');

  assert.match(text(on), /Take this off my day/, 'an active area cannot be switched off');
  assert.match(text(off), /Put this on my day/, 'an inactive area cannot be switched on');
  assert.doesNotMatch(text(on), /Put this on my day/);
  assert.doesNotMatch(text(off), /Take this off my day/);
});

/* --------------------- content that actually arrives ------------------ */

test('the shipped content carries a version, so an update can reach an installed app', async () => {
  const file = JSON.parse(await readFile(src('content/starter.json'), 'utf8'));
  assert.ok(
    typeof file.seedVersion === 'string' && file.seedVersion.length > 0,
    'starter.json has no seedVersion — the app will apply it once and never look again',
  );
  // It fingerprints the content, so it must not be a hand-written constant that
  // somebody forgets to bump.
  assert.match(file.seedVersion, /^[0-9a-f]{8,}$/, 'seedVersion should be a content fingerprint');
});

test('new content arrives, and a protocol you deleted stays deleted', async () => {
  const { seedPlan } = await import('../src/lib/seed.js');
  const p = (id, name) => ({ id, name, blocks: [], phases: [], active: true, createdAt: 't', updatedAt: 't' });
  const shipped = [p('seed-a', 'A'), p('seed-b', 'B'), p('seed-new', 'New')];

  // First run: nothing here, nothing offered yet — take all of it.
  assert.deepEqual(
    seedPlan({ shipped, have: [], offered: new Set() }).fresh.map((x) => x.id),
    ['seed-a', 'seed-b', 'seed-new'],
  );

  // Later run, new content in the file: only the new one is handed over, and
  // the two already held are current so nothing else moves.
  const held = seedPlan({
    shipped,
    have: [p('seed-a', 'A'), p('seed-b', 'B')],
    offered: new Set(['seed-a', 'seed-b']),
  });
  assert.deepEqual(held.fresh.map((x) => x.id), ['seed-new']);
  assert.deepEqual(held.refresh, []);

  // The person deleted seed-b. It was offered; it does not come back — and the
  // genuinely new one still does.
  assert.deepEqual(
    seedPlan({
      shipped,
      have: [p('seed-a', 'A')],
      offered: new Set(['seed-a', 'seed-b']),
    }).fresh.map((x) => x.id),
    ['seed-new'],
  );
});

// The bug: the day arc's second block was renamed, shipped and deployed, and
// every installed app went on saying "While the kettle boils" — because a
// protocol the device already held was never a candidate for anything. The
// applied-version record said the new content was in.
test('a revision to a protocol you already have actually reaches you', async () => {
  const { seedPlan, contentFingerprint, baselinesOf, refreshed } = await import('../src/lib/seed.js');
  const arc = (blockName, stamps = {}) => ({
    id: 'seed-day-arc', name: 'The day arc', active: true, phases: [],
    blocks: [{ id: 'arc-rise', name: blockName, order: 0, items: [{ id: 'i', name: 'A thing' }] }],
    createdAt: 't0', updatedAt: 't0', ...stamps,
  });
  const before = arc('While the kettle boils');
  const after = arc('While you’re already up');
  const baselines = baselinesOf([before]);

  // Untouched since it was handed over: the rename lands.
  const plan = seedPlan({ shipped: [after], have: [before], offered: new Set(['seed-day-arc']), baselines });
  assert.deepEqual(plan.refresh.map((r) => r.shipped.blocks[0].name), ['While you’re already up']);
  assert.deepEqual(plan.kept, []);

  // What the person owns survives the refresh: their on/off decision and the
  // day this arrived on their device.
  const mine = { ...before, active: false, createdAt: 'the-day-i-installed-it' };
  const out = refreshed(after, mine, 'now');
  assert.equal(out.blocks[0].name, 'While you’re already up');
  assert.equal(out.active, false, 'switching a plan off is a decision about your day, not about the content');
  assert.equal(out.createdAt, 'the-day-i-installed-it');
  assert.equal(out.updatedAt, 'now', 'updatedAt is the merge referee — the incoming copy has to win');

  // Edited it? Then it is theirs, and the update does not touch it.
  const edited = { ...before, blocks: [{ ...before.blocks[0], name: 'My own morning' }] };
  const kept = seedPlan({ shipped: [after], have: [edited], offered: new Set(['seed-day-arc']), baselines });
  assert.deepEqual(kept.refresh, []);
  assert.deepEqual(kept.kept, ['seed-day-arc']);

  // No baseline (installed before this mechanism existed): never saved is proof
  // enough, and a save of any kind is not.
  const noBase = { shipped: [after], offered: new Set(['seed-day-arc']), baselines: {} };
  assert.equal(seedPlan({ ...noBase, have: [before] }).refresh.length, 1, 'untouched: bring it up to date');
  assert.deepEqual(
    seedPlan({ ...noBase, have: [{ ...before, updatedAt: 't1' }] }).kept, ['seed-day-arc'],
    'saved at least once: err toward never overwriting somebody’s work',
  );

  // And the fingerprint ignores what is not content, or a person switching a
  // plan off would read as an edit and freeze it forever.
  assert.equal(contentFingerprint(before), contentFingerprint({ ...before, active: false, updatedAt: 'later' }));
  assert.notEqual(contentFingerprint(before), contentFingerprint(after));
});
