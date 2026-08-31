// build-food-amounts.mjs — how much of a nutrient is actually in a serving.
//
// Kevin, 31 Aug: "nothing compares 'eat this much of this food to equal a
// standard dose of the vitamin supplement' or something like that. So you see a
// bunch of foods that also have it, but how much do they have? And compared to
// what? How much of that food would I need to eat? I can't tell."
//
// The food table has refused to carry amounts since it was written, and the
// reason still stands: "this gives you 84% of your omega-3" is a number with a
// dozen assumptions hidden in it. But that rule was against INVENTED numbers,
// not against numbers. A measured milligram from a named source is the opposite
// of an invention, and without one the two halves of this screen cannot be
// compared at all — which is the gap Kevin is standing in.
//
// So every figure here has a provenance, and there are exactly two layers:
//
//   1. USDA FoodData Central, SR Legacy — milligrams per 100 g. Theirs, not
//      ours. Each food names the fdc_id it came from AND that entry's own
//      description, so a wrong match is legible to a reader instead of being
//      buried inside a number that looks like a fact.
//
//   2. The gram weight of the serving the app prints. This one is OURS, and it
//      is a judgement: "a small handful" is 30 g because that is what a small
//      handful is, not because anybody measured Kevin's hand. It is written on
//      its own line, per food, so it can be argued with.
//
// The product of the two is the only arithmetic in the file.
//
// SIX NUTRIENTS GET NOTHING, and this is a finding rather than a shortfall.
// Polyphenols and nitrate exist as columns in SR Legacy and NO food in the set
// carries a value for either. Probiotics, collagen, creatine and melatonin are
// not measured at all — probiotics are organisms rather than a nutrient. For
// those, the app must say it does not know. It must not estimate.
//
// Re-run:  node scripts/build-food-amounts.mjs <unpacked SR Legacy csv dir>
// The CSVs are ~38 MB and deliberately not in the repo; the OUTPUT is, because
// the output is reviewable and the zip is not.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/content/data/food-amounts.json');

// app food id | fdc_id | grams in the serving the app prints
const TABLE = `
food-pumpkin-seeds | 170556 | 30
food-almonds | 170567 | 30
food-cashews | 170162 | 30
food-brazil-nuts | 170569 | 10
food-walnuts | 170187 | 30
food-sunflower-seeds | 170562 | 30
food-chia-seeds | 170554 | 12
food-flaxseed | 169414 | 10
food-hemp-seeds | 170148 | 20
food-sardines | 175139 | 90
food-salmon | 173686 | 120
food-salmon-tinned-with-bones | 174225 | 105
food-salmon-smoked | 173687 | 50
food-mackerel | 175119 | 100
food-anchovies | 174183 | 20
food-oysters | 171978 | 85
food-mussels | 174217 | 150
food-beef-liver | 169451 | 60
food-beef | 171790 | 120
food-lamb | 173810 | 120
food-chicken | 171477 | 120
food-eggs | 171287 | 100
food-greek-yoghurt | 171304 | 150
food-greek-yoghurt-heat-treated | 171304 | 150
food-kefir | 170904 | 200
food-cheese | 170899 | 30
food-cottage-cheese | 172179 | 150
food-milk | 171265 | 200
food-sauerkraut | 169279 | 30
food-sauerkraut-jarred-pasteurised | 169279 | 30
food-kimchi | 170392 | 30
food-miso | 172442 | 15
food-tempeh | 174272 | 100
food-tofu | 172475 | 100
food-edamame | 168411 | 150
food-lentils | 175254 | 198
food-chickpeas | 173799 | 164
food-black-beans | 175237 | 172
food-kidney-beans | 175242 | 177
food-oats | 169705 | 40
food-quinoa | 168917 | 185
food-brown-rice | 169704 | 195
food-buckwheat | 170686 | 168
food-wholegrain-bread | 172688 | 60
food-spinach | 168462 | 30
food-spinach-cooked | 170531 | 90
food-kale | 168421 | 30
food-swiss-chard | 169343 | 90
food-broccoli | 170379 | 90
food-brussels-sprouts | 170383 | 90
food-cabbage | 169975 | 90
food-cauliflower | 169986 | 100
food-rocket | 169387 | 20
food-beetroot | 169146 | 80
food-beetroot-pickled | 170480 | 40
food-sweet-potato | 168483 | 130
food-carrots | 170393 | 120
food-butternut-squash | 170130 | 200
food-red-pepper | 170108 | 120
food-tomatoes | 170457 | 250
food-tomatoes-tinned-or-cooked | 170051 | 200
food-avocado | 171706 | 100
food-banana | 173944 | 120
food-potatoes | 170435 | 170
food-oranges | 169917 | 140
food-kiwi | 168153 | 140
food-strawberries | 167762 | 150
food-blueberries | 171711 | 80
food-blackberries | 173946 | 80
food-raspberries | 167755 | 80
food-cherries | 171719 | 140
food-pomegranate | 169134 | 90
food-apples | 171688 | 180
food-pears | 169118 | 180
food-prunes | 168162 | 40
food-figs | 174665 | 25
food-dark-chocolate | 170273 | 20
food-olive-oil | 171413 | 14
food-green-tea | 171917 | 240
food-mushrooms | 169251 | 70
food-mushrooms-uv-exposed-or-sun-dried | 170143 | 70
food-seaweed | 168458 | 3
food-seaweed-kelp-or-kombu | 168457 | 5
food-sesame-seeds | 170150 | 9
food-tahini | 168604 | 15
food-molasses | 168820 | 20
food-coconut-water | 170174 | 200
food-sea-salt | 173468 | 1
food-garlic | 169230 | 6
food-ginger | 169231 | 15
food-ginger-dried-ground | 170926 | 2
food-turmeric-dried-ground | 172231 | 2
food-herring | 175116 | 100
food-cod | 171955 | 120
food-tuna | 171986 | 100
food-shrimp | 174210 | 85
food-peas | 170102 | 90
food-sweetcorn | 168525 | 150
food-asparagus | 168390 | 90
food-artichoke | 169311 | 120
food-onions | 170000 | 110
food-leeks | 169246 | 90
food-whole-milk-yoghurt | 171284 | 150
food-cocoa-powder | 169593 | 10
`;

// Four foods are deliberately absent above, each for a stated reason. Silence
// would look like an oversight; this is a decision.
const NO_MATCH = {
  'food-nutritional-yeast': 'not in SR Legacy — the nearest entry is yeast extract spread, which is a different product',
  'food-bone-broth': 'not in SR Legacy — the nearest entry is a dried stock cube, and collagen is unmeasured anyway',
  'food-chicken-skin-and-cartilage': 'not in SR Legacy as a food, and collagen is unmeasured',
  'food-turmeric': 'SR Legacy has ground turmeric but not the fresh root, and its only claim here is polyphenols, which is unmeasured',
};

// app nutrient -> SR Legacy nutrient id(s). Summed where the app names a family
// and the database names its members.
const NUTRIENT_IDS = {
  protein: [1003], fibre: [1079], calcium: [1087], iron: [1089], magnesium: [1090],
  potassium: [1092], sodium: [1093], zinc: [1095], copper: [1098], iodine: [1100],
  selenium: [1103], 'vitamin-a': [1106], 'vitamin-e': [1109], 'vitamin-d': [1114],
  'vitamin-c': [1162], b6: [1175], folate: [1177], b12: [1178], choline: [1180],
  'vitamin-k': [1185],
  // The app says "omega-3"; the database says ALA, EPA and DHA. Summing them is
  // the only honest way to answer the question that was actually asked. Handled
  // below as components, because ALA has two ids — see NUTRIENT_COMPONENTS.
  'omega-3': [1404, 1278, 1272],
};

// A component is a list of candidate nutrient ids, FIRST PRESENT WINS. Only
// omega-3 needs this, and it needs it badly:
//
//   1404  PUFA 18:3 n-3 c,c,c (ALA)   the specific one
//   1270  PUFA 18:3                   the generic one
//
// Flaxseed and walnuts carry ONLY the generic id, with EPA and DHA recorded as
// explicit zeros — so summing the specific ids alone gave flaxseed 0 g of
// omega-3, which is wrong about one of the richest ALA foods there is. Chia
// carries BOTH ids at the same value, so adding them instead of choosing would
// have doubled it. First-present-wins is the rule that gets both right.
const NUTRIENT_COMPONENTS = {
  'omega-3': [[1404, 1270], [1278], [1272]],
};

// Named so the app can say WHY it is silent rather than just being silent.
const UNMEASURED = {
  polyphenols: 'SR Legacy has a polyphenols column and not one food in it carries a value',
  nitrate: 'SR Legacy has a nitrates column and not one food in it carries a value',
  probiotics: 'probiotics are live organisms, not a nutrient — there is nothing to weigh',
  collagen: 'not measured by SR Legacy',
  creatine: 'not measured by SR Legacy',
  melatonin: 'not measured by SR Legacy',
};

const UNITS = { 1003: 'g', 1079: 'g', 1404: 'g', 1278: 'g', 1272: 'g' }; // the rest are mg or µg
const NUTRIENT_NAMES = { 1404: 'ALA', 1270: 'ALA (as USDA’s generic 18:3)', 1278: 'EPA', 1272: 'DHA' };

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/build-food-amounts.mjs <unpacked SR Legacy csv dir>');
  console.error('the CSVs are not in the repo — src/content/data/food-amounts.json is.');
  process.exit(2);
}

const rows = TABLE.trim().split('\n').map((line) => {
  const [id, fdcId, grams] = line.split('|').map((c) => c.trim());
  return { id, fdcId, grams: Number(grams) };
});
for (const r of rows) {
  if (!r.id || !r.fdcId || !Number.isFinite(r.grams) || r.grams <= 0) {
    throw new Error(`bad mapping row: ${JSON.stringify(r)}`);
  }
}

const descById = new Map();
for (const r of parseCsv(readFileSync(resolve(dir, 'food.csv'), 'utf8')).slice(1)) {
  if (r[0]) descById.set(r[0], r[2]);
}

const wanted = new Set(rows.map((r) => r.fdcId));
// Both maps, or the fallback ids never get read out of the CSV at all — which
// is how flaxseed came out at zero the first time.
const allNutrientIds = new Set([
  ...Object.values(NUTRIENT_IDS).flat(),
  ...Object.values(NUTRIENT_COMPONENTS).flat(2),
].map(String));
const per100 = new Map(); // fdcId -> { nutrientId: amount }
for (const r of parseCsv(readFileSync(resolve(dir, 'food_nutrient.csv'), 'utf8')).slice(1)) {
  const [, fdcId, nutrientId, amount] = r;
  if (!wanted.has(fdcId) || !allNutrientIds.has(nutrientId)) continue;
  if (!per100.has(fdcId)) per100.set(fdcId, {});
  per100.get(fdcId)[nutrientId] = Number(amount);
}

const foods = JSON.parse(readFileSync(resolve(here, '../src/content/authored/foods.json'), 'utf8'));
const foodRows = foods.items ?? foods;
const byId = Object.fromEntries(foodRows.map((f) => [f.id, f]));

const out = {};
let filled = 0, blank = 0;
const missing = [];
for (const r of rows) {
  const food = byId[r.id];
  if (!food) throw new Error(`${r.id} is in the mapping but not in foods.json`);
  const desc = descById.get(r.fdcId);
  if (!desc) throw new Error(`${r.id} maps to fdc_id ${r.fdcId}, which is not in this dataset`);
  const amounts = {};
  for (const nutrient of food.provides ?? []) {
    if (UNMEASURED[nutrient]) continue;
    const ids = NUTRIENT_IDS[nutrient];
    if (!ids) { missing.push(`${r.id}/${nutrient}: no SR Legacy nutrient mapped`); continue; }
    // Where the app names a family and the database names its members, sum the
    // members that are ON FILE. Requiring all three was wrong: oily fish carry
    // EPA and DHA with no ALA row at all, and demanding a zero that nobody
    // measured blanked the omega-3 figure for every fish on the shelf. What
    // went into the sum is recorded, so the number can be read for what it is.
    const components = NUTRIENT_COMPONENTS[nutrient] ?? ids.map((n) => [n]);
    const found = [];
    for (const candidates of components) {
      const hit = candidates.find((n) => Number.isFinite(per100.get(r.fdcId)?.[String(n)]));
      if (hit !== undefined) found.push([hit, per100.get(r.fdcId)[String(hit)]]);
    }
    if (!found.length) {
      blank++;
      missing.push(`${r.id}/${nutrient}: ${desc} carries no value`);
      continue;
    }
    const value100 = found.reduce((a, [, v]) => a + v, 0);
    // A food is on this shelf BECAUSE it is a good source. A total of zero is
    // not a measurement, it is a contradiction — and shipping it would tell
    // somebody flaxseed has no omega-3 in it.
    if (value100 <= 0) {
      blank++;
      missing.push(`${r.id}/${nutrient}: ${desc} totals zero, which contradicts the row`);
      continue;
    }
    const unit = UNITS[ids[0]] ?? (ids[0] === 1100 || ids[0] === 1103 || ids[0] === 1106
      || ids[0] === 1114 || ids[0] === 1177 || ids[0] === 1178 || ids[0] === 1185 ? 'ug' : 'mg');
    amounts[nutrient] = {
      perServing: Number((value100 * r.grams / 100).toPrecision(3)),
      per100g: Number(value100.toPrecision(6)),
      unit,
      ...(components.length > 1
        ? { summedFrom: found.filter(([, v]) => v > 0).map(([n]) => NUTRIENT_NAMES[n] ?? n) }
        : {}),
    };
    filled++;
  }
  out[r.id] = { fdcId: r.fdcId, fdcDescription: desc, servingGrams: r.grams, amounts };
}

writeFileSync(OUT, `${JSON.stringify({
  source: 'USDA FoodData Central, SR Legacy (2018-04). Amounts per 100 g are USDA’s; the gram weight of each serving is this app’s own judgement.',
  unmeasured: UNMEASURED,
  noMatch: NO_MATCH,
  foods: out,
}, null, 2)}\n`);

console.log(`food amounts: ${filled} figures across ${rows.length} foods`);
console.log(`  ${Object.keys(NO_MATCH).length} foods deliberately unmatched, each with a stated reason`);
console.log(`  ${Object.keys(UNMEASURED).length} nutrients can never be filled: ${Object.keys(UNMEASURED).join(', ')}`);
if (missing.length) {
  console.log(`  ${missing.length} food/nutrient pairs left blank rather than guessed:`);
  for (const m of missing) console.log(`    ${m}`);
}
