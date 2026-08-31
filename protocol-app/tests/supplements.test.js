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
// Foods are `intake` too — they are the other half of the same page — so this
// file's subject is the supplement half specifically.
const intake = lib.items.filter((i) => i.type === 'intake');
const supplements = intake.filter((i) => i.intakeKind !== 'food');
const foods = intake.filter((i) => i.intakeKind === 'food');

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
  // The destination is named BEFORE you press anything, not only after. It moved
  // from the button's label to the selected moment when the panel arrived (31
  // Aug) — the requirement did not move with it.
  const when = card.querySelector('select[id$="-timing"]');
  assert.ok(when, 'no way to choose the moment');
  assert.match(when.selectedOptions[0].textContent, /Before bed/, 'the card does not say where it is about to go');
  assert.match(when.selectedOptions[0].textContent, /suggested/, 'the suggestion is not named as one');
  const btn = [...card.querySelectorAll('button')].find((b) => /Add it to my day/.test(b.textContent));
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

/* ------------------------- food, the other half -------------------------- */
//
// Kevin, 29 Aug: "help people identify what foods are good sources to get what
// they need for the people who prefer avoiding supplements… supplements are
// just supplementing the nutrients you aren't getting in your food right?"

test('the food half is keyed to the same nutrients as the supplement half', () => {
  assert.ok(foods.length >= 80, `only ${foods.length} foods`);
  const fromFood = new Set(foods.flatMap((f) => f.provides ?? []));
  const fromSupps = new Set(supplements.flatMap((s) => s.provides ?? []));
  assert.ok(fromFood.size >= 20, 'the food side covers too few nutrients to be a route to anything');

  // The join has to actually join: most nutrients a supplement names must have
  // somewhere to eat them from, or "eat it instead" is a dead link.
  const orphans = [...fromSupps].filter((n) => !fromFood.has(n));
  assert.ok(orphans.length <= 3, `supplement nutrients with no food source at all: ${orphans.join(', ')}`);

  for (const f of foods) {
    assert.ok(f.serving, `${f.id} has no serving — "eat kale" is not an instruction`);
    assert.ok(f.aisle, `${f.id} has no aisle, so it cannot go on a shopping list`);
    assert.ok((f.provides ?? []).length, `${f.id} names no nutrient`);
  }
});

test('the page is honest about which supplements have no food route', () => {
  // The half of Kevin's reframe that is wrong is the useful half. Ashwagandha
  // is not a nutrient you are missing from your dinner, and a page implying
  // otherwise would mislead somebody trying to eat their way off a shelf.
  const withRoute = supplements.filter((s) => (s.provides ?? []).length);
  assert.ok(withRoute.length >= 30, 'almost nothing routes to food — the join is not doing any work');
  assert.ok(withRoute.length < supplements.length,
    'every single supplement claims a food equivalent, which is not true of herbs and enzymes');
});

test('food and supplements are two parts of one page, sharing the nutrient', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-food' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const group = (label) => {
    const g = [...view.querySelectorAll('[role=group]')].find((x) => x.getAttribute('aria-label') === label);
    return g ? [...g.querySelectorAll('button')] : [];
  };
  const parts = group('Food or supplements').map((b) => b.textContent);
  assert.ok(parts.some((t) => /^Supplements · \d+/.test(t)), `parts were ${JSON.stringify(parts)}`);
  assert.ok(parts.some((t) => /^Food · \d+/.test(t)));

  // Switch to food and filter by a nutrient: the two sides speak one language.
  fire(group('Food or supplements').find((b) => /^Food/.test(b.textContent)));
  await settled();
  // The options are the side's own, not the previous side's left in place.
  const filter = view.querySelector('#nutrient-filter');
  assert.ok(filter, 'no nutrient filter');
  const magOpt = [...filter.options].find((o) => /^Magnesium/.test(o.textContent));
  assert.ok(magOpt, 'magnesium is not offered on the food side');
  assert.doesNotMatch(magOpt.textContent, /· 5$/, 'the food side is showing the supplement side\'s counts');

  filter.value = 'magnesium';
  fire(filter, 'change');
  await settled();
  assert.match(view.textContent, /Foods with Magnesium/);
  assert.match(view.textContent, /Pumpkin seeds/);
});

test('a shopping list, grouped the way a shop is walked', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-shop' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const group = (label) => {
    const g = [...view.querySelectorAll('[role=group]')].find((x) => x.getAttribute('aria-label') === label);
    return g ? [...g.querySelectorAll('button')] : [];
  };
  fire(group('Food or supplements').find((b) => /^Food/.test(b.textContent)));
  await settled();

  const card = [...view.querySelectorAll('details.lib-item')].find((d) => /Pumpkin seeds/.test(d.textContent));
  const addBtn = [...card.querySelectorAll('button')].find((b) => /Add to shopping list/.test(b.textContent));
  fire(addBtn);
  await settled();

  assert.match(view.textContent, /Shopping list — 1/);
  assert.match(view.textContent, /Pantry/, 'the list is grouped by aisle');
  // It survives leaving the screen, or it is not a list.
  const saved = await store.getSetting('shopping.list');
  assert.deepEqual(saved.items, ['food-pumpkin-seeds']);
});

test('a preparation that changes the nutrients is its own thing', async () => {
  // Kevin, 29 Aug: "I would think you can split beets into different varieties
  // like fresh or pickled and beetroot extract or powder as different things."
  //
  // Several of these had been a NOTE, which is weaker: "sauerkraut,
  // unpasteurised, from the chilled section" asked the reader to do the
  // filtering. The jarred one provides no probiotics at all — that is not a
  // caveat on one row, it is two rows.
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const fresh = byId['food-beetroot'];
  const pickled = byId['food-beetroot-pickled'];
  assert.ok(fresh && pickled, 'beetroot did not split');
  assert.equal(pickled.variationOf, 'food-beetroot', 'a form shares its parent');
  assert.ok(fresh.provides.includes('nitrate'));
  assert.equal(pickled.provides.includes('nitrate'), false, 'the split has to change something or it is noise');
  assert.notEqual(fresh.aisle, pickled.aisle);

  // The one that matters most, because the note version was doing real work.
  const live = byId['food-sauerkraut'];
  const jarred = byId['food-sauerkraut-jarred-pasteurised'];
  assert.ok(live.provides.includes('probiotics'));
  assert.equal(jarred.provides.includes('probiotics'), false);

  // And the extract is on the other side of the page entirely, which is the
  // rest of his sentence: beetroot powder is a supplement, not a vegetable.
  assert.ok(supplements.some((s) => /Beetroot powder/.test(s.name)));

  // Every form actually differs from its parent, or the row is just clutter.
  for (const f of foods.filter((x) => x.variationOf)) {
    const parent = byId[f.variationOf];
    assert.ok(parent, `${f.id} points at a parent that is not here`);
    const same = JSON.stringify([...f.provides].sort()) === JSON.stringify([...parent.provides].sort());
    assert.ok(!same || f.aisle !== parent.aisle,
      `${f.id} provides the same as its parent and sits in the same aisle — it is the same row twice`);
  }
});

test('forms are shown under the food, not as unrelated neighbours', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-forms' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const group = (label) => {
    const g = [...view.querySelectorAll('[role=group]')].find((x) => x.getAttribute('aria-label') === label);
    return g ? [...g.querySelectorAll('button')] : [];
  };
  fire(group('Food or supplements').find((b) => /^Food/.test(b.textContent)));
  await settled();

  const family = [...view.querySelectorAll('.food-family')]
    .find((el) => /Beetroot/.test(el.textContent));
  assert.ok(family, 'beetroot is not grouped with its forms');
  const forms = family.querySelector('.food-forms');
  assert.ok(forms, 'no forms under the parent');
  // The child says "Pickled", not "Beetroot, pickled" — it is already under it.
  assert.match(forms.textContent, /Pickled/);
  assert.doesNotMatch(forms.querySelector('.name').textContent, /Beetroot/);
});

/* ------------------------------ the meal plan ----------------------------- */
// Kevin, 29 Aug: "they can create a shopping list and meal plan on one side and
// have the supps on the other side." Both halves, and the arrow runs one way:
// the plan is what you decide, the list is what the plan costs you at the shop.
// Two independent lists would mean planning a Tuesday dinner and still having to
// remember to buy it.

test('planning a meal puts its food on the shopping list, and says which meal', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-plan' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const group = (label) => {
    const g = [...view.querySelectorAll('[role=group]')].find((x) => x.getAttribute('aria-label') === label);
    return g ? [...g.querySelectorAll('button')] : [];
  };
  fire(group('Food or supplements').find((b) => /^Food/.test(b.textContent)));
  await settled();

  // Every day has its four meals, or it is not a week.
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
    assert.equal(group(`${day} meals`).length, 4, `${day} does not have four meals`);
  }

  fire(group('Tuesday meals').find((b) => /^Dinner/.test(b.textContent)));
  await settled();
  assert.match(view.textContent, /Planning Tuesday dinner/, 'picking a meal did not enter planning');

  const card = [...view.querySelectorAll('details.lib-item')].find((d) => /Pumpkin seeds/.test(d.textContent));
  const addBtn = [...card.querySelectorAll('button')].find((b) => /Add to Tuesday dinner/.test(b.textContent));
  assert.ok(addBtn, 'while planning, a food row still offered the shopping list instead of the meal');
  fire(addBtn);
  await settled();

  // The plan holds it, and the list knows why it is there.
  assert.match(view.textContent, /Meal plan — 1 food/);
  assert.match(view.textContent, /Shopping list — 1/);
  assert.match(view.textContent, /For Tuesday dinner/, 'the list does not say which meal wants it');

  const saved = await store.getSetting('meal.plan');
  assert.deepEqual(saved.days.tue.dinner, ['food-pumpkin-seeds']);
  assert.deepEqual(saved.days.mon.breakfast, [], 'the other slots did not survive the save');
  // It was never added to the list by hand, so the list must not have kept a
  // second copy that could outlive the plan.
  assert.equal((await store.getSetting('shopping.list'))?.items ?? undefined, undefined);
});

test('a food leaves the shopping list when it leaves the plan', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-plan-off' });
  await store.putSetting({ key: 'meal.plan', days: { tue: { dinner: ['food-pumpkin-seeds'] } } });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();
  const group = (label) => {
    const g = [...view.querySelectorAll('[role=group]')].find((x) => x.getAttribute('aria-label') === label);
    return g ? [...g.querySelectorAll('button')] : [];
  };
  fire(group('Food or supplements').find((b) => /^Food/.test(b.textContent)));
  await settled();
  assert.match(view.textContent, /Shopping list — 1/, 'a saved plan did not reach the list');

  const off = [...view.querySelectorAll('button')]
    .find((b) => b.getAttribute('aria-label') === 'Take Pumpkin seeds off Tuesday dinner');
  assert.ok(off, 'no way to take a food back off a meal');
  fire(off);
  await settled();

  assert.doesNotMatch(view.textContent, /Shopping list/, 'the food outlived the plan that put it there');
  assert.deepEqual((await store.getSetting('meal.plan')).days.tue.dinner, []);
});

/* --------------------- the shelf suggests, you decide --------------------- */
// Kevin, 31 Aug: "The vitamins, they don't give you the opportunity to adjust
// the size of the container or the dosage or anything like that, like we had
// discussed. You should be able to do that before you add it to your day. You
// should also have the ability to add it to your day where you want to, not
// necessarily where it's recommended… It's good to have the suggestion, but we
// need to make it so people can just track their routine. If their routine is
// their routine, then they can keep their routine."

test('a shelf supplement can be re-dosed, re-bottled and re-timed before it is added', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-adjust' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  // Magnesium glycinate is suggested before bed. Somebody who takes it with
  // breakfast, two capsules from a tub of 120, must be able to say so here.
  const card = [...view.querySelectorAll('details.lib-item')]
    .find((d) => /Magnesium glycinate/i.test(d.textContent));
  assert.ok(card, 'magnesium glycinate is not on the shelf');

  const when = card.querySelector('select[id$="-timing"]');
  assert.ok(when, 'no way to choose the moment');
  assert.equal(when.options.length, 5, 'not every moment is offered');

  // The suggestion is a suggestion: named as one, and pre-selected.
  const suggested = [...when.options].filter((o) => /suggested/.test(o.textContent));
  assert.equal(suggested.length, 1, 'exactly one moment should be marked as the suggestion');
  assert.equal(suggested[0].selected, true, 'the suggestion is not pre-selected');

  // And it loses to the person.
  when.value = 'with-food';
  fire(when, 'change');
  assert.equal(suggested[0].selected, false, 'the suggestion overrode the choice');

  const setField = (frag, value) => {
    const input = [...card.querySelectorAll('input')].find((i) => i.id.endsWith(frag));
    assert.ok(input, `no ${frag} field`);
    input.value = value;
    fire(input, 'input');
  };
  setField('-dose', '2 capsules');
  setField('-units', '120');
  setField('-perDose', '2');
  setField('-unitName', 'capsule');

  fire([...card.querySelectorAll('button')].find((b) => /Add it to my day/.test(b.textContent)));
  await settled();

  const picks = (await store.loadProtocols()).find((p) => p.id === 'my-picks');
  const placed = picks.blocks.flatMap((b) => b.items.map((i) => ({ i, b })))
    .find(({ i }) => /Magnesium glycinate/i.test(i.name));
  assert.ok(placed, 'it never reached the day');
  assert.equal(placed.i.timing, 'with-food', 'it landed on the suggested moment, not the chosen one');
  assert.equal(placed.b.name, 'With a meal');
  assert.equal(placed.i.dose, '2 capsules', 'the typed dose was thrown away');
  assert.equal(placed.i.bottle.count, 120, 'the container size was thrown away');
  assert.equal(placed.i.bottle.unitsPerDose, 2);

  // And the supply record agrees, or the reorder count is wrong from day one.
  const supply = await store.getSetting(`supply:${placed.i.id}`);
  assert.equal(supply.count, 120);
  assert.equal(supply.unitsPerDose, 2);
});

test('a blank container count on a shelf item leaves the shelf default alone', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-blank' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();
  const card = [...view.querySelectorAll('details.lib-item')]
    .find((d) => /Magnesium glycinate/i.test(d.textContent));
  const units = [...card.querySelectorAll('input')].find((i) => i.id.endsWith('-units'));
  units.value = '';
  fire(units, 'input');
  fire([...card.querySelectorAll('button')].find((b) => /Add it to my day/.test(b.textContent)));
  await settled();
  const picks = (await store.loadProtocols()).find((p) => p.id === 'my-picks');
  const item = picks.blocks.flatMap((b) => b.items).find((i) => /Magnesium glycinate/i.test(i.name));
  assert.equal(item.bottle.count, undefined, 'a cleared count became a number');
  // Untouched fields keep what the shelf offered — clearing one is not a reason
  // to lose the others.
  const shelfItem = supplements.find((x) => x.id === 'sup-magnesium-glycinate');
  assert.equal(item.bottle.unitsPerDose, shelfItem.bottle.unitsPerDose,
    'a blank count also wiped units per dose');
});

/* ------------------------- what is a polyphenol -------------------------- */
// Kevin, 31 Aug: "it's nice to see that it has polyphenols or whatever too, but
// what are those? We should be able to click to get some education on it if we
// want."

test('every nutrient the app names can explain itself', async () => {
  const { NUTRIENTS } = await import('../src/app/ui/viewSupplements.js');
  const { NUTRIENT_NOTES } = await import('../src/app/ui/nutrientNotes.js');
  for (const key of Object.keys(NUTRIENTS)) {
    const note = NUTRIENT_NOTES[key];
    assert.ok(note, `${key} is shown to people with nothing to say about it`);
    assert.ok(note.length > 80, `${key}'s note is too thin to be worth a tap`);
  }
  // The rules the notes are written to, checked rather than trusted: no doses,
  // no daily values, no telling anybody what a nutrient will do for them.
  for (const [key, note] of Object.entries(NUTRIENT_NOTES)) {
    assert.doesNotMatch(note, /\b\d+\s*(mg|mcg|µg|g|IU)\b/i, `${key}'s note states a dose`);
    assert.doesNotMatch(note, /daily value|% of your|recommended daily/i, `${key}'s note invents a daily value`);
    assert.doesNotMatch(note, /\b(cures?|treats?|prevents?|boosts?)\b/i, `${key}'s note makes a claim`);
  }
});

test('a nutrient explains itself on the card, and leads back to the shelf', async () => {
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-learn' });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();
  const group = (root2, label) => [...root2.querySelectorAll('[role=group]')]
    .find((x) => x.getAttribute('aria-label') === label);
  fire([...group(view, 'Food or supplements').querySelectorAll('button')]
    .find((b) => /^Food/.test(b.textContent)));
  await settled();

  const card = [...view.querySelectorAll('details.lib-item')].find((d) => /Green tea|Olives|Blueberries/.test(d.textContent));
  assert.ok(card, 'no polyphenol food to test with');
  const strip = card.querySelector('.nutrient-strip');
  assert.ok(strip, 'a food card lists its nutrients but does not let you ask what they are');
  // Words already on the card, made tappable — not a new row of chips under
  // the ones that were already there (Kevin, 31 Aug).
  assert.equal(strip.querySelectorAll('.chip').length, 0, 'the explainer grew chips again');
  const chip = strip.querySelectorAll('button.thin-link')[0];
  const name = chip.textContent.trim();
  fire(chip);
  assert.equal(chip.getAttribute('aria-expanded'), 'true');
  const note = card.querySelector('.nutrient-note');
  assert.ok(note, 'tapping a nutrient explained nothing');
  assert.ok(note.textContent.length > 80, 'the explanation is a stub');
  assert.match(note.textContent, new RegExp(`Foods with ${name}`), 'no way back out to the other sources');

  // Tapping it again puts it away.
  fire(chip);
  assert.equal(card.querySelector('.nutrient-note'), null, 'the note will not close');
});

test('a filter puts the answer above the cards that ignore it', async () => {
  // "When you click on one and you're like, okay, eat it instead, foods with
  // calcium — that should show up before."
  const { viewSupplements } = await import('../src/app/ui/viewSupplements.js');
  store._resetForTests();
  await store.ready({ name: 'sup-order' });
  await store.putSetting({ key: 'meal.plan', days: { tue: { dinner: ['food-pumpkin-seeds'] } } });
  const view = await viewSupplements({});
  document.querySelector('main').replaceChildren(view);
  await settled();

  const supCard = [...view.querySelectorAll('details.lib-item')]
    .find((d) => /Eat it instead — foods with/.test(d.textContent));
  assert.ok(supCard, 'no supplement offers the food route');
  fire([...supCard.querySelectorAll('button')].find((b) => /Eat it instead/.test(b.textContent)));
  await settled();

  const text = view.textContent;
  const answerAt = text.search(/Foods with /);
  const planAt = text.search(/Meal plan/);
  const listAt = text.search(/Shopping list/);
  assert.ok(answerAt >= 0, 'the filtered answer never rendered');
  assert.ok(answerAt < planAt, 'the meal plan still outranks the question that was asked');
  assert.ok(answerAt < listAt, 'the shopping list still outranks the question that was asked');
});
