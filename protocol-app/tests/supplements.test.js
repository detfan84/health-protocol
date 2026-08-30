// Supplements as a shelf, not as somebody's protocol.
//
// Kevin, 29 Aug, stopping a port that was halfway out of the old app: "it's not
// to be transferred over as it was. The supplements should be like any other
// library, just a big list of commonly taken supplements that can be adjusted
// by bottle/dose size, with the reorder tracking and stuff… Just let me select
// my supplements. It could be smart enough to have some education as to what
// each supplement does and suggest when it should be taken, so that supplements
// can fit naturally into the day arc and not riding in an awkward side car."
//
// Every rule below comes out of that sentence, plus the two laws this content
// is most likely to break: a claim travels with its grade (law 5), and a brand
// is not a substance (decision 3 — the library must read to a stranger).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const supplements = lib.items.filter((i) => i.type === 'intake');

// A moment in the day, not a clock time. The whole point is that choosing a
// supplement puts it where it belongs instead of in a side car.
const TIMING = ['fasted', 'with-food', 'evening', 'before-bed', 'anytime'];

test('supplements are in the same shelf as everything else', () => {
  assert.ok(supplements.length >= 8, `only ${supplements.length} intake items — the shelf is not stocked`);
  // Not a separate file, not a separate screen, not a protocol: they are
  // catalogue items and Browse slices them like anything else.
  for (const s of supplements) {
    assert.equal(s.type, 'intake');
    assert.ok(s.name && s.why, `${s.id} says nothing about itself`);
  }
});

test('a supplement carries no movement effect', () => {
  // `effect` is release / lengthen / load / calm — the vocabulary the coverage
  // ledger counts in (TAXONOMY §2.3, "short and closed on purpose"). Magnesium
  // is not a `calm` the way a breathing drill is, and filing it as one would
  // put it in the ledger competing for the same slot. What a supplement is FOR
  // lives in its own facet.
  for (const s of supplements) {
    assert.equal(s.effect, undefined, `${s.id} claims a movement effect`);
    assert.ok(Array.isArray(s.supports) && s.supports.length, `${s.id} does not say what it is for`);
  }
});

test('every supplement says when it wants to be taken', () => {
  // The "awkward side car" clause. A substance with no timing cannot be placed
  // in the day, so it would need a screen of its own — which is the thing this
  // is not.
  for (const s of supplements) {
    assert.ok(TIMING.includes(s.timing), `${s.id} has timing "${s.timing}", which is not a moment in the day`);
  }
});

test('bottle and dose are real numbers, so reorder tracking has something to count', () => {
  for (const s of supplements) {
    const b = s.bottle;
    assert.ok(b, `${s.id} has no bottle`);
    assert.ok(Number.isInteger(b.units) && b.units > 0, `${s.id}: bottle units`);
    assert.ok(Number.isInteger(b.unitsPerDose) && b.unitsPerDose > 0, `${s.id}: units per dose`);
    assert.ok(b.unitName, `${s.id}: a unit needs a name, or the count means nothing`);
    // The supply record this seeds is { count, unitsPerDose, unitName } — the
    // same shape the existing supply screen already decrements on a tick.
    assert.ok(b.units >= b.unitsPerDose, `${s.id}: a bottle that cannot cover one dose`);
  }
});

test('the shelf does not read as a shop', () => {
  // Law 5, kept at the size it earns. Every item wears a tier, because
  // "established" and "exploratory" are a real difference and it is one word.
  // What is gone is the paragraph of evidence prose each one used to carry:
  // this is a tracker for what somebody already takes, not a case for taking it.
  for (const s of supplements) {
    assert.ok(s.tier, `${s.id} has no tier`);
  }
  // And they are not all "established", which would mean the tier is doing no
  // work — a shelf where everything is proven is a shop.
  const tiers = new Set(supplements.map((s) => s.tier));
  assert.ok(tiers.size > 1, `every supplement has the same tier (${[...tiers]}) — that is a marketing claim`);
});

test('a brand is not a substance', () => {
  // Decision 3: the library reads to a stranger. The old app's supplement list
  // was brand names end to end — a brand belongs in `offers`, where somebody is
  // choosing where to buy, and never in the record of what a thing IS.
  const brands = ['rho ', 'boost blenz', 'silver fern', 'meraki', 'kinoko', 'standard process', 'qunol', 'naked '];
  for (const s of supplements) {
    const blob = JSON.stringify(s).toLowerCase();
    for (const b of brands) {
      assert.equal(blob.includes(b), false, `${s.id} names the brand "${b.trim()}"`);
    }
    assert.ok(s.substance, `${s.id} does not say what substance it actually is`);
  }
});

test('nothing here is a warning for the sake of having one', () => {
  // This test used to REQUIRE a `careful` on every item, and the content
  // obliged — including a caution on vitamin D. Kevin, 29 Aug: "putting a
  // careful label on vitamin D is dumb. All of these stupid precautions are
  // unnecessary. We are not selling or recommending supplements. We are making
  // it easy for someone to track what they take within their daily routine…
  // you need a warning that you put too many warnings on stuff."
  //
  // He is right, and the requirement was the mechanism. A caution on all of
  // them is a caution on none: it stops being information and becomes the
  // liability furniture people learn to scroll past, which is worse than
  // nothing because it also trains them past the one that would have mattered.
  //
  // So the rule inverts. Practical facts about how to take a thing — with food,
  // with a full glass of water, away from iron — belong in the how-to, where
  // they are read while doing it. `careful` is for a genuine hazard and this
  // shelf has none, so it is empty and the test says so.
  const warned = supplements.filter((s) => s.fields?.careful).map((s) => s.id);
  assert.deepEqual(warned, [], `${warned.length} supplement(s) carry a warning box — put the practical part in the how-to instead`);

  // The practical half did not go missing on the way.
  for (const s of supplements) {
    const howTo = `${s.fields?.release ?? ''}${s.fields?.tool ?? ''}`;
    assert.ok(howTo.length > 20, `${s.id} does not say how to take it`);
  }
});

test('caffeine is not on the shelf', () => {
  // Kevin, 29 Aug: "I don't think anyone thinks caffeine is a supplement and I
  // don't think anyone is recommending it as a supplement to a caffeine
  // addicted society." It was in the first tranche on the reasoning that people
  // forget they are taking it — which is a clever argument for putting a
  // stimulant on a shelf nobody asked to be sold from.
  const names = supplements.map((s) => `${s.id} ${s.name}`.toLowerCase());
  assert.equal(names.some((n) => n.includes('caffeine')), false);
});

/* -------------------- reachable, and it lands somewhere ------------------ */

import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

const dom = new JSDOM('<!doctype html><html><body><main></main></body></html>', { url: 'http://localhost/' });
for (const k of ['window', 'document', 'HTMLElement', 'Event', 'AbortController', 'AbortSignal', 'localStorage']) {
  globalThis[k] = k === 'window' ? dom.window : dom.window[k];
}
{
  const libText = await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8');
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(libText) });
}
const store = await import('../src/app/store.js');
const settled = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };

test('the front door has a supplements door on it', async () => {
  // Kevin, 29 Aug: "the way to find how to search for supplements is way too
  // buried and hidden. People would never know they could track supplements in
  // this app if they didn't have someone else tell them or they just randomly
  // found it while exploring which would be rare."
  //
  // It was three taps behind a facet menu. A capability nobody can find is a
  // capability nobody has.
  const { viewHome } = await import('../src/app/ui/viewHome.js');
  store._resetForTests();
  await store.ready({ name: 'sup-home' });

  const opened = [];
  const view = await viewHome({ open: (o) => opened.push(o), startSession: () => {} });
  const door = [...view.querySelectorAll('.tile')]
    .find((t) => t.querySelector('.tile-title')?.textContent === 'Supplements');
  assert.ok(door, 'no supplements door on the front page');
  door.dispatchEvent(new dom.window.Event('click'));
  // And it opens ON the shelf, rather than dropping you at the default view to
  // go and find the filter yourself.
  assert.deepEqual(opened.at(-1), { tab: 'library', shelf: 'intake' });
});

test('adding a supplement says where in the day it went', async () => {
  // Kevin, 29 Aug: "I clicked add it to my day but I don't know where in my day
  // it went." Everything landed in one untimed block regardless of what it was,
  // so a before-bed supplement arrived in an anytime bucket folded away on the
  // home screen — and the button said "Added to your day", which is true and
  // useless.
  const { viewLibrary } = await import('../src/app/ui/viewLibrary.js');
  store._resetForTests();
  await store.ready({ name: 'sup-add' });

  const view = await viewLibrary({ openOn: 'intake' });
  document.querySelector('main').replaceChildren(view);
  await settled();

  const card = [...view.querySelectorAll('details.lib-item')]
    .find((d) => /Magnesium glycinate/.test(d.textContent));
  assert.ok(card, 'the shelf opened on supplements');
  const add = [...card.querySelectorAll('button')].find((b) => /Add to my day/.test(b.textContent));
  add.dispatchEvent(new dom.window.Event('click'));
  await settled();

  // The button names the destination.
  assert.match(add.textContent, /Added to Before bed/, `button said "${add.textContent}"`);

  // And the destination is real: a block with a clock on it, so Today and Home
  // interleave it with everything else happening then rather than parking it in
  // a side car.
  const picks = (await store.loadProtocols()).find((p) => p.id === 'my-picks');
  const block = picks.blocks.find((b) => b.items.some((i) => i.id === 'sup-magnesium-glycinate'));
  assert.equal(block.name, 'Before bed');
  assert.ok(block.start, 'a moment in the day has a time on it');
  assert.equal(block.items[0].timing, 'before-bed', 'the item keeps knowing when it wants to be taken');

  // The dose config is seeded so reorder tracking has something to count — but
  // NOT the count, which is a fact about somebody's cupboard that nobody asked.
  const supply = await store.getSetting('supply:sup-magnesium-glycinate');
  assert.equal(supply.unitsPerDose, 2);
  assert.equal(supply.unitName, 'capsule');
  assert.equal(supply.count, undefined, 'the app does not invent what you have on hand');
});
