// nutrientNotes.js — what a nutrient actually is, in plain words.
//
// Kevin, 31 Aug: "it's nice to see that it has polyphenols or whatever too, but
// what are those? We should be able to click to get some education on it if we
// want."
//
// "If we want" is the whole design. These are behind a tap, never in the way of
// somebody who already knows what magnesium is.
//
// The rules these are written to, which are the app's rules and not new ones:
//
//   · What it is and what the body does with it. Nothing about what it cures.
//   · No doses, no daily values, no "you need". How much anybody needs varies
//     by age, country and person, and a number here would be exactly the kind
//     of invented figure the food table refuses to print.
//   · No warning theatre. A caution on all of them is a caution on none.
//
// One paragraph each, because a second paragraph is where claims start.

export const NUTRIENT_NOTES = {
  protein: 'The material the body rebuilds itself out of — muscle, skin, hair, enzymes, and the antibodies in your blood. It is made of amino acids, and because the body cannot store a surplus of them the way it stores fat, protein is something it looks for regularly rather than occasionally.',

  fibre: 'The part of a plant you do not digest. That is the point of it: it passes through largely intact, which gives stool its bulk and gives the bacteria in your large intestine something to feed on. Broadly it comes in two sorts — one that dissolves into a gel and one that does not — and most plant foods carry a mix.',

  'omega-3': 'A family of fats the body cannot build from scratch, so they arrive in food or not at all. They end up in cell membranes throughout the body, and in high concentration in the brain and the retina. The long-chain forms are the ones found in oily fish and algae.',

  collagen: 'The most abundant protein in the body and the main structural material in skin, tendon, ligament and bone. What you eat is broken down into amino acids like any other protein rather than being installed as-is.',

  calcium: 'A mineral held mostly in bone and teeth, which double as the body’s store of it. The small remaining fraction circulating in blood is what muscles use to contract and nerves use to signal, and the body defends that level closely.',

  magnesium: 'A mineral involved in several hundred enzyme reactions, including the ones that release energy from food and the ones that let a contracted muscle relax again. Most of the body’s supply sits in bone and inside cells rather than in the blood.',

  potassium: 'The main mineral inside your cells, working against sodium outside them. That difference across the cell membrane is what nerves fire with and what makes a heartbeat regular. It is common in whole plant foods and largely absent from processed ones.',

  sodium: 'The main mineral in the fluid outside your cells, and the thing that governs how much water your body holds. Almost all of it arrives as salt. It is not a nutrient most people go looking for, but heavy sweating loses it.',

  iron: 'The atom at the centre of haemoglobin, which is how blood carries oxygen. It comes in two forms: haem iron from animal foods, absorbed readily, and non-haem iron from plants, absorbed less readily but better in the presence of vitamin C.',

  zinc: 'A mineral used across the immune system, in wound healing, in taste and smell, and in the enzymes that copy DNA. The body has no real store of it, which is why it turns up in the diet as a recurring need rather than a one-off.',

  selenium: 'A trace mineral built into a small set of proteins, most of them antioxidant enzymes that mop up reactive by-products of ordinary metabolism, and some involved in thyroid hormone. The amount in plant foods depends heavily on the soil they grew in.',

  iodine: 'A trace mineral with essentially one job: the thyroid uses it to build the hormones that set your metabolic rate. It is concentrated in seaweed, seafood and dairy, and in many countries in iodised salt.',

  copper: 'A trace mineral that works alongside iron in moving oxygen and building connective tissue, and is used in the pigment that colours hair and skin. Needed in genuinely small amounts.',

  'vitamin-a': 'A fat-soluble vitamin used in vision — it is part of the pigment in the retina that responds to light — and in skin, immune tissue and the linings of the body. Animal foods carry it ready-made; orange and dark green plants carry carotenoids the body converts.',

  'vitamin-c': 'A water-soluble vitamin the body cannot make, unlike most animals. It is required to build collagen, which is why a long deficiency shows up in gums and skin, and it improves absorption of iron from plant foods eaten alongside it.',

  'vitamin-d': 'Made in skin exposed to ultraviolet light, which makes it as much a consequence of latitude and season as of diet. It governs how much calcium you absorb from food, and receptors for it turn up well beyond bone. Few foods carry much: oily fish, egg yolk, and mushrooms that have seen UV light.',

  'vitamin-e': 'A fat-soluble antioxidant that sits in cell membranes and protects the fats there from oxidising. Concentrated in nuts, seeds and the oils pressed from them.',

  'vitamin-k': 'Required for blood to clot, and for the proteins that bind calcium into bone. K1 comes from leafy greens; K2 comes from fermented foods and some animal foods.',

  b12: 'Used in building red blood cells and in maintaining the sheath around nerves. It is made by bacteria, not by plants or animals, so it reaches the diet through animal foods, fortified foods or a supplement. The liver holds a long reserve, so a shortfall takes a long time to show.',

  b6: 'A vitamin involved in the enzymes that handle amino acids, and in building haemoglobin and several neurotransmitters. Widely spread across ordinary foods.',

  folate: 'A B vitamin used to build and repair DNA, so it matters most where cells divide quickly — including very early in pregnancy, before most people know they are pregnant. Its name comes from foliage, which is where it is most concentrated.',

  choline: 'Used to build cell membranes and acetylcholine, a neurotransmitter involved in memory and muscle control. The body makes some but generally not enough, so the rest comes from food — egg yolk and liver most densely.',

  probiotics: 'Live bacteria and yeasts taken in food or a capsule. They are not a nutrient at all; they are organisms, and effects are specific to particular strains rather than general to the category. Heat kills them, which is why an unpasteurised ferment and a shelf-stable jar of the same thing are not the same product.',

  polyphenols: 'A very large family of compounds plants make for their own purposes — colour, bitterness, defence — which is why they cluster in skins, peels, leaves and pips. Tea, coffee, cocoa, olives and berries are dense sources. They are studied as a group but behave individually.',

  nitrate: 'A compound concentrated in beetroot and leafy greens. Bacteria on the tongue convert some of it to nitrite, and the body onward to nitric oxide, which is one of the signals that widens blood vessels. This is why the vegetable route and a cured-meat preservative get discussed differently despite sharing a name.',

  creatine: 'A compound stored in muscle as a rapid energy reserve for short, hard efforts. The body makes some in the liver and kidneys, and meat and fish supply the rest — which is why intake is typically lower on a plant-based diet.',

  taurine: 'An amino acid found in high concentration in heart, muscle, retina and brain, involved in handling bile salts and in the movement of calcium inside cells. The body makes it, and animal foods supply more.',

  carnitine: 'A compound that carries fatty acids into the mitochondria, where they are burned for energy. The body makes it from two other amino acids, and red meat is the densest food source.',

  melatonin: 'A hormone the pineal gland releases as evening light falls; it is the body’s signal that it is night, rather than a sedative. Light in the evening suppresses it and darkness permits it, so timing matters more here than in most of this list.',
};
