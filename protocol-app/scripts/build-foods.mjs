// build-foods.mjs — where the nutrients come from before a bottle does.
//
// Kevin, 29 Aug: "help people identify what foods are good sources to get what
// they need for the people who prefer avoiding supplements… supplements are
// just supplementing the nutrients you aren't getting in your food right?"
//
// That reframe is what makes this buildable: the NUTRIENT is the join. Ask for
// magnesium and you get pumpkin seeds and a capsule side by side, and choosing
// between them is a preference rather than a question the app answers for you.
//
// It is also only half true, and the half that is wrong is the useful half. Of
// the 110 on the supplement shelf, about fifty name a nutrient you could eat
// instead; the other sixty — ashwagandha, berberine, serrapeptase — have no
// food route at all. A page that implied otherwise would be lying to somebody
// trying to eat their way off a shelf, so the screen says which it is looking
// at rather than pretending the two columns are mirrors.
//
//   name | nutrients | serving | aisle | note
//
// The serving is the honest unit: "a small handful", "one tin", "two nuts". Not
// grams per 100 g, which nobody weighs, and not a percentage of a daily value,
// which varies by country, by age and by who is asking. A food is listed
// because it is a genuinely good source in a portion somebody would actually
// eat — that is the whole editorial rule.
//
// No amounts are asserted beyond the serving. This app does not do nutrition
// maths and should not start: "eat sardines for omega-3" is true and useful,
// "this gives you 84% of your omega-3" is a number with a dozen assumptions
// hidden inside it.

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/content/authored/foods.json');

/* name | nutrients | serving | aisle | note */
const TABLE = `
Pumpkin seeds | magnesium,zinc,iron | a small handful | pantry |
Almonds | magnesium,vitamin-e,protein | a small handful | pantry |
Cashews | magnesium,zinc,copper | a small handful | pantry |
Brazil nuts | selenium | two nuts | pantry | Two is a day's worth. More is genuinely not better with selenium.
Walnuts | omega-3,polyphenols | a small handful | pantry | The plant form of omega-3, which the body converts poorly — useful, not equivalent to fish.
Sunflower seeds | vitamin-e,magnesium | a small handful | pantry |
Chia seeds | fibre,omega-3,calcium | a tablespoon | pantry |
Flaxseed | fibre,omega-3 | a tablespoon, ground | pantry | Whole seeds pass straight through. Ground or nothing.
Hemp seeds | protein,magnesium | two tablespoons | pantry |
Sardines | omega-3,vitamin-d,calcium,b12,selenium | one tin | pantry | The bones are the calcium. Eat them.
Salmon | omega-3,vitamin-d,b12,protein | a palm-sized fillet | protein |
Mackerel | omega-3,vitamin-d,b12 | one fillet | protein |
Anchovies | omega-3,calcium | a few | pantry |
Oysters | zinc,b12,copper,iron | six | protein | Far and away the densest source of zinc there is.
Mussels | b12,iron,selenium | a bowl | protein |
Beef liver | vitamin-a,b12,folate,iron,copper | a small slice, once a week | protein | Extremely dense — weekly rather than daily, and not in pregnancy without asking.
Beef | protein,iron,zinc,b12,creatine | a palm-sized portion | protein |
Lamb | protein,iron,zinc,b12 | a palm-sized portion | protein |
Chicken | protein,b6,selenium | a palm-sized portion | protein |
Eggs | protein,choline,vitamin-d,b12 | two | protein | The choline is in the yolk, and there is not much choline anywhere else.
Greek yoghurt | protein,calcium,probiotics,b12 | a small pot | dairy |
Kefir | probiotics,calcium,b12 | a glass | dairy | More strains than most yoghurt, and more than most capsules.
Cheese | calcium,protein,vitamin-k | a matchbox-sized piece | dairy |
Cottage cheese | protein,calcium | a small pot | dairy |
Milk | calcium,protein,b12 | a glass | dairy |
Sauerkraut | probiotics,vitamin-c,fibre | a forkful | pantry | Unpasteurised, from the chilled section — the shelf-stable jars have no live cultures.
Kimchi | probiotics,vitamin-c | a forkful | pantry |
Miso | probiotics | a spoonful in warm water | pantry | Do not boil it — heat kills the cultures.
Tempeh | protein,probiotics,magnesium | a palm-sized piece | protein |
Tofu | protein,calcium,iron | a palm-sized piece | protein |
Edamame | protein,folate,fibre | a bowl | frozen |
Lentils | fibre,folate,iron,protein | a cupful cooked | pantry |
Chickpeas | fibre,folate,protein,iron | a cupful cooked | pantry |
Black beans | fibre,folate,magnesium,protein | a cupful cooked | pantry |
Kidney beans | fibre,iron,folate | a cupful cooked | pantry |
Oats | fibre,magnesium | a bowl | pantry | The soluble fibre here is the one with the cholesterol evidence behind it.
Quinoa | protein,magnesium,fibre | a cupful cooked | pantry |
Brown rice | magnesium,fibre | a cupful cooked | pantry |
Buckwheat | magnesium,fibre,polyphenols | a cupful cooked | pantry |
Wholegrain bread | fibre,b6 | two slices | pantry |
Spinach | folate,magnesium,vitamin-k,iron | a large handful, cooked | produce | The iron absorbs far better alongside something with vitamin C.
Kale | vitamin-k,vitamin-c,calcium | a large handful | produce |
Swiss chard | magnesium,vitamin-k,potassium | a large handful, cooked | produce |
Broccoli | vitamin-c,vitamin-k,folate,fibre | a cupful | produce |
Brussels sprouts | vitamin-c,vitamin-k,fibre | a cupful | produce |
Cabbage | vitamin-c,vitamin-k,fibre | a cupful | produce |
Cauliflower | vitamin-c,choline,fibre | a cupful | produce |
Rocket | vitamin-k,folate,nitrate | a handful | produce |
Beetroot | nitrate,folate | one, roasted | produce | The nitrate is what the sports-drink versions are selling.
Sweet potato | vitamin-a,fibre,potassium | one medium | produce |
Carrots | vitamin-a,fibre | two | produce |
Butternut squash | vitamin-a,vitamin-c,potassium | a cupful | produce |
Red pepper | vitamin-c,vitamin-a | one | produce | More vitamin C than an orange, by a wide margin.
Tomatoes | polyphenols,vitamin-c,potassium | two | produce | Cooked releases more lycopene than raw — the one vegetable that gains from a pan.
Avocado | potassium,fibre,vitamin-e | half | produce |
Banana | potassium,b6,fibre | one | produce |
Potatoes | potassium,vitamin-c,fibre | one medium, skin on | produce | The skin is most of the fibre and a lot of the potassium.
Oranges | vitamin-c,folate,fibre | one | produce |
Kiwi | vitamin-c,fibre,potassium | two | produce |
Strawberries | vitamin-c,polyphenols | a bowl | produce |
Blueberries | polyphenols,vitamin-c,fibre | a handful | produce |
Blackberries | fibre,polyphenols,vitamin-c | a handful | produce |
Raspberries | fibre,vitamin-c | a handful | produce |
Cherries | polyphenols,melatonin | a bowl | produce | Tart cherries, specifically, are what the sleep research used.
Pomegranate | polyphenols,vitamin-k,fibre | half | produce |
Apples | fibre,polyphenols | one | produce |
Pears | fibre | one | produce |
Prunes | fibre,vitamin-k,potassium | four or five | pantry |
Figs | fibre,calcium,potassium | three dried | pantry |
Dark chocolate | magnesium,iron,polyphenols | two squares | pantry | 70% and up, or it is mostly sugar.
Olive oil | vitamin-e,polyphenols | a tablespoon | pantry | Extra virgin. The polyphenols are what the refining removes.
Green tea | polyphenols | a cup | pantry |
Mushrooms | vitamin-d,selenium,copper | a handful | produce | Only if they saw sunlight or UV — most supermarket mushrooms did not.
Seaweed | iodine | a sheet | pantry | Iodine varies enormously by type. Kelp in particular can be far too much.
Nutritional yeast | b12,protein | two tablespoons | pantry | Only the fortified kind carries B12. Check the label.
Bone broth | collagen,protein | a mug | pantry |
Chicken skin and cartilage | collagen | as it comes | protein |
Sesame seeds | calcium,magnesium,iron | a tablespoon | pantry |
Tahini | calcium,magnesium | a tablespoon | pantry |
Molasses | iron,magnesium,potassium | a tablespoon | pantry |
Coconut water | potassium | a glass | pantry |
Sea salt | sodium,iodine | a pinch | pantry |
Garlic | polyphenols | two cloves | produce |
Ginger root | polyphenols | a thumb-sized piece | produce |
Turmeric root | polyphenols | a thumb-sized piece | produce | Pair it with black pepper and a fat, or most of it goes straight through.
Herring | omega-3,vitamin-d,b12 | one fillet | protein |
Cod | protein,b12,selenium | a palm-sized fillet | protein |
Tuna | protein,omega-3,selenium | one tin | pantry | Fine weekly; mercury is the reason not to make it daily.
Shrimp | protein,selenium,b12 | a handful | protein |
Peas | fibre,protein,vitamin-c | a cupful | frozen |
Sweetcorn | fibre | a cupful | frozen |
Asparagus | folate,vitamin-k,fibre | a handful | produce |
Artichoke | fibre,folate | one | produce |
Onions | polyphenols,fibre | one | produce |
Leeks | fibre,vitamin-k | one | produce |
Whole milk yoghurt | calcium,protein,probiotics | a small pot | dairy |
Cocoa powder | magnesium,polyphenols,iron | two tablespoons | pantry |
`.trim();

const AISLES = ['produce', 'protein', 'dairy', 'frozen', 'pantry'];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const items = TABLE.split('\n').map((line) => {
  const [name, nutrients, serving, aisle, note] = line.split('|').map((c) => c.trim());
  if (!AISLES.includes(aisle)) throw new Error(`${name}: "${aisle}" is not an aisle`);
  const item = {
    id: `food-${slug(name)}`,
    name,
    type: 'intake',
    intakeKind: 'food',
    tracking: 'check',
    provides: nutrients.split(',').map((v) => v.trim()).filter(Boolean),
    serving,
    aisle,
  };
  if (note) item.fields = { release: note };
  return item;
});

const ids = new Set();
for (const it of items) {
  if (ids.has(it.id)) throw new Error(`duplicate food id: ${it.id}`);
  ids.add(it.id);
  if (!it.provides.length) throw new Error(`${it.id} names no nutrient — then it is just a food`);
}

await writeFile(OUT, `${JSON.stringify({
  format: 'shoes-of-peace/authored@1',
  module: 'foods',
  note: 'GENERATED by scripts/build-foods.mjs — edit the table there, not this file. Good food sources of the nutrients the supplement shelf sells in capsules, so somebody who would rather eat than swallow has somewhere to look. Servings are the units people actually use; no percentages and no nutrition maths, because those numbers carry assumptions this app has no business hiding.',
  items,
}, null, 2)}\n`);

const byNutrient = {};
for (const i of items) for (const n of i.provides) byNutrient[n] = (byNutrient[n] ?? 0) + 1;
console.log(`foods: ${items.length} across ${Object.keys(byNutrient).length} nutrients`);
console.log(`  thinnest: ${Object.entries(byNutrient).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  with a note: ${items.filter((i) => i.fields).length}`);
