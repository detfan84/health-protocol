// How much of that food would I need to eat?
//
// Kevin, 31 Aug: "nothing compares 'eat this much of this food to equal a
// standard dose of the vitamin supplement' or something like that. So you see a
// bunch of foods that also have it, but how much do they have? And compared to
// what? How much of that food would I need to eat? I can't tell."
//
// The food table refused to carry amounts from the day it was written, for a
// good reason that these tests keep: no invented numbers. What changed is the
// source, not the rule. Every figure below traces to a USDA fdc_id that is
// stored next to it, and the tests that matter here are the ones that fail when
// a number appears without one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDose, compare, formatMg } from '../src/app/ui/doses.js';
import { UNMEASURED } from '../src/app/ui/nutrientNotes.js';

const foods = JSON.parse(await readFile(new URL('../src/content/authored/foods.json', import.meta.url), 'utf8')).items;
const data = JSON.parse(await readFile(new URL('../src/content/data/food-amounts.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(foods.map((f) => [f.id, f]));

/* ----------------------------- the provenance ---------------------------- */

test('every measured amount names the USDA entry it came from', () => {
  for (const f of foods) {
    if (!f.amounts) continue;
    assert.ok(f.amountSource, `${f.id} has amounts and no source`);
    assert.match(String(f.amountSource.fdcId), /^\d+$/, `${f.id} has no fdc_id`);
    // The description is what makes a wrong match visible to a reader instead
    // of hiding inside a plausible-looking number.
    assert.ok(f.amountSource.fdcDescription?.length > 5, `${f.id} does not say which USDA food it matched`);
    assert.ok(f.amountSource.servingGrams > 0, `${f.id} has no gram weight for its serving`);
  }
});

test('the gram weight of a serving is the app\'s own number, and is stated as such', () => {
  assert.match(data.source, /USDA FoodData Central/);
  assert.match(data.source, /this app’s own judgement/,
    'the file does not distinguish the measured layer from the judged one');
});

test('nothing is measured that USDA cannot measure', () => {
  // The guard against a future well-meaning guess. Polyphenols and nitrate have
  // columns in SR Legacy that no food fills; the other four are not measured at
  // all. A number here would have to have been invented.
  for (const f of foods) {
    for (const nutrient of Object.keys(f.amounts ?? {})) {
      assert.ok(!UNMEASURED[nutrient], `${f.id} carries an amount for ${nutrient}, which USDA does not measure`);
    }
  }
  for (const key of Object.keys(UNMEASURED)) {
    assert.ok(UNMEASURED[key].length > 20, `${key} is refused without saying why`);
  }
});

test('a food that claims a measurable nutrient carries the figure, or is a named exception', () => {
  const MEASURABLE = (n) => !UNMEASURED[n];
  const excused = new Set(Object.keys(data.noMatch));
  const gaps = [];
  for (const f of foods) {
    if (excused.has(f.id)) continue;
    for (const n of f.provides.filter(MEASURABLE)) {
      if (!f.amounts?.[n]) gaps.push(`${f.id}/${n}`);
    }
  }
  // Named exactly rather than counted, so a NEW gap cannot hide under a
  // threshold. Every one of these is a real hole in SR Legacy: it barely covers
  // iodine, the two salmon entries carry no vitamin D, and its kimchi entry
  // records vitamin C as zero — which contradicts the row, so it is dropped
  // rather than printed. Blank beats guessed, every time.
  assert.deepEqual(gaps.sort(), [
    'food-kimchi/vitamin-c',
    'food-salmon-tinned-with-bones/vitamin-d',
    'food-salmon/vitamin-d',
    'food-sea-salt/iodine',
    'food-seaweed-kelp-or-kombu/iodine',
    'food-seaweed/iodine',
  ], 'the set of missing figures changed');
  for (const id of excused) {
    assert.ok(data.noMatch[id].length > 20, `${id} is unmatched without a stated reason`);
  }
});

/* ------------------------------- the figures ----------------------------- */

test('the figures are the ones a reference book gives', () => {
  // Spot checks against well-established values. These exist to fail loudly if
  // a remap ever silently points a food at the wrong USDA entry — which it did
  // once already: "oats" matched "Buckwheat groats" because the matcher was
  // looking for a substring, and would have shipped buckwheat's magnesium.
  const near = (got, want, tolerance, what) => assert.ok(
    Math.abs(got - want) / want <= tolerance,
    `${what}: expected about ${want}, got ${got}`,
  );
  near(byId['food-brazil-nuts'].amounts.selenium.perServing, 190, 0.15, 'two brazil nuts, selenium µg');
  near(byId['food-pumpkin-seeds'].amounts.magnesium.perServing, 178, 0.1, 'a handful of pumpkin seeds, magnesium mg');
  near(byId['food-sardines'].amounts.calcium.perServing, 344, 0.1, 'a tin of sardines, calcium mg');
  near(byId['food-spinach'].amounts['vitamin-k'].perServing, 145, 0.1, 'raw spinach, vitamin K µg');
  // And the one that caught the bad match: oats, not buckwheat.
  assert.match(byId['food-oats'].amountSource.fdcDescription, /^Oats/, 'oats is pointed at the wrong food');
});

test('an omega-3 figure says which fatty acids went into it', () => {
  // The app says "omega-3"; USDA says ALA, EPA and DHA. Summing is the honest
  // answer to the question asked, but only if the sum shows its working.
  const salmon = byId['food-salmon'].amounts['omega-3'];
  assert.ok(salmon.summedFrom?.length, 'the omega-3 sum does not say what it summed');
  assert.equal(salmon.summedFrom.length, 3, 'salmon should carry all three');
  assert.ok(salmon.summedFrom.some((x) => /EPA/.test(x)) && salmon.summedFrom.some((x) => /DHA/.test(x)));
  // Flaxseed reports its ALA under USDA's GENERIC 18:3 id rather than the
  // specific n-3 one, and its EPA and DHA are explicit zeros. Summing only the
  // specific ids gave it 0 g of omega-3 — wrong about one of the richest ALA
  // foods there is. The label says which id answered.
  const flax = byId['food-flaxseed'].amounts['omega-3'];
  assert.match(flax.summedFrom.join(), /^ALA/, 'a seed omega-3 should be ALA');
  assert.ok(flax.perServing > 1, `flaxseed came out at ${flax.perServing} g, which cannot be right`);
  // Chia carries BOTH ids at the same value; choosing rather than adding is
  // what keeps it from being doubled.
  const chia = byId['food-chia-seeds'].amounts['omega-3'];
  assert.deepEqual(chia.summedFrom, ['ALA']);
  assert.ok(chia.perServing < 3, `chia was double counted: ${chia.perServing} g`);
});

/* -------------------------------- the doses ------------------------------ */

test('a dose string becomes a range, or honestly becomes nothing', () => {
  assert.deepEqual(parseDose('200–400 mg elemental', 'magnesium'), { lo: 200, hi: 400, unit: 'mg' });
  assert.deepEqual(parseDose('500 mg', 'calcium'), { lo: 500, hi: 500, unit: 'mg' });
  assert.deepEqual(parseDose('1–2 g', 'taurine'), { lo: 1000, hi: 2000, unit: 'g' });
  assert.deepEqual(parseDose('100–200 mcg', 'selenium'), { lo: 0.1, hi: 0.2, unit: 'mcg' });
  // The shelf is honest that some products only say it on the tub.
  assert.equal(parseDose('per label', 'magnesium'), null);
  assert.equal(parseDose('one sachet', 'sodium'), null);
  assert.equal(parseDose('5 ml', 'vitamin-d'), null);
});

test('IU converts for vitamin D and refuses for the two where it would be a guess', () => {
  // 1 µg cholecalciferol = 40 IU, exactly, always.
  const d = parseDose('1000–2000 IU', 'vitamin-d');
  assert.equal(d.unit, 'mcg');
  assert.ok(Math.abs(d.lo - 0.025) < 1e-9, '1000 IU should be 25 µg');
  assert.ok(Math.abs(d.hi - 0.05) < 1e-9, '2000 IU should be 50 µg');
  // Vitamin A depends on retinol versus beta-carotene, vitamin E on natural
  // versus synthetic. Both factors differ by enough to matter, so neither is
  // applied silently.
  assert.equal(parseDose('2500–5000 IU', 'vitamin-a').unreadable, 'IU');
  assert.equal(parseDose('100–400 IU', 'vitamin-e').unreadable, 'IU');
});

test('the comparison answers "how many servings", and declines when it cannot', () => {
  const pk = byId['food-pumpkin-seeds'];
  const c = compare({ amount: pk.amounts.magnesium, doseText: '200–400 mg elemental', nutrient: 'magnesium' });
  assert.equal(c.food, '178 mg');
  assert.deepEqual(c.servings, { lo: 1, hi: 2 }, 'a handful and a bit should cover a magnesium capsule');

  // Two brazil nuts beat a selenium capsule, and the number should say so.
  const bz = compare({ amount: byId['food-brazil-nuts'].amounts.selenium, doseText: '100–200 mcg', nutrient: 'selenium' });
  assert.ok(bz.servings.hi <= 1, 'two brazil nuts should cover a selenium dose');

  // Sardines cannot realistically replace a vitamin D capsule, and the honest
  // answer is the big number rather than no number.
  const sd = compare({ amount: byId['food-sardines'].amounts['vitamin-d'], doseText: '1000–2000 IU', nutrient: 'vitamin-d' });
  assert.ok(sd.servings.lo >= 4, 'the vitamin D comparison is understating how many tins that is');

  // No dose to compare against: the food amount still shows, the ratio does not.
  const noDose = compare({ amount: pk.amounts.magnesium, doseText: 'per label', nutrient: 'magnesium' });
  assert.equal(noDose.food, '178 mg');
  assert.equal(noDose.servings, undefined, 'a ratio was invented against an unreadable dose');
});

test('an amount reads in the unit a person would use', () => {
  assert.equal(formatMg(178), '178 mg');
  assert.equal(formatMg(1720), '1.72 g');
  assert.equal(formatMg(0.192), '192 mcg');
});
