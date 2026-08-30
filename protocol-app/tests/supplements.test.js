// Supplements: their own tab, their own search, their own list.
//
// The design took three corrections to get here and each one is a rule below.
//
//   "The supplements should be like any other library, just a big list of
//    commonly taken supplements that can be adjusted by bottle/dose size, with
//    the reorder tracking and stuff… Just let me select my supplements."
//
//   "Putting a careful label on vitamin D is dumb… We are not selling or
//    recommending supplements. We are making it easy for someone to track what
//    they take within their daily routine."
//
//   "Finding supplements is harder than it was. It should be its own tab with
//    its own search. I don't know why you are trying to mix supplements in with
//    everything else… there are literally thousands of supplements, you could
//    easily find the top 100 and put them in there. And it was already planned
//    that people can put their own supplements in there as many supplements are
//    combos and blends now too."
//
// The mistake the third one corrects is worth keeping written down: "fits into
// the day arc, not a side car" is about where a supplement LANDS once you take
// it. It was never about the browsing surface. Filing a hundred substances into
// a shelf that slices by release / lengthen / load and by body part made them
// harder to find than they had been.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const supplements = lib.items.filter((i) => i.type === 'intake');

const TIMING = ['fasted', 'with-food', 'evening', 'before-bed', 'anytime'];

const dom = new JSDOM('<!doctype html><html><body><main></main><nav class="tabs"></nav></body></html>', { url: 'http://localhost/' });
for (const k of ['window', 'document', 'HTMLElement', 'Event', 'AbortController', 'AbortSignal', 'localStorage']) {
  globalThis[k] = k === 'window' ? dom.window : dom.window[k];
}
{
  const libText = await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8');
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(libText) });
}
const store = await import('../src/app/store.js');
const settled = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };
const fire = (el, type = 'click') => el.dispatchEvent(new dom.window.Event(type, { bubbles: true }));

/* ------------------------------- the shelf ------------------------------- */

test('the shelf is big enough to find yourself on', () => {
  // "There are literally thousands of supplements, you could easily find the
  // top 100 and put them in there."
  assert.ok(supplements.length >= 100, `only ${supplements.length} on the shelf`);
  const ids = new Set(supplements.map((s) => s.id));
  assert.equal(ids.size, supplements.length, 'duplicate ids');
});

test('every supplement says when it wants to be taken', () => {
  // The field that lets a supplement land somewhere real in the day instead of
  // in a list beside it.
  for (const s of supplements) {
    assert.ok(TIMING.includes(s.timing), `${s.id} has timing "${s.timing}"`);
    assert.ok(Array.isArray(s.supports) && s.supports.length, `${s.id} does not say what it is for`);
    assert.ok(s.substance, `${s.id} does not say what it actually is`);
  }
  // And they are spread across the day rather than all defaulting to one
  // moment, which would make the placement meaningless.
  const moments = new Set(supplements.map((s) => s.timing));
  assert.ok(moments.size >= 4, `everything lands in ${[...moments]}`);
});

test('bottle and dose are real, so reorder tracking has something to count', () => {
  for (const s of supplements) {
    const b = s.bottle;
    assert.ok(Number.isInteger(b?.units) && b.units > 0, `${s.id}: bottle units`);
    assert.ok(Number.isInteger(b.unitsPerDose) && b.unitsPerDose > 0, `${s.id}: units per dose`);
    assert.ok(b.unitName, `${s.id}: a count with no unit name means nothing`);
    assert.ok(b.units >= b.unitsPerDose, `${s.id}: a bottle that cannot cover one dose`);
  }
});

test('nothing here is a warning for the sake of having one', () => {
  // This test used to REQUIRE a caution on every item, and the content obliged
  // — including one on vitamin D. A caution on all of them is a caution on
  // none: it becomes the liability furniture people learn to scroll past,
  // which is worse than nothing because it trains them past the one that would
  // have mattered. Practical facts about how to take a thing live in the
  // how-to, and most rows need none at all.
  const warned = supplements.filter((s) => s.fields?.careful).map((s) => s.id);
  assert.deepEqual(warned, [], 'warning boxes are back');
  const noted = supplements.filter((s) => s.fields?.release).length;
  assert.ok(noted < supplements.length / 2,
    `${noted} of ${supplements.length} carry a note — a note on most of them is furniture again`);
});

test('a brand is not a substance, and caffeine is not a supplement', () => {
  const brands = ['rho ', 'boost blenz', 'silver fern', 'meraki', 'kinoko', 'standard process', 'qunol'];
  const blob = JSON.stringify(supplements).toLowerCase();
  for (const b of brands) assert.equal(blob.includes(b), false, `the shelf names the brand "${b.trim()}"`);
  // "I don't think anyone thinks caffeine is a supplement and I don't think
  // anyone is recommending it as a supplement to a caffeine addicted society."
  assert.equal(supplements.some((s) => /caffeine/i.test(s.name)), false);
});

/* -------------------------------- the tab -------------------------------- */

test('supplements are a tab, and not mixed into the library', async () => {
  const shell = await readFile(new URL('../src/app/ui/app.js', import.meta.url), 'utf8');
  const tabs = [...shell.matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
  assert.ok(tabs.includes('supplements'), `no supplements tab — tabs are ${tabs.join(', ')}`);

  // And the general library does not carry them any more. It slices by
  // release / lengthen / load, by body part and by equipment; a hundred
  // substances answering none of those questions sat three taps down a facet
  // menu, which is how they got harder to find than before they existed.
  const { viewLibrary } = await import('../src/app/ui/viewLibrary.js');
  store._resetForTests();
  await store.ready({ name: 'sup-not-lib' });
  const view = await viewLibrary({});
  document.querySelector('main').replaceChildren(view);
  await settled();
  assert.doesNotMatch(view.textContent, /Magnesium glycinate/, 'the library still holds supplements');
});

test('the tab searches by name and by what a thing is for', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-search' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const box = view.querySelector('input[type=search]');
  assert.ok(box, 'the tab has its own search');

  box.value = 'magnesium';
  fire(box, 'input');
  await settled();
  assert.match(view.textContent, /Magnesium glycinate/);

  // "What it is for" is the question somebody can answer about themselves —
  // they know they sleep badly, they do not know they want glycinate.
  box.value = 'sleep';
  fire(box, 'input');
  await settled();
  assert.match(view.textContent, /Melatonin|Magnesium|Valerian/, 'searching a purpose finds nothing');
});

test('adding one says where in the day it went, and it goes somewhere real', async () => {
  // "I had to dig to find where the supplements landed in my daily routine."
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-place' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const card = [...view.querySelectorAll('details.lib-item')]
    .find((d) => /Magnesium glycinate/.test(d.textContent));
  const btn = [...card.querySelectorAll('button')].find((b) => /^Add to/.test(b.textContent));
  // The button names the destination BEFORE you press it, not only after.
  assert.match(btn.textContent, /Add to Before bed/);
  fire(btn);
  await settled();
  assert.match(btn.textContent, /Added to Before bed/);

  const picks = (await store.loadProtocols()).find((p) => p.id === 'my-picks');
  const block = picks.blocks.find((b) => b.items.some((i) => i.id === 'sup-magnesium-glycinate'));
  assert.equal(block.name, 'Before bed');
  assert.ok(block.start, 'a moment in the day carries a time, so Today interleaves it with everything else then');
  assert.equal(block.items[0].timing, 'before-bed');

  // The dose config is seeded so reorder tracking works; the COUNT is not,
  // because how many you have is a fact about your cupboard (ruling A).
  const supply = await store.getSetting('supply:sup-magnesium-glycinate');
  assert.equal(supply.unitsPerDose, 2);
  assert.equal(supply.count, undefined, 'the app does not invent what you have on hand');
});

test('what you already take is at the top, not something to go and find', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-yours' });
  await store.saveProtocol({
    id: 'my-picks', name: 'My picks', active: true, phases: [],
    blocks: [{ id: 'pick-bed', name: 'Before bed', start: '21:30', order: 3, items: [
      { id: 'sup-melatonin', name: 'Melatonin', type: 'intake', timing: 'before-bed' }] }],
    createdAt: 'x', updatedAt: 'x',
  });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const headings = [...view.querySelectorAll('.section-title')].map((e) => e.textContent);
  assert.match(headings[0], /What you take/, `first heading was "${headings[0]}"`);
  const yours = view.querySelector('details.lib-item');
  assert.match(yours.textContent, /Melatonin/);
  assert.match(yours.textContent, /In your day · Before bed/, 'and it says where it sits');
});

test('anything not on the shelf can still be tracked', async () => {
  // "Many supplements are combos and blends now too, they need to be able to
  // add whatever they are taking if it's not preloaded so they can still track
  // it." A tracker that cannot track what somebody actually takes is not one.
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-own' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const set = (id, value) => {
    const el = view.querySelector(`#${id}`);
    assert.ok(el, `no field ${id}`);
    el.value = value;
    fire(el, el.tagName === 'SELECT' ? 'change' : 'input');
  };
  set('own-name', 'Morning Greens Blend');
  set('own-timing', 'fasted');
  set('own-dose', '1 scoop');
  set('own-units', '30');
  set('own-perDose', '1');
  set('own-unitName', 'scoop');

  const addBtn = [...view.querySelectorAll('button')].find((b) => /Add it to my day/.test(b.textContent));
  fire(addBtn);
  await settled();

  const picks = (await store.loadProtocols()).find((p) => p.id === 'my-picks');
  const block = picks.blocks.find((b) => b.items.some((i) => i.name === 'Morning Greens Blend'));
  assert.ok(block, 'a typed-in supplement did not land anywhere');
  assert.equal(block.name, 'First thing, before food');
  const item = block.items.find((i) => i.name === 'Morning Greens Blend');
  assert.equal(item.type, 'intake');
  assert.equal(item.dose, '1 scoop');

  // And it counts down like anything else, because that is the whole point.
  const supply = await store.getSetting(`supply:${item.id}`);
  assert.equal(supply.count, 30);
  assert.equal(supply.unitsPerDose, 1);
});

test('a blank container count means "not counting", never zero', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-blank' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const set = (id, value) => { const el = view.querySelector(`#${id}`); el.value = value; fire(el, 'input'); };
  set('own-name', 'Some blend');
  set('own-units', '');
  set('own-perDose', '1');
  fire([...view.querySelectorAll('button')].find((b) => /Add it to my day/.test(b.textContent)));
  await settled();

  const picks = (await store.loadProtocols()).find((p) => p.id === 'my-picks');
  const item = picks.blocks.flatMap((b) => b.items).find((i) => i.name === 'Some blend');
  assert.ok(item);
  const supply = await store.getSetting(`supply:${item.id}`);
  assert.equal(supply?.count, undefined, 'a blank became a zero — ruling A');
});
