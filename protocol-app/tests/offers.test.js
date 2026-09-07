// Affiliate offers — on the reorder state, and nowhere else.
//
// Kevin asked for affiliate links (30 Aug) and parked them behind the composer
// (31 Aug). The placement rule is the whole design: the money follows a
// decision already made. These tests are mostly about where offers must NOT be.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { offerFor, isReorderState, _setAffiliateForTests, LOW_DOSES, AFFILIATE } from '../src/lib/offers.js';

const dom = new JSDOM('<!doctype html><html><body><main></main><nav class="tabs"></nav></body></html>', { url: 'http://localhost/' });
for (const k of ['window', 'document', 'HTMLElement', 'Event', 'AbortController', 'AbortSignal', 'localStorage']) {
  globalThis[k] = k === 'window' ? dom.window : dom.window[k];
}
const libText = await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8');
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(libText), text: async () => libText });
const store = await import('../src/app/store.js');
const settled = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

const SUP = { id: 'sup-magnesium-glycinate', name: 'Magnesium glycinate', type: 'intake', substance: 'magnesium bisglycinate' };
const LOW = { itemId: SUP.id, count: 10, unitsPerDose: 2 };   // 5 doses left
const FULL = { itemId: SUP.id, count: 120, unitsPerDose: 2 }; // 60 doses

test('shipped dormant: no tag, no links, anywhere, at all', () => {
  _setAffiliateForTests(null);
  assert.equal(AFFILIATE.amazonTag, '', 'a real tag is committed in the source');
  assert.equal(AFFILIATE.rhoCode, '', 'a real code is committed in the source');
  assert.equal(offerFor(SUP, LOW), null, 'an offer rendered with no tag configured');
});

test('the reorder state is a week or less, by the person\'s own numbers', () => {
  assert.equal(isReorderState(LOW), true);
  assert.equal(isReorderState(FULL), false);
  assert.equal(isReorderState({ itemId: 'x', count: 0, unitsPerDose: 1 }), true, 'empty is the reorder state too');
  // Blank is not zero (ruling A): no count means not tracking, never "buy more".
  assert.equal(isReorderState({ itemId: 'x', unitsPerDose: 2 }), false);
  assert.equal(isReorderState(undefined), false);
  assert.equal(isReorderState({ itemId: 'x', count: LOW_DOSES, unitsPerDose: 1 }), true);
});

test('with a tag, the offer carries it — and says what it is', () => {
  _setAffiliateForTests({ amazonTag: 'test-tag-20' });
  const offer = offerFor(SUP, LOW);
  assert.ok(offer, 'no offer in the reorder state with a tag configured');
  assert.match(offer.url, /amazon\.com\/s\?k=/);
  assert.match(offer.url, /tag=test-tag-20/);
  assert.match(offer.rel, /sponsored/, 'a paid link must say so to the browser');
  assert.match(offer.disclosure, /commission/, 'a paid link must say so to the person');
  _setAffiliateForTests(null);
});

test('never on food, never on practices, never when stocked', () => {
  _setAffiliateForTests({ amazonTag: 'test-tag-20' });
  assert.equal(offerFor({ ...SUP, intakeKind: 'food' }, LOW), null, 'a food card got a buy link');
  assert.equal(offerFor({ id: 'x', name: 'Squat', type: 'practice' }, LOW), null, 'an exercise got a buy link');
  assert.equal(offerFor(SUP, FULL), null, 'a full bottle got a buy link');
  assert.equal(offerFor(SUP, undefined), null, 'an untracked item got a buy link');
  _setAffiliateForTests(null);
});

test('the education never carries an offer, even configured, even running low', async () => {
  // The boundary that makes the whole thing defensible: browse the shelf with
  // a low supply and a live tag — the SHELF cards (education) stay clean; the
  // link lives only against the stock line of something already yours.
  _setAffiliateForTests({ amazonTag: 'test-tag-20' });
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'offers-edu' });
  await store.putSetting({ key: `supply:${SUP.id}`, ...LOW, updatedAt: new Date().toISOString() });

  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const links = [...view.querySelectorAll('a')].filter((a) => /amazon/.test(a.href));
  // The shelf shows the magnesium card with its stock line — that one row is
  // the reorder state and may carry the link. Nothing else may.
  for (const a of links) {
    const card = a.closest('details.lib-item');
    assert.ok(card, 'an offer rendered outside an item card');
    assert.match(card.textContent, /Magnesium glycinate/, 'an offer appeared on an item that is not running low');
  }
  assert.ok(links.length <= 1, `${links.length} amazon links on one screen`);

  // And the food half carries none, ever.
  const group = [...view.querySelectorAll('[role=group]')].find((x) => x.getAttribute('aria-label') === 'Food or supplements');
  [...group.querySelectorAll('button')].find((b) => /^Food/.test(b.textContent))
    .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await settled();
  assert.equal([...view.querySelectorAll('a')].filter((a) => /amazon/.test(a.href)).length, 0,
    'the food page carries a buy link');
  _setAffiliateForTests(null);
});
