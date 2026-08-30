// build-supplements.mjs — the supplement shelf, from a table.
//
// Kevin, 29 Aug: "there are literally thousands of supplements, you could
// easily find the top 100 and put them in there."
//
// So the source is a TABLE, not a hundred hand-written JSON blocks. A person
// scanning a shelf of a hundred things wants the name, what it is for, when to
// take it and how much — and nothing else. The verbose card shape the first
// eight had (evidence paragraphs, warning boxes) does not survive contact with
// a hundred entries, and it should not: this is a tracker for what somebody
// already takes, not a case for taking anything.
//
//   name | substance | supports | timing | form | dose | bottle | note
//
// `note` is one line and optional. It earns its place only when there is
// something a person would otherwise get wrong — elemental magnesium is not
// capsule milligrams, fish oil labels count the wrong number, psyllium needs
// water. Most rows do not need one and most rows do not have one.
//
// TIMING is the field that makes a supplement land somewhere real in the day
// rather than in a list beside it: fasted · with-food · evening · before-bed ·
// anytime. It is a suggestion the person can change, not a schedule.
//
// No brand names. A brand is where you buy a substance, which is a different
// fact and belongs with the offers, not with what the thing IS.

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/content/authored/supplements.json');

// form → the unit a bottle of it is counted in, so reorder tracking has
// something to count without anybody typing it twice.
const UNIT = {
  capsule: 'capsule', softgel: 'softgel', tablet: 'tablet',
  powder: 'scoop', liquid: 'ml', drops: 'drop', lozenge: 'lozenge', gummy: 'gummy',
};

/* name | substance | supports | timing | form | dose | per bottle | per dose | note */
const TABLE = `
Magnesium glycinate | magnesium bisglycinate | sleep,muscle,nervous-system | before-bed | capsule | 200–400 mg elemental | 120 | 2 | Check the label for ELEMENTAL magnesium — a 500 mg capsule is closer to 70 mg of magnesium.
Magnesium citrate | magnesium citrate | gut,muscle | before-bed | powder | 200–400 mg elemental | 60 | 1 | The laxative one. That is a feature or a problem depending on why you are taking it.
Magnesium threonate | magnesium L-threonate | sleep,brain | before-bed | capsule | 1–2 g | 90 | 3 |
Vitamin D3 | cholecalciferol | immune,bone | with-food | softgel | 1000–2000 IU | 60 | 1 | Worth a blood test — it tells you the dose, which no label can.
Vitamin D3 with K2 | cholecalciferol + menaquinone-7 | immune,bone | with-food | softgel | 1000–2000 IU D3 | 60 | 1 |
Vitamin K2 | menaquinone-7 | bone,heart | with-food | capsule | 100–200 mcg | 60 | 1 |
Vitamin C | ascorbic acid | immune,skin | with-food | capsule | 500–1000 mg | 100 | 1 | Absorption drops steeply above about 500 mg at once — split a larger dose.
Vitamin B12 | methylcobalamin | energy,brain | fasted | lozenge | 500–1000 mcg | 60 | 1 | Worth it if you eat little animal food, or take metformin or long-term acid blockers.
Vitamin B6 | pyridoxal-5-phosphate | nervous-system,energy | with-food | capsule | 10–50 mg | 60 | 1 |
Folate | L-methylfolate | energy,heart | with-food | capsule | 400–800 mcg | 60 | 1 |
Vitamin B complex | mixed B vitamins | energy,nervous-system | fasted | capsule | per label | 60 | 1 | Turns urine bright yellow. That is riboflavin, not a problem.
Vitamin A | retinyl palmitate | immune,skin | with-food | softgel | 2500–5000 IU | 60 | 1 |
Vitamin E | mixed tocopherols | skin,heart | with-food | softgel | 100–400 IU | 60 | 1 |
Zinc | zinc picolinate | immune,skin | with-food | capsule | 15–30 mg | 90 | 1 | Fasted zinc causes nausea in most people. Competes with iron and calcium.
Iron | ferrous bisglycinate | energy | fasted | capsule | 18–65 mg | 60 | 1 | Vitamin C helps it absorb; tea, coffee and calcium block it.
Calcium | calcium citrate | bone | with-food | capsule | 500 mg | 120 | 2 |
Selenium | selenomethionine | immune,thyroid | with-food | capsule | 100–200 mcg | 90 | 1 |
Iodine | potassium iodide | thyroid | with-food | capsule | 150 mcg | 90 | 1 |
Potassium | potassium citrate | hydration,muscle | with-food | capsule | 99 mg | 100 | 1 |
Copper | copper bisglycinate | immune | with-food | capsule | 1–2 mg | 60 | 1 | Usually only worth it alongside long-term zinc, which depletes it.
Trace minerals | ionic trace mineral blend | hydration | anytime | drops | per label | 1200 | 10 |
Electrolytes | sodium, potassium and magnesium salts | hydration,energy | anytime | powder | one sachet | 30 | 1 | For heat, hard sweat, illness or a long fast — not a daily requirement for most people.
Creatine monohydrate | creatine monohydrate | strength,energy,cognition | anytime | powder | 3–5 g | 60 | 1 | Monohydrate is the studied form. The expensive ones are not better.
Whey protein | whey protein isolate | muscle,strength | anytime | powder | 20–30 g | 30 | 1 |
Casein protein | micellar casein | muscle | before-bed | powder | 20–30 g | 30 | 1 |
Pea protein | pea protein isolate | muscle | anytime | powder | 20–30 g | 30 | 1 |
Collagen peptides | hydrolysed collagen | skin,joint | anytime | powder | 10–15 g | 30 | 1 | Digested into ordinary amino acids like any other protein.
Essential amino acids | EAA blend | muscle | fasted | powder | 5–10 g | 30 | 1 |
Branched-chain amino acids | leucine, isoleucine, valine | muscle | anytime | powder | 5 g | 30 | 1 | Largely redundant if you already get enough protein.
L-glutamine | L-glutamine | gut | fasted | powder | 5 g | 60 | 1 |
Glycine | glycine | sleep | before-bed | powder | 3 g | 60 | 1 |
L-theanine | L-theanine | calm,cognition | anytime | capsule | 100–200 mg | 60 | 1 | Often taken with caffeine to take the edge off it.
Taurine | taurine | heart,muscle | anytime | capsule | 1–2 g | 60 | 2 |
L-carnitine | acetyl-L-carnitine | energy,brain | fasted | capsule | 500–1000 mg | 60 | 1 |
L-tyrosine | L-tyrosine | cognition,energy | fasted | capsule | 500–1000 mg | 60 | 1 |
L-arginine | L-arginine | heart | fasted | capsule | 3–6 g | 90 | 3 |
L-citrulline | citrulline malate | strength,heart | fasted | powder | 6–8 g | 30 | 1 |
Beta-alanine | beta-alanine | strength | anytime | powder | 3–5 g | 60 | 1 | The skin tingling is harmless and wears off with regular use.
Omega-3 | EPA and DHA | heart,inflammation,brain | with-food | softgel | 1–2 g combined EPA+DHA | 120 | 2 | Read the back panel — "1000 mg fish oil" is often 300 mg of the part that does anything.
Cod liver oil | cod liver oil | immune,joint | with-food | liquid | 5 ml | 250 | 5 |
Krill oil | krill oil | heart,joint | with-food | softgel | 1 g | 60 | 2 |
Algae omega-3 | algal DHA/EPA | heart,brain | with-food | softgel | 500 mg | 60 | 2 | The vegan route to the same fatty acids.
Flaxseed oil | alpha-linolenic acid | heart | with-food | softgel | 1–2 g | 100 | 2 |
MCT oil | medium-chain triglycerides | energy | anytime | liquid | 5–15 ml | 500 | 10 | Start small. Too much too soon is a bathroom problem.
Probiotic | mixed live bacterial strains | gut,immune | fasted | capsule | per label | 30 | 1 | Effects are strain-specific — "a probiotic" is not one thing.
Saccharomyces boulardii | saccharomyces boulardii | gut | fasted | capsule | 250–500 mg | 60 | 1 |
Prebiotic fibre | inulin or GOS | gut | with-food | powder | 3–5 g | 30 | 1 | Build up slowly or it will find you out.
Psyllium husk | plantago ovata husk | gut,heart | with-food | powder | 5–10 g | 60 | 1 | A full large glass of water every time. Keep it a couple of hours clear of medication.
Digestive enzymes | mixed protease, lipase, amylase | gut | with-food | capsule | per label | 90 | 1 |
Betaine HCl | betaine hydrochloride | gut | with-food | capsule | 500–650 mg | 100 | 1 |
Ox bile | ox bile extract | gut | with-food | capsule | 100–500 mg | 60 | 1 |
Slippery elm | ulmus rubra bark | gut | fasted | powder | 2–4 g | 30 | 1 |
Aloe vera | aloe barbadensis leaf | gut | fasted | liquid | 30 ml | 500 | 30 |
Deglycyrrhizinated liquorice | DGL liquorice | gut | fasted | tablet | 400 mg | 100 | 1 |
Turmeric | curcumin | inflammation,joint | with-food | capsule | 500–1000 mg | 60 | 2 | Curcumin absorbs poorly on its own — most products pair it with piperine or a lipid.
Boswellia | boswellia serrata | inflammation,joint | with-food | capsule | 300–500 mg | 60 | 1 |
Ginger | zingiber officinale | gut,inflammation | with-food | capsule | 500–1000 mg | 60 | 1 |
Quercetin | quercetin | immune,inflammation | with-food | capsule | 500 mg | 60 | 1 |
Resveratrol | trans-resveratrol | heart | with-food | capsule | 150–500 mg | 60 | 1 |
Glucosamine and chondroitin | glucosamine sulfate + chondroitin | joint | with-food | capsule | 1500 mg | 120 | 2 |
MSM | methylsulfonylmethane | joint,skin | with-food | powder | 1–3 g | 60 | 1 |
Hyaluronic acid | sodium hyaluronate | joint,skin | anytime | capsule | 100–200 mg | 60 | 1 |
Ashwagandha | withania somnifera | calm,sleep | evening | capsule | 300–600 mg | 60 | 1 |
Rhodiola | rhodiola rosea | energy,cognition | fasted | capsule | 200–400 mg | 60 | 1 | Stimulating for most people — late in the day it can cost you sleep.
Holy basil | ocimum sanctum | calm | evening | capsule | 300–600 mg | 60 | 1 |
Reishi | ganoderma lucidum | immune,sleep | evening | capsule | 1–2 g | 90 | 2 |
Lion's mane | hericium erinaceus | brain,cognition | anytime | capsule | 500–1000 mg | 60 | 2 |
Cordyceps | cordyceps militaris | energy | fasted | capsule | 1–2 g | 90 | 2 |
Chaga | inonotus obliquus | immune | anytime | capsule | 1 g | 60 | 2 |
Beta-glucan | 1,3/1,6 beta-glucan | immune | fasted | capsule | 250–500 mg | 60 | 1 |
Elderberry | sambucus nigra | immune | anytime | capsule | 300–600 mg | 60 | 1 |
Echinacea | echinacea purpurea | immune | anytime | capsule | 300–500 mg | 60 | 1 |
Colostrum | bovine colostrum | immune,gut | fasted | powder | 5–10 g | 30 | 1 | Not into hot liquid — heat destroys the part you are paying for.
Melatonin | melatonin | sleep | before-bed | tablet | 0.5–3 mg | 60 | 1 | Lower doses work as well as high ones for most people, and it is a timing signal rather than a sedative.
Valerian | valeriana officinalis | sleep | before-bed | capsule | 300–600 mg | 60 | 1 |
Passionflower | passiflora incarnata | sleep,calm | before-bed | capsule | 250–500 mg | 60 | 1 |
Lemon balm | melissa officinalis | calm,sleep | evening | capsule | 300–600 mg | 60 | 1 |
Chamomile | matricaria recutita | sleep,calm | before-bed | capsule | 400 mg | 60 | 1 |
GABA | gamma-aminobutyric acid | calm,sleep | before-bed | capsule | 100–500 mg | 60 | 1 |
5-HTP | 5-hydroxytryptophan | sleep | before-bed | capsule | 50–100 mg | 60 | 1 |
Tart cherry | prunus cerasus extract | sleep,muscle | before-bed | capsule | 400–500 mg | 60 | 1 |
Inositol | myo-inositol | calm,hormonal | before-bed | powder | 2–4 g | 60 | 1 |
Alpha-lipoic acid | alpha-lipoic acid | energy | fasted | capsule | 300–600 mg | 60 | 1 |
CoQ10 | ubiquinol | heart,energy | with-food | softgel | 100–200 mg | 60 | 1 | Fat-soluble, so a meal with fat roughly doubles what you absorb.
PQQ | pyrroloquinoline quinone | energy,brain | with-food | capsule | 10–20 mg | 30 | 1 |
NAD+ precursor | nicotinamide riboside | energy | fasted | capsule | 250–500 mg | 60 | 1 |
NAC | N-acetylcysteine | immune,inflammation | fasted | capsule | 600–1200 mg | 90 | 1 |
Glutathione | liposomal glutathione | inflammation | fasted | liquid | 500 mg | 150 | 5 |
Milk thistle | silybum marianum | liver | with-food | capsule | 200–400 mg | 60 | 1 |
Dandelion root | taraxacum officinale | liver | with-food | capsule | 500 mg | 60 | 1 |
Berberine | berberine HCl | metabolic,gut | with-food | capsule | 500 mg | 90 | 1 |
Chromium | chromium picolinate | metabolic | with-food | capsule | 200 mcg | 100 | 1 |
Cinnamon | cinnamomum cassia | metabolic | with-food | capsule | 500 mg | 60 | 1 |
Nattokinase | nattokinase | heart | fasted | capsule | 2000 FU | 60 | 1 |
Serrapeptase | serrapeptase | inflammation | fasted | capsule | 40000 SPU | 90 | 1 |
Bromelain | bromelain | inflammation,gut | fasted | capsule | 500 mg | 60 | 1 |
Beetroot | beta vulgaris extract | heart,energy | fasted | powder | 5 g | 30 | 1 |
Spirulina | arthrospira platensis | energy | anytime | tablet | 3 g | 180 | 6 |
Chlorella | chlorella vulgaris | energy | anytime | tablet | 3 g | 180 | 6 |
Green tea extract | EGCG | metabolic,cognition | fasted | capsule | 300–500 mg | 60 | 1 |
Multivitamin | mixed vitamins and minerals | immune,energy | with-food | capsule | per label | 60 | 1 |
Greens powder | mixed vegetable and algae blend | energy | anytime | powder | one scoop | 30 | 1 | A blend, so what is in it is whatever the label says — worth reading before assuming.
Fibre blend | mixed soluble and insoluble fibre | gut | with-food | powder | 5–10 g | 30 | 1 |
Apple cider vinegar | acetic acid | gut,metabolic | with-food | capsule | 500 mg | 90 | 1 |
Sea moss | chondrus crispus | thyroid,immune | anytime | capsule | 500–1000 mg | 60 | 2 |
Shilajit | purified shilajit resin | energy | fasted | capsule | 250–500 mg | 60 | 1 |
Saw palmetto | serenoa repens | hormonal | with-food | softgel | 320 mg | 60 | 1 |
DIM | diindolylmethane | hormonal | with-food | capsule | 100–200 mg | 60 | 1 |
Maca | lepidium meyenii | energy,hormonal | anytime | powder | 3 g | 30 | 1 |
Vitamin D + omega blend | cholecalciferol + fish oil | immune,heart | with-food | softgel | per label | 60 | 1 |
`.trim();

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const items = TABLE.split('\n').map((line) => {
  const [name, substance, supports, timing, form, dose, units, perDose, note] =
    line.split('|').map((c) => c.trim());
  const item = {
    id: `sup-${slug(name)}`,
    name,
    type: 'intake',
    tracking: 'check',
    substance,
    supports: supports.split(',').map((v) => v.trim()).filter(Boolean),
    timing,
    form,
    typicalDose: dose,
    bottle: { units: Number(units), unitName: UNIT[form] ?? form, unitsPerDose: Number(perDose) },
  };
  // Absent stays absent: most rows have nothing a person would get wrong, and a
  // note invented to fill the column would be the thing this file exists to
  // avoid.
  if (note) item.fields = { release: note };
  return item;
});

const ids = new Set();
for (const it of items) {
  if (ids.has(it.id)) throw new Error(`duplicate supplement id: ${it.id}`);
  ids.add(it.id);
  if (!Number.isInteger(it.bottle.units) || !Number.isInteger(it.bottle.unitsPerDose)) {
    throw new Error(`${it.id}: bottle numbers must be integers`);
  }
}

await writeFile(OUT, `${JSON.stringify({
  format: 'shoes-of-peace/authored@1',
  module: 'supplements',
  note: 'GENERATED by scripts/build-supplements.mjs — edit the table there, not this file. A shelf of commonly taken supplements to select from, with what each is for, when it wants to be taken, and what a bottle holds so reorder tracking has something to count. Not a recommendation and not a protocol: this is for ticking off what somebody already takes. Anything not here, a person adds themselves — blends and combination products are most of the shelf now and no preloaded list will ever cover them.',
  items,
}, null, 2)}\n`);

console.log(`supplements: ${items.length} on the shelf`);
const byTiming = items.reduce((m, i) => ({ ...m, [i.timing]: (m[i.timing] ?? 0) + 1 }), {});
console.log(`  by moment: ${Object.entries(byTiming).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  with a note: ${items.filter((i) => i.fields).length} — the rest need no explaining`);
