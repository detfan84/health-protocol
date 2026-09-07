# The shelf, researched — 110 → 152

*2 Sep 2026. Your standing ask: "do some quick research and learn what are the
top 100, 200, whatever supplements and just make those easily accessible." Done
via four independent sweeps — mainstream usage surveys (CRN, NHANES, HerbalGram
sales data), the POTS/EDS/ME-CFS patient community specifically, the
fitness/longevity world, and women's/hormonal — then a synthesis against the
shelf. The changes are APPLIED (the shelf is a tracker; a row is cheap and its
absence fails somebody), and this file is the record for you to strike.*

## Applied: 43 adds

**The one that matters most for your audience: Salt tablets.** First-line in
essentially every POTS protocol, named and dosed as tablets by the people who
take them — and "Electrolytes" was not how they would find it. The rest of the
patient-community adds: Thiamine (B1) · D-ribose · NADH · DAO enzyme ·
Luteolin · Stinging nettle · Licorice root, whole (the *opposite* product from
DGL — glycyrrhizin is the part these users want) · L-lysine · Oxaloacetate ·
Pine bark extract · DHEA.

**Women's/hormonal — the biggest hole in the original 110:** Prenatal
multivitamin (64% of pregnant users; "Multivitamin" is not what she searches) ·
Vitex · Black cohosh · Evening primrose · Red raspberry leaf · Spearmint · Soy
isoflavones · Red clover · Dong quai · St. John's wort · Biotin · Choline.

**Mainstream staples that outsell things already on the shelf:** Cranberry ·
Ginkgo · Ginseng · Fenugreek · Garlic extract · CBD · Red yeast rice · Black
seed oil · Lutein.

**Fitness/longevity:** Apigenin · Tongkat ali · Fadogia agrestis · Boron ·
HMB · TMG (methylation — a different job from Betaine HCl) · Spermidine ·
Fisetin · Ca-AKG.

## Applied: 5 renames — the search-failure fixes

Folate **(folic acid)** · NMN / NR **(NAD+ precursor)** · DGL
**(deglycyrrhizinated licorice**, US spelling now findable**)** · Omega-3
**(fish oil)** · BCAAs. Six other proposed renames were NOT needed — search
already matches the substance field, so "curcumin", "myo-inositol",
"N-acetylcysteine", "ubiquinol", "ALCAR" and "EAA" were already findable.

Renamed rows keep their original ids, enforced by a pinned-id map in the build
script — ids are permanent, names are labels, and the first attempt at this
rename silently minted new ids and broke the nutrient join for a minute. The
map is the reason it cannot happen again.

## NOT applied: the 2 proposed removes

Serrapeptase and Ox bile showed no common use in any sweep — but a tracker row
costs nothing to keep and its absence fails the person who takes it, and both
live in exactly the functional-medicine circles this audience overlaps. Strike
them yourself if you want them gone.

## Excluded on your own ruling

**Caffeine** — the sweep's top fitness add, and it stays off: "I don't think
anyone thinks caffeine is a supplement," and a test enforces it.

## Judgment calls worth your eye

- **Doses are "per label" on most adds.** Where the community has one settled
  number (D-ribose 5 g, apigenin 50 mg, HMB 3 g, boron 2–4 mg, lysine 1–2 g)
  it is written; everywhere else, inventing a typical dose would be the
  sixty-seconds failure again.
- **Pycnogenol is a trademark**, so the row is "Pine bark extract
  (pycnogenol)" — substance first, findable name kept.
- **St. John's wort carries the shelf's most pointed note** ("talks to a long
  list of medications — the interaction check is the whole game"). One
  sentence, practical, no theatre — but it is the closest thing to a warning
  on the shelf, so it is named here for you to strike.
- The note-count test (fails if more than half the shelf carries notes) still
  passes: 33 of 152.
