// Diet guide content keyed to the 4 main phases.
// Phase ids (1..4) map to the PHASE_META in phases.js.
// Each phase has: strategy, good (categorized), moderate, avoid, meals, shopping.
//
// Shopping items are objects of shape { n: string, subs?: string[] }.
// `n` is the primary item, `subs` lists rotational alternatives (same diet principles).

export const DIET_PHASES = [
  {
    id: 1,
    duration: 'Weeks 1\u201313',
    strategy: "Starve pathogens, support liver detox, fuel gut repair, provide fat for pharmaceutical absorption (fenbendazole). Your body is fighting a war \u2014 feed the army, not the enemy.",
    good: [
      { cat: 'Proteins', items: [
        { n: 'Eggs (pasture-raised)', w: "Complete amino acid profile, choline for liver. Your hard-boiled bowl is golden \u2014 keep it stocked." },
        { n: 'Ground beef (grass-fed)', w: "Iron, B12, zinc, saturated fat. Your carnivore staple \u2014 pairs with everything." },
        { n: 'Beef/chicken bone broth', w: 'Liquid gut repair: glycine, proline, glutamine. Complements your supplemental glutamine directly.' },
        { n: 'Chicken thighs (organic)', w: 'Fattier than breast = better nutrient absorption. Cheaper too.' },
        { n: 'Wild-caught salmon', w: 'Omega-3 anti-inflammatory + vitamin D. Complements your cod liver oil.' },
        { n: 'Sardines (canned in olive oil)', w: 'Omega-3, calcium, virtually no mercury. Underrated powerhouse.' },
        { n: 'Beef liver (if you like it)', w: "Nature's multivitamin \u2014 you're already taking desiccated liver capsules, this is the whole food version." },
      ]},
      { cat: 'Vegetables (cooked preferred)', items: [
        { n: 'Broccoli, cauliflower, Brussels sprouts', w: 'Cruciferous = liver detox support (Phase II pathways). Sulforaphane boosts glutathione \u2014 synergistic with your Rho Glutathione.' },
        { n: 'Spinach, kale (saut\u00e9ed)', w: 'Folate, magnesium, iron. Cooking reduces oxalates that can stress kidneys during kidney cleanse weeks.' },
        { n: 'Garlic & onions', w: 'Natural antimicrobials + prebiotic fiber. Allicin in garlic disrupts biofilms \u2014 supports what nattokinase + berberine are doing.' },
        { n: 'Zucchini & summer squash', w: 'Gentle on the gut, easy to digest, good vehicle for fats.' },
        { n: 'Celery', w: 'Natural electrolytes (sodium/potassium), anti-inflammatory apigenin. Great with guac.' },
        { n: 'Ginger root (fresh)', w: 'Anti-nausea (helpful during die-off), anti-inflammatory, supports digestion.' },
        { n: 'Sweet potatoes & butternut squash', w: "Complex carbs that don't feed pathogens. Vitamin A for mucosal membranes." },
      ]},
      { cat: 'Healthy Fats', items: [
        { n: 'Beef tallow (grass-fed)', w: 'Heat-stable cooking fat, rich in fat-soluble vitamins. Perfect for roasting and searing.' },
        { n: 'Avocados', w: 'Potassium, fiber, monounsaturated fat. Mash into guac or slice onto anything.' },
        { n: 'Extra virgin olive oil', w: "Anti-inflammatory polyphenols. Use for finishing/dressings \u2014 don't high-heat cook with it." },
        { n: 'Coconut oil', w: 'Contains lauric + caprylic acid \u2014 natural antifungals that support your Candida strategy.' },
        { n: 'Grass-fed butter / ghee', w: 'Butyrate feeds intestinal lining cells (same job as your glutamine). Ghee if dairy-sensitive.' },
      ]},
      { cat: 'Fruits (treat as condiment, not food group)', items: [
        { n: 'Blueberries, raspberries, blackberries', w: 'Lowest sugar, highest antioxidant. A handful at the END of a meal, not alone.' },
        { n: 'Lemons & limes', w: 'Nearly zero sugar. Squeeze on meat, fish, water. Supports liver + digestion.' },
        { n: 'Green apple (Granny Smith)', w: 'Lower sugar than other apples. Pectin acts as a mild natural binder.' },
      ]},
      { cat: 'Pantry & Other', items: [
        { n: 'White rice', w: "Easier on damaged gut than brown. Provides energy for detox without feeding pathogens significantly." },
        { n: 'Sauerkraut (raw, refrigerated)', w: "Live probiotics + prebiotic fiber. Just 1\u20132 tbsp with a meal \u2014 don't overdo during active killing." },
        { n: 'Herbs: rosemary, thyme, oregano', w: 'All mildly antimicrobial. Season generously \u2014 food as medicine.' },
        { n: 'Apple cider vinegar (raw)', w: 'Supports stomach acid production. 1 tbsp in water before breaking fast can aid digestion.' },
        { n: 'Coconut aminos', w: 'Soy sauce replacement. No soy, no gluten, lower sodium.' },
      ]},
    ],
    moderate: [
      { n: 'Nuts (almonds, walnuts, macadamias, pecans)', w: 'Good fat + minerals, but hard on damaged gut lining. Small handful only. Soaked/sprouted ideal. NO peanuts or cashews (mold risk).' },
      { n: 'Green-tipped bananas', w: 'Resistant starch feeds good bacteria. Only unripe \u2014 ripe bananas are sugar bombs.' },
      { n: 'Aged hard cheeses (parmesan, aged cheddar)', w: 'Very low lactose due to aging process. Small amounts as seasoning/garnish, not a food group.' },
      { n: 'Dark chocolate (85%+ cacao)', w: 'Antioxidant, magnesium. 1\u20132 squares max. Check labels \u2014 many contain sugar and soy lecithin.' },
      { n: 'Strawberries, kiwi', w: 'Moderate sugar. A few pieces at end of a meal, not a standalone snack.' },
    ],
    avoid: [
      { n: 'Sugar in ALL forms', w: 'Feeds Candida, parasites, pathogenic bacteria. This is the #1 rule. Honey, maple syrup, agave, coconut sugar \u2014 all equally bad right now.' },
      { n: 'Gluten (wheat, barley, rye)', w: 'Drives intestinal permeability. Directly works against RepairVite, Reflux Pro, and glutamine gut repair.' },
      { n: 'Dairy (soft cheese, milk, cottage cheese, yogurt)', w: 'Casein + lactose = inflammatory during active gut damage. Exception: butter/ghee and aged hard cheese.' },
      { n: 'Alcohol', w: "Your liver is working overtime on Boost Blenz + TUDCA detox. Don't add to the burden. Zero tolerance right now." },
      { n: 'Processed/packaged foods', w: "Seed oils, preservatives, additives all stress the same detox pathways you're actively supporting." },
      { n: 'Peanuts & cashews', w: 'High aflatoxin (mold toxin) risk. Opposite of what you want during liver detox + antifungal protocol.' },
      { n: 'Tropical fruits (mango, pineapple, grapes, ripe bananas)', w: "Sugar bombs. A ripe mango = ~45g sugar = feeding everything you're trying to kill." },
      { n: 'Dried fruit', w: 'Concentrated sugar + often treated with sulfites. Hard no.' },
      { n: 'Soy products', w: 'Estrogenic, often GMO, hard to digest. Interferes with the hormonal rebalancing your protocol builds toward.' },
      { n: 'Corn & corn products', w: 'High mold/mycotoxin risk, often GMO, inflammatory. Includes corn chips, tortillas, cornstarch.' },
      { n: 'Raw/undercooked meat, unwashed produce', w: 'Reinfection risk \u2014 especially critical during parasite kill phase.' },
    ],
    meals: [
      { name: 'The Foundation Bowl', desc: 'Ground beef + scrambled eggs + saut\u00e9ed spinach in tallow, half an avocado. Your daily anchor meal at noon.', tag: 'Breaking Fast' },
      { name: 'Bone Broth Sipper', desc: 'Warm bone broth with ginger, garlic, pinch of salt. Sip 30 min before breaking fast or between meals.', tag: 'Anytime' },
      { name: 'Guac + Celery Boats', desc: 'Mashed avocado, lime, garlic, salt, diced onion. Load onto celery sticks. Add ground beef on top for substance.', tag: 'Snack / Side' },
      { name: 'Sheet Pan Chicken Thighs', desc: 'Chicken thighs + broccoli + sweet potato cubes, roasted in tallow at 400\u00b0F. Season with rosemary, garlic, salt. One pan, zero effort.', tag: 'Dinner' },
      { name: 'Salmon + Squash', desc: 'Pan-seared wild salmon in butter/ghee. Roasted butternut squash on the side. Squeeze lemon over everything.', tag: 'Dinner' },
      { name: 'Carnivore Upgrade Bowl', desc: 'Ground beef or shredded chicken + white rice + saut\u00e9ed zucchini + sauerkraut (1\u20132 tbsp). Drizzle olive oil.', tag: 'Breaking Fast' },
      { name: 'Egg Scramble Remix', desc: '3 eggs scrambled in ghee with garlic, spinach, diced onion. Top with avocado slices. Rotate in ground beef or sardines.', tag: 'Breaking Fast' },
      { name: 'Berry Finisher', desc: 'Small handful of blueberries + raspberries after your main meal. Optional: drizzle of coconut oil or a few walnuts.', tag: 'End of Meal' },
    ],
    shopping: [
      { cat: 'Must Buy (Core)', items: [
        { n: 'Ground beef (grass-fed) \u2014 3+ lbs', subs: ['ground bison', 'ground lamb', 'ground turkey (pasture)'] },
        { n: 'Chicken thighs (organic) \u2014 2 lbs', subs: ['bone-in chicken pieces', 'whole chicken', 'duck legs'] },
        { n: 'Bone broth (or bones to make it)', subs: ['chicken stock (low-sodium)', 'meat stock'] },
        { n: 'Avocados \u2014 4\u20135' },
        { n: 'Broccoli + cauliflower', subs: ['Brussels sprouts', 'bok choy', 'cabbage (green or red)', 'broccoli rabe'] },
        { n: 'Spinach (fresh or frozen)', subs: ['kale', 'Swiss chard', 'collard greens', 'arugula'] },
        { n: 'Sweet potatoes \u2014 3\u20134', subs: ['butternut squash', 'acorn squash', 'kabocha', 'pumpkin'] },
        { n: 'Celery \u2014 1 bunch', subs: ['fennel', 'cucumber (for crunch)', 'jicama'] },
        { n: 'Garlic \u2014 1 bulb', subs: ['shallots'] },
        { n: 'Onions \u2014 3\u20134', subs: ['leeks', 'shallots', 'scallions'] },
        { n: 'Lemons \u2014 4\u20135', subs: ['limes'] },
        { n: 'Beef tallow (or lard)', subs: ['duck fat', 'ghee'] },
        { n: 'Grass-fed butter (Kerrygold)', subs: ['ghee (dairy-free)'] },
        { n: 'Sauerkraut (raw, refrigerated)', subs: ['kimchi', 'fermented beets', 'naturally fermented pickles', 'curtido'] },
      ]},
      { cat: 'Great to Add', items: [
        { n: 'Wild-caught salmon \u2014 2 filets', subs: ['wild trout', 'mackerel', 'cod', 'haddock'] },
        { n: 'Sardines (canned in olive oil) \u2014 2 cans', subs: ['anchovies', 'herring', 'smoked mackerel'] },
        { n: 'Zucchini \u2014 2\u20133', subs: ['yellow summer squash', 'pattypan squash'] },
        { n: 'Butternut squash \u2014 1', subs: ['acorn squash', 'kabocha', 'pumpkin'] },
        { n: 'Ginger root', subs: ['fresh turmeric root'] },
        { n: 'Fresh herbs (rosemary, thyme)', subs: ['sage', 'oregano', 'marjoram'] },
        { n: 'Coconut oil', subs: ['MCT oil (C8)', 'red palm oil (sustainable)'] },
        { n: 'Frozen blueberries + raspberries', subs: ['frozen blackberries', 'frozen mixed berries'] },
        { n: 'White rice' },
        { n: "Apple cider vinegar (Bragg's)", subs: ['fresh lemon juice (for pre-meal use)'] },
        { n: 'Coconut aminos', subs: ['tamari (gluten-free)', 'liquid aminos'] },
      ]},
      { cat: 'Nice to Have', items: [
        { n: 'Green apples (Granny Smith) \u2014 2\u20133', subs: ['pears (firm, underripe)'] },
        { n: 'Almonds or walnuts (small bag)', subs: ['pecans', 'macadamias', 'Brazil nuts (selenium)'] },
        { n: 'Extra virgin olive oil', subs: ['avocado oil (finishing only)'] },
        { n: 'Dark chocolate 85%+ \u2014 1 bar' },
        { n: 'Brussels sprouts', subs: ['broccoli rabe', 'cabbage wedges'] },
        { n: 'Ghee (if you want dairy-free option)', subs: ['coconut oil'] },
      ]},
    ],
  },
  {
    id: 2,
    duration: 'Months 4\u20137',
    strategy: "Heavy killing is done. Now repair gut lining, rebuild microbiome diversity, increase fermented foods gradually, and maintain the anti-pathogen dietary framework. You can start loosening slightly but sugar remains restricted.",
    good: [
      { cat: 'Everything from Phase 1, plus:', items: [
        { n: 'Plain full-fat yogurt (grass-fed, no sugar)', w: 'Live cultures now welcome \u2014 your gut is ready to receive beneficial bacteria alongside Silver Fern probiotics.' },
        { n: 'Kefir (plain, full-fat)', w: 'More probiotic diversity than yogurt. Start with 1/4 cup and build up.' },
        { n: 'Goat/sheep dairy', w: 'A2 casein is less inflammatory than cow A1. Goat yogurt, sheep feta \u2014 good options.' },
        { n: 'Increased sauerkraut & kimchi', w: 'Scale up to 2\u20134 tbsp per meal. Your microbiome is being rebuilt \u2014 fermented foods are the reinforcements.' },
        { n: 'Prebiotic foods (after Wk 5+)', w: "Cooked onions, garlic, asparagus, leeks, slightly green bananas. Feed the probiotics you're planting." },
        { n: 'Wider vegetable variety', w: 'Artichokes, asparagus, fennel, beets. Your gut can handle more diversity now.' },
      ]},
    ],
    moderate: [
      { n: 'Raw vegetables (salads)', w: 'Your gut lining is healing \u2014 start reintroducing raw veg gradually. If bloating returns, go back to cooked.' },
      { n: 'Legumes (lentils, black beans \u2014 well-cooked)', w: 'Soak overnight, cook thoroughly. Prebiotic fiber, but start small. Skip if bloating occurs.' },
      { n: 'Cottage cheese', w: 'Can reintroduce now if tolerated. Full-fat, plain. Your gut lining should handle the casein better.' },
      { n: 'Wider fruit selection', w: 'Kiwi, pears, green apples more freely. Still avoid tropical sugar bombs.' },
      { n: 'Raw honey (small amounts)', w: 'Antimicrobial + prebiotic properties become relevant now that active killing is done. 1 tsp max, not daily.' },
    ],
    avoid: [
      { n: 'Sugar (still)', w: "Pathogen clearance isn't complete. Keep sugar restricted until GI-MAP confirms clearance." },
      { n: 'Gluten (still)', w: 'Gut barrier is rebuilding. Gluten re-exposure now risks undoing months of repair work.' },
      { n: 'Alcohol (still)', w: 'Liver is still processing residual toxin load. Wait until Phase 3 minimum.' },
      { n: 'Processed foods (always)', w: 'This never comes back. Your gut will tell you immediately if you cheat here.' },
    ],
    meals: [
      { name: 'Gut Rehab Bowl', desc: 'White rice + ground beef + generous sauerkraut (3\u20134 tbsp) + avocado + drizzle of olive oil. Probiotic-forward.', tag: 'Breaking Fast' },
      { name: 'Yogurt + Berry Bowl', desc: 'Plain grass-fed yogurt, blueberries, walnuts, drizzle of raw honey (1 tsp). First time honey is appropriate.', tag: 'End of Meal' },
      { name: 'Prebiotic Stir-Fry', desc: 'Chicken thighs with asparagus, leeks, garlic, onions in tallow. Prebiotic diversity meal.', tag: 'Dinner' },
      { name: 'Bone Broth Egg Drop', desc: 'Hot bone broth + whisked egg stirred in + ginger + spinach. Warming, healing, easy to digest.', tag: 'Anytime' },
    ],
    shopping: [
      { cat: 'Must Buy (Core)', items: [
        { n: 'Plain full-fat yogurt (grass-fed) \u2014 1 tub', subs: ['goat yogurt', 'sheep yogurt', 'coconut yogurt (unsweetened)'] },
        { n: 'Kefir (plain, full-fat) \u2014 1 bottle', subs: ['goat kefir', 'coconut water kefir'] },
        { n: 'Raw sauerkraut \u2014 1 large jar', subs: ['kimchi', 'fermented beets', 'curtido'] },
        { n: 'Kimchi (raw, refrigerated) \u2014 1 jar', subs: ['raw sauerkraut', 'fermented radish'] },
        { n: 'Asparagus \u2014 1 bunch', subs: ['green beans', 'snap peas'] },
        { n: 'Leeks \u2014 2\u20133', subs: ['shallots', 'scallions', 'spring onions'] },
        { n: 'Artichokes \u2014 2\u20133', subs: ['Jerusalem artichokes (sunchokes)', 'fennel bulbs'] },
        { n: 'Beets \u2014 3\u20134', subs: ['carrots', 'parsnips', 'rutabaga'] },
        { n: 'Ground beef (grass-fed) \u2014 continue staple', subs: ['ground bison', 'ground lamb'] },
        { n: 'Chicken thighs (organic) \u2014 continue staple', subs: ['whole chicken', 'duck legs'] },
        { n: 'Eggs (pasture-raised) \u2014 1\u20132 dozen', subs: ['duck eggs', 'quail eggs'] },
        { n: 'Garlic & onions \u2014 restock', subs: ['shallots', 'leeks'] },
        { n: 'White rice \u2014 restock' },
      ]},
      { cat: 'Great to Add', items: [
        { n: 'Goat or sheep yogurt', subs: ['coconut yogurt (unsweetened)'] },
        { n: 'Sheep feta (small block)', subs: ['goat cheese', 'halloumi'] },
        { n: 'Lentils (dry or canned, low-sodium) \u2014 1 bag or 2 cans', subs: ['mung beans', 'split peas'] },
        { n: 'Black beans (dry, for soaking) \u2014 1 bag', subs: ['pinto beans', 'kidney beans', 'navy beans'] },
        { n: 'Kiwi \u2014 3\u20134', subs: ['green apple', 'pear (firm)'] },
        { n: 'Pears \u2014 3\u20134', subs: ['apples (any variety)', 'Asian pears'] },
        { n: 'Cottage cheese (full-fat, plain)', subs: ['ricotta (full-fat)', 'quark'] },
        { n: 'Fennel \u2014 1 bulb', subs: ['celery root (celeriac)', 'anise'] },
      ]},
      { cat: 'Nice to Have', items: [
        { n: 'Raw honey (small jar)' },
        { n: 'Green-tipped bananas \u2014 small bunch', subs: ['green plantains'] },
        { n: 'Additional fermented veg (miso paste if tolerated)', subs: ['natto (if adventurous)', 'tempeh (fermented soy \u2014 only if tolerated)'] },
        { n: 'Dark chocolate 85%+', subs: ['cacao nibs', '90%+ chocolate'] },
      ]},
    ],
  },
  {
    id: 3,
    duration: 'Months 7\u201312',
    strategy: "Gut is repaired, pathogens cleared. Now optimize for cellular energy, hormonal balance, and longevity. Diet expands significantly but stays whole-food based. Anti-inflammatory emphasis shifts to pro-metabolic.",
    good: [
      { cat: 'Expanded proteins & fats', items: [
        { n: 'Full dairy reintroduction (if tolerated)', w: 'Grass-fed yogurt, kefir, cottage cheese, aged cheeses freely. Your gut barrier should be intact.' },
        { n: 'Wider fish variety', w: 'Mackerel, trout, cod, shrimp. Omega-3 diversity supports cellular optimization.' },
        { n: 'Organ meats', w: "Heart, liver, kidney \u2014 nutrient density supports the Rho Stack's cellular goals." },
      ]},
      { cat: 'Expanded carbs & plants', items: [
        { n: 'Sweet potatoes, squash, beets freely', w: 'Complex carbs fuel mitochondrial energy production alongside your NAD+ and CoQ10.' },
        { n: 'Raw honey (moderate)', w: 'Antimicrobial, prebiotic. Up to 1 tbsp/day is reasonable now. Your DIM+ supports estrogen processing.' },
        { n: 'Wider fruit access', w: 'Pears, peaches, apples of any variety. Still moderate tropical fruits.' },
        { n: 'Legumes more freely', w: 'Lentils, chickpeas, black beans. Good fiber + prebiotic diversity for established microbiome.' },
      ]},
    ],
    moderate: [
      { n: 'Gluten-free grains (oats, quinoa)', w: 'Reintroduce one at a time, watch for reactions. Many people with prior gut damage stay better without grains.' },
      { n: 'Dark chocolate (80%+)', w: "More freely now. Polyphenols, magnesium, mood support. Pairs with your Rho Curcumin's anti-inflammatory action." },
      { n: 'Occasional red wine', w: "Resveratrol source (you're also supplementing this). 1 glass max, not daily. If it disrupts sleep, skip it." },
      { n: 'Maple syrup (small amounts)', w: 'Minerals + flavor. Better than white sugar. Use as occasional seasoning, not a dietary staple.' },
    ],
    avoid: [
      { n: 'Processed foods (forever)', w: "This is permanent. Seed oils, artificial ingredients, preservatives \u2014 your body will react now that it's clean." },
      { n: 'Excess sugar', w: 'Maintenance mode, not elimination. But your baseline should remain low-sugar whole foods.' },
      { n: 'Soy (still)', w: 'Estrogenic interference with DIM+ hormonal optimization. Avoid while dialing in hormone balance.' },
    ],
    meals: [
      { name: 'Optimization Bowl', desc: 'Salmon + sweet potato + saut\u00e9ed kale + avocado + sauerkraut. Anti-inflammatory, nutrient-dense, pro-metabolic.', tag: 'Breaking Fast' },
      { name: 'Cottage Cheese + Berries', desc: 'Full-fat cottage cheese, mixed berries, walnuts, drizzle of honey. Protein + probiotics + antioxidants.', tag: 'Snack' },
      { name: 'Steak & Roasted Roots', desc: 'Grass-fed steak seared in tallow + roasted beets, carrots, sweet potato. Iron + complex carbs.', tag: 'Dinner' },
    ],
    shopping: [
      { cat: 'Must Buy (Core)', items: [
        { n: 'Grass-fed steak or ribeye \u2014 2 lbs', subs: ['lamb chops', 'bison steak', 'venison'] },
        { n: 'Organ meats (heart or liver) \u2014 1 lb', subs: ['kidney', 'pate (grass-fed)', 'sweetbreads'] },
        { n: 'Mackerel, trout, or cod \u2014 2 filets', subs: ['haddock', 'halibut', 'black cod', 'salmon'] },
        { n: 'Shrimp (wild) \u2014 1 lb', subs: ['scallops', 'mussels', 'clams', 'oysters'] },
        { n: 'Beets \u2014 3\u20134', subs: ['rutabaga', 'parsnips', 'turnips'] },
        { n: 'Assorted squashes', subs: ['butternut', 'acorn', 'kabocha', 'delicata'] },
        { n: 'Sweet potatoes \u2014 4\u20135', subs: ['Japanese purple sweet potato', 'yams'] },
        { n: 'Kale + spinach rotation', subs: ['Swiss chard', 'arugula', 'collards', 'dandelion greens'] },
        { n: 'Yogurt (grass-fed, plain)', subs: ['goat yogurt', 'kefir'] },
        { n: 'Aged cheeses (cheddar, parmesan)', subs: ['manchego', 'pecorino', 'gruy\u00e8re', 'aged gouda'] },
        { n: 'Pears, peaches, apples \u2014 mixed', subs: ['plums', 'apricots', 'cherries'] },
        { n: 'Eggs (pasture-raised) \u2014 1\u20132 dozen', subs: ['duck eggs', 'quail eggs'] },
      ]},
      { cat: 'Great to Add', items: [
        { n: 'Gluten-free oats \u2014 1 bag', subs: ['buckwheat groats', 'millet'] },
        { n: 'Quinoa \u2014 1 bag', subs: ['amaranth', 'teff', 'sorghum'] },
        { n: 'Raw honey (larger jar)', subs: ['maple syrup (grade B)'] },
        { n: 'Chickpeas or lentils (dry/canned)', subs: ['mung beans', 'black beans', 'cannellini beans'] },
        { n: 'Walnuts + mixed nuts', subs: ['pecans', 'macadamias', 'Brazil nuts', 'hazelnuts'] },
        { n: 'Cottage cheese (full-fat)', subs: ['ricotta', 'quark', 'labneh'] },
        { n: 'Dark chocolate 80%+', subs: ['cacao nibs', '90%+ bar'] },
      ]},
      { cat: 'Nice to Have', items: [
        { n: 'Red wine (1 bottle, if tolerated)', subs: ['clean spirits (tequila, vodka)'] },
        { n: 'Maple syrup (small bottle)', subs: ['raw honey', 'date syrup'] },
        { n: 'Grass-fed kefir', subs: ['coconut kefir', 'water kefir'] },
        { n: 'Fresh berries (mixed)', subs: ['frozen berries (year-round)'] },
      ]},
    ],
  },
  {
    id: 4,
    duration: 'Year 1+',
    strategy: "You've earned dietary freedom within a whole-food framework. The principles are internalized. Eat clean, listen to your body, and tighten up during quarterly pulses. Returning symptoms are information \u2014 check your diet first.",
    good: [
      { cat: 'Your permanent foundation', items: [
        { n: 'Whole, unprocessed foods \u2014 always', w: "If it has a label with ingredients you can't pronounce, skip it. This is your lifetime filter." },
        { n: 'High-quality proteins daily', w: 'Eggs, grass-fed beef, wild fish, organ meats. The carnivore instinct serves you well \u2014 keep it.' },
        { n: 'Abundant vegetables', w: 'Variety and color. Rotate through seasons. Cruciferous stays important for liver + estrogen metabolism.' },
        { n: 'Healthy fats at every meal', w: 'Tallow, butter, ghee, olive oil, avocado, coconut oil. Fat-soluble vitamin absorption is permanent.' },
        { n: 'Fermented foods daily', w: 'Sauerkraut, kimchi, kefir, yogurt. Your microbiome needs ongoing reinforcements.' },
      ]},
    ],
    moderate: [
      { n: 'Gluten', w: 'Some people reintroduce successfully, many find they feel better without it permanently. Test carefully, trust your gut (literally).' },
      { n: 'Natural sweeteners', w: 'Honey, maple syrup in cooking/baking. Your system is clean \u2014 moderate amounts are fine.' },
      { n: 'Alcohol', w: 'Occasional, not habitual. Red wine or clean spirits. Beer is the worst option (gluten + sugar + yeast).' },
    ],
    avoid: [
      { n: 'Processed foods', w: 'Permanent. Your body will tell you immediately \u2014 bloating, brain fog, energy crash. Listen to it.' },
      { n: 'Seed oils (canola, soybean, corn, sunflower)', w: 'Inflammatory. The single worst ingredient in the modern food supply. Cook with animal fats + olive oil + coconut oil.' },
      { n: 'During quarterly pulses: return to Phase 1 diet', w: "When you're doing your 7\u201310 day parasite pulse, tighten back to zero sugar, minimal fruit, maximum anti-pathogen eating." },
    ],
    meals: [
      { name: 'The Kevin Standard', desc: 'Eggs + ground beef + vegetables in tallow + avocado. Your carnivore-plus foundation. This never gets old because it works.', tag: 'Every Day' },
      { name: 'Pulse Week Protocol Meals', desc: 'During quarterly pulses: strict carnivore + bone broth + sauerkraut only. No fruit, no sweeteners, no cheating. 7\u201310 days.', tag: 'Quarterly' },
    ],
    shopping: [
      { cat: 'Weekly Staples', items: [
        { n: 'Eggs (pasture-raised) \u2014 1\u20132 dozen', subs: ['duck eggs', 'quail eggs'] },
        { n: 'Grass-fed ground beef \u2014 2+ lbs', subs: ['ground bison', 'ground lamb'] },
        { n: 'Wild fish (rotate: salmon, sardines, cod) \u2014 2 filets', subs: ['mackerel', 'trout', 'haddock', 'anchovies'] },
        { n: 'Seasonal vegetables (variety)', subs: ['farmers market pick', "CSA box if you have one"] },
        { n: 'Leafy greens (spinach, kale, arugula)', subs: ['Swiss chard', 'collards', 'dandelion greens'] },
        { n: 'Fermented foods (sauerkraut + kimchi rotation)', subs: ['kefir', 'fermented beets', 'curtido'] },
        { n: 'Plain yogurt or kefir', subs: ['goat versions', 'coconut versions'] },
        { n: 'Avocados \u2014 4\u20135' },
        { n: 'Beef tallow or grass-fed butter', subs: ['ghee', 'duck fat', 'lard'] },
        { n: 'Olive oil + coconut oil', subs: ['avocado oil (finishing)', 'MCT oil'] },
      ]},
      { cat: 'Rotating Variety', items: [
        { n: 'Organ meats (heart, liver) \u2014 monthly', subs: ['kidney', 'sweetbreads', 'pate'] },
        { n: 'Shellfish (shrimp, mussels) \u2014 biweekly', subs: ['scallops', 'clams', 'oysters'] },
        { n: 'Aged cheeses', subs: ['cheddar', 'parmesan', 'manchego', 'pecorino', 'gruy\u00e8re'] },
        { n: 'Seasonal fruit (berries always, others in rotation)', subs: ['stone fruits in summer', 'apples/pears in fall', 'citrus in winter'] },
        { n: 'Root vegetables (beets, sweet potato, carrots)', subs: ['parsnips', 'rutabaga', 'turnips'] },
        { n: 'Garlic, onions, fresh herbs', subs: ['shallots', 'leeks', 'scallions'] },
      ]},
      { cat: 'Pulse Week Essentials', items: [
        { n: 'Ground beef \u2014 5+ lbs (bulk)', subs: ['ground bison', 'ground lamb'] },
        { n: 'Bone broth \u2014 abundant', subs: ['homemade meat stock'] },
        { n: 'Raw sauerkraut', subs: ['kimchi', 'fermented beets'] },
        { n: 'Eggs (extra dozen)', subs: ['duck eggs'] },
        { n: 'Beef tallow (bulk)', subs: ['lard', 'duck fat'] },
        { n: 'Lemons + limes', subs: ['either one alone works'] },
      ]},
    ],
  },
];

// Helpers so components can treat items uniformly
export function itemName(it) {
  return typeof it === 'string' ? it : it.n;
}
export function itemSubs(it) {
  return typeof it === 'string' ? [] : (it.subs || []);
}

// Build a plain-text representation of a shopping list for the clipboard.
// Includes rotation alternatives inline when present.
export function shoppingListToText(shopping, phaseLabel) {
  const lines = [];
  if (phaseLabel) lines.push(phaseLabel, '');
  shopping.forEach((group) => {
    lines.push(`${group.cat}:`);
    group.items.forEach((item) => {
      const name = itemName(item);
      const subs = itemSubs(item);
      if (subs.length > 0) {
        lines.push(`- ${name}  [or ${subs.join(' / ')}]`);
      } else {
        lines.push(`- ${name}`);
      }
    });
    lines.push('');
  });
  return lines.join('\n').trim();
}

// Plain-text for a single group (used by "Copy group" button)
export function groupToText(group) {
  const lines = [`${group.cat}:`];
  group.items.forEach((item) => {
    const name = itemName(item);
    const subs = itemSubs(item);
    if (subs.length > 0) lines.push(`- ${name}  [or ${subs.join(' / ')}]`);
    else lines.push(`- ${name}`);
  });
  return lines.join('\n');
}
