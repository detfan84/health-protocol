// The dealt day — the one thing the composer writes, and when it writes it.
//
// The property that matters most here is that a day, once dealt, STAYS dealt.
// The dealer's inputs move while the day is being used: check something off and
// the coverage ledger changes, so re-dealing would rearrange the session under
// somebody halfway through it. A plan that edits itself while you work through
// it is not a plan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import 'fake-indexeddb/auto';
import { localDateKey } from '../src/lib/core.js';

const libText = await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8');
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(libText) });

const store = await import('../src/app/store.js');
const { dealtFor, storedDeal, protocolFrom, blocksFrom, loadCatalog, _resetCatalogForTests } =
  await import('../src/app/composer/day.js');
const { makeEvent } = await import('../src/app/composer/findings.js');

const fresh = async (name) => { store._resetForTests(); _resetCatalogForTests(); await store.ready({ name }); };
const TODAY = localDateKey();

test('a day is dealt once and written down', async () => {
  await fresh('deal-once');
  assert.equal(await storedDeal(TODAY), null, 'something was dealt before anyone asked');

  const first = await dealtFor(TODAY);
  assert.ok(first.session.length > 0, 'nothing was dealt');
  assert.ok(first.dealtAt, 'the deal is not stamped');
  assert.equal((await storedDeal(TODAY)).date, TODAY, 'the deal was not written down');
});

test('the day does not change underneath you when you do it', async () => {
  await fresh('deal-stable');
  const first = await dealtFor(TODAY);
  const ids = first.session.map((r) => r.id);

  // Do the first thing on the list. That moves the ledger, which would move the
  // deal if the deal were recomputed.
  await store.mutateDay(TODAY, (day) => ({
    ...day,
    checks: { ...(day.checks ?? {}), [ids[0]]: { at: new Date().toISOString() } },
  }));
  // And report something, which moves the weights too.
  await store.addFinding(makeEvent({ kind: 'muscle-gave-out', nodes: ['glute-max'] }));

  const again = await dealtFor(TODAY);
  assert.deepEqual(again.session.map((r) => r.id), ids, 'the session was re-dealt mid-day');
  assert.equal(again.dealtAt, first.dealtAt, 'the day was dealt a second time');
});

test('a past day is never dealt', async () => {
  await fresh('deal-past');
  // Decision 21: looking back changes nothing. A day nobody dealt has no
  // session, forever — inventing one now would be writing a plan for a day that
  // has already gone.
  assert.equal(await dealtFor('2020-03-03'), null);
  assert.equal(await storedDeal('2020-03-03'), null, 'looking at a past day wrote to it');

  // And the guard has to read the real clock. Today passes `asOf` — the end of
  // whichever day is being viewed — to most things, and handing that in here
  // made yesterday look like today and dealt a session into it.
  const yesterday = localDateKey(new Date(Date.now() - 86400000));
  assert.equal(await dealtFor(yesterday, { now: new Date(`${yesterday}T23:59:59`) }), null,
    'the end of yesterday was mistaken for today');
  assert.equal(await storedDeal(yesterday), null);
});

test('what was reported yesterday steers what is dealt today', async () => {
  // The loop the whole subsystem exists to close.
  await fresh('deal-steer');
  const plain = await dealtFor(TODAY);

  await fresh('deal-steer-2');
  const catalog = await loadCatalog();
  // Report a node that some item in the catalogue actually works.
  const target = catalog.items.find((i) => i.type === 'practice' && i.target?.length
    && (i.effect ?? []).some((e) => ['load', 'release', 'activate', 'lengthen'].includes(e)));
  const node = target.target[0];
  for (let i = 0; i < 4; i++) {
    await store.addFinding(makeEvent({ kind: 'hot-spot', nodes: [node] }));
  }
  const steered = await dealtFor(TODAY);

  assert.notDeepEqual(
    steered.session.map((r) => r.id),
    plain.session.map((r) => r.id),
    'reporting a problem area changed nothing about what was dealt',
  );
  const touches = steered.session.some((r) => (catalog.itemsById[r.id]?.target ?? []).includes(node));
  assert.ok(touches, `nothing dealt works ${node}, which was reported four times`);
});

test('the dealt day becomes blocks Today already knows how to draw', async () => {
  await fresh('deal-blocks');
  const dealt = await dealtFor(TODAY);
  const catalog = await loadCatalog();
  const protocol = protocolFrom(dealt, catalog);

  assert.equal(protocol.id, 'composed-today');
  assert.ok(protocol.active);
  const session = protocol.blocks.find((b) => b.id === 'composed-session');
  assert.ok(session, 'no session block');
  assert.ok(session.items.length > 0);
  // No clock on it, on purpose: every time in this app so far was invented.
  assert.equal(session.start, undefined, 'the composer invented a start time');
  assert.equal(session.end, undefined);
  // Every dealt item carries the reason it was dealt, through to the card.
  for (const item of session.items) assert.ok(item.why?.length > 8, `${item.id} lost its reason`);

  const snacks = protocol.blocks.find((b) => b.id === 'composed-snacks');
  if (snacks) {
    assert.deepEqual(snacks.items[0].cadence, { kind: 'timesPerDay', n: 3 },
      'snacks should stop asking after three passes');
  }
});

test('an item that has left the catalogue is dropped, not drawn as a blank', async () => {
  await fresh('deal-missing');
  const catalog = await loadCatalog();
  const dealt = {
    date: TODAY, dial: 'standard', dealtAt: new Date().toISOString(),
    session: [{ id: 'gone-from-the-shelf', why: 'x' }, ...(await dealtFor(TODAY)).session],
    snacks: [], medicine: null, notes: [],
  };
  const blocks = blocksFrom(dealt, catalog);
  const ids = blocks.flatMap((b) => b.items.map((i) => i.id));
  assert.ok(!ids.includes('gone-from-the-shelf'));
  assert.ok(ids.length > 0, 'one missing item emptied the whole session');
});
