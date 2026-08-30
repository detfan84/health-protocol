// viewSupplements.js — food and supplements, joined by the nutrient.
//
// Kevin, 29 Aug: "help people identify what foods are good sources to get what
// they need for the people who prefer avoiding supplements. Maybe food and
// supplements could be a 2 part page (supplements are just supplementing the
// nutrients you aren't getting in your food right?) and then they can create a
// shopping list and meal plan on one side and have the supps on the other side."
//
// The reframe is what makes it buildable: the NUTRIENT is the join. Ask for
// magnesium and pumpkin seeds and a capsule come back together, and choosing
// between them is a preference rather than something the app decides for you.
//
// It is also only half true, and the honest half of the screen is where it
// stops being true. Of 110 on the shelf, 50 name a nutrient you could eat
// instead; 60 — ashwagandha, berberine, serrapeptase — have no food route at
// all. So the page says so out loud rather than presenting two columns as
// mirrors of each other and letting somebody conclude they can eat their way
// off a shelf that has no food on the other side of it.
//
// Kevin, 29 Aug, after I filed supplements into the general catalogue: "finding
// supplements is harder than it was. It should be its own tab with its own
// search. I don't know why you are trying to mix supplements in with everything
// else."
//
// He is right and I had conflated two different sentences of his. "Supplements
// can fit naturally into the day arc and not riding in an awkward side car" is
// about the DAY — where a thing lands once you take it. It was never about the
// browsing surface. Filing 110 substances into a shelf whose facets are
// release / lengthen / load and whose slices are body parts and equipment made
// them harder to find than they had been, which is the opposite of the point.
//
// So: one screen that does the whole job.
//
//   · search, by name or by what it is for
//   · what you already take, at the top, with what is left in the bottle
//   · the shelf, to add from
//   · and a way to add one that is not on it — "many supplements are combos
//     and blends now too, they need to be able to add whatever they are taking
//     if it's not preloaded so they can still track it"
//
// The last one is not an edge case. No preloaded list of a hundred will ever
// cover a proprietary blend, and a tracker that cannot track what somebody
// actually takes is not a tracker.

import { h, clear, add } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { newId, nowIso, localDateKey } from '../../lib/core.js';
import { makeSupply, doseUnits } from '../trackerOps.js';

const PICKS_ID = 'my-picks';

// The same five moments the day already has. A supplement says which one it
// wants; the person can say otherwise, and theirs wins.
export const MOMENTS = [
  { timing: 'fasted', id: 'pick-fasted', name: 'First thing, before food', start: '06:30', end: '09:00', order: 0 },
  { timing: 'with-food', id: 'pick-with-food', name: 'With a meal', order: 1 },
  { timing: 'evening', id: 'pick-evening', name: 'Evening', start: '18:00', end: '21:30', order: 2 },
  { timing: 'before-bed', id: 'pick-bed', name: 'Before bed', start: '21:30', end: '23:59', order: 3 },
  { timing: 'anytime', id: 'pick-anytime', name: 'Anytime', order: 4 },
];
const MOMENT_BY_TIMING = Object.fromEntries(MOMENTS.map((m) => [m.timing, m]));

const SUPPORTS_LABELS = {
  sleep: 'Sleep', energy: 'Energy', gut: 'Digestion', immune: 'Immune',
  muscle: 'Muscle', strength: 'Strength', bone: 'Bones', heart: 'Heart',
  brain: 'Brain', cognition: 'Focus', inflammation: 'Inflammation',
  'nervous-system': 'Nervous system', hydration: 'Hydration', skin: 'Skin',
  joint: 'Joints', calm: 'Calm', liver: 'Liver', thyroid: 'Thyroid',
  metabolic: 'Blood sugar', hormonal: 'Hormones',
};

// The nutrients both halves are keyed on, in plain words.
export const NUTRIENTS = {
  protein: 'Protein', fibre: 'Fibre', 'omega-3': 'Omega-3', collagen: 'Collagen',
  calcium: 'Calcium', magnesium: 'Magnesium', potassium: 'Potassium', sodium: 'Sodium',
  iron: 'Iron', zinc: 'Zinc', selenium: 'Selenium', iodine: 'Iodine', copper: 'Copper',
  'vitamin-a': 'Vitamin A', 'vitamin-c': 'Vitamin C', 'vitamin-d': 'Vitamin D',
  'vitamin-e': 'Vitamin E', 'vitamin-k': 'Vitamin K', b12: 'Vitamin B12', b6: 'Vitamin B6',
  folate: 'Folate', choline: 'Choline', probiotics: 'Probiotics', polyphenols: 'Polyphenols',
  nitrate: 'Nitrate', creatine: 'Creatine', taurine: 'Taurine', carnitine: 'Carnitine',
  melatonin: 'Melatonin',
};
const AISLE_LABELS = { produce: 'Produce', protein: 'Meat & fish', dair: 'Dairy', dairy: 'Dairy', frozen: 'Frozen', pantry: 'Pantry' };
const SHOPPING_KEY = 'shopping.list';

let shelfCache = null;
async function loadShelf() {
  if (shelfCache) return shelfCache;
  const res = await fetch(new URL('../../content/library.json', import.meta.url));
  if (!res.ok) throw new Error(`the shelf did not load: HTTP ${res.status}`);
  const lib = await res.json();
  const intake = lib.items.filter((i) => i.type === 'intake');
  shelfCache = {
    supplements: intake.filter((i) => i.intakeKind !== 'food'),
    foods: intake.filter((i) => i.intakeKind === 'food'),
  };
  return shelfCache;
}

/** The block in My picks a supplement belongs in, made if it is not there. */
export function blockFor(picks, timing) {
  const spec = MOMENT_BY_TIMING[timing] ?? MOMENT_BY_TIMING.anytime;
  let block = picks.blocks.find((b) => b.id === spec.id);
  if (!block) {
    block = { id: spec.id, name: spec.name, order: spec.order, items: [] };
    if (spec.start) block.start = spec.start;
    if (spec.end) block.end = spec.end;
    picks.blocks.push(block);
    picks.blocks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return block;
}

function emptyPicks() {
  return {
    id: PICKS_ID,
    name: 'My picks',
    notes: 'Things you chose from the library, and the supplements you take. Edit, reorder or remove any of it — it is an ordinary protocol.',
    active: true,
    phases: [],
    blocks: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export async function viewSupplements({ reload } = {}) {
  const root = h('div');
  root.append(
    h('h1', {}, 'Food & supplements'),
    h('p.muted', {}, 'Two routes to the same nutrients. Nothing here is a recommendation — the app only counts what you tell it you take.'),
  );

  let shelf;
  try {
    shelf = await loadShelf();
  } catch (error) {
    root.append(h('div.card', {},
      h('h2', {}, "The shelf didn't load."),
      h('p.muted', {}, 'Everything else still works. This needs a connection the first time, then it is cached with the app.'),
      h('p.tech', {}, String(error.message ?? error))));
    return root;
  }

  const protocols = await store.loadProtocols();
  const supplies = await store.loadSupplies();
  const picks = protocols.find((p) => p.id === PICKS_ID);
  // Everything of yours, wherever it sits — including ones you typed in, which
  // exist nowhere but here.
  const mine = protocols
    .flatMap((p) => p.blocks.flatMap((b) => b.items.map((i) => ({ item: i, block: b }))))
    .filter(({ item }) => item.type === 'intake');
  const mineIds = new Set(mine.map((m) => m.item.id));

  const state = { part: 'supplements', q: '', nutrient: null };
  const shopping = new Set((await store.getSetting(SHOPPING_KEY))?.items ?? []);
  const results = h('div');
  const nutrientRow = h('div.chip-row', { role: 'group', 'aria-label': 'Nutrient' });

  /* ------------------------------ the two parts --------------------------- */
  // One page, two halves, one nutrient filter across both — which is the whole
  // idea. Switching sides keeps whatever nutrient you were looking at, so
  // "where else do I get magnesium" is one tap rather than a new search.
  const partRow = h('div.chip-row', { role: 'group', 'aria-label': 'Food or supplements' });
  const partBtn = (id, label) => h('button.chip', {
    'aria-pressed': state.part === id ? 'true' : 'false',
    // The chips belong to the side you are on: switching parts without
    // repainting them left the food half wearing the supplement half's counts,
    // which is a number that means nothing about what you are looking at.
    onclick: () => { state.part = id; paintParts(); paintNutrients(); paint(); },
  }, label);
  function paintParts() {
    clear(partRow);
    partRow.append(partBtn('supplements', `Supplements · ${shelf.supplements.length}`),
      partBtn('food', `Food · ${shelf.foods.length}`));
  }
  paintParts();
  root.append(partRow);

  /* ------------------------------- search -------------------------------- */
  const search = h('input', {
    type: 'search',
    id: 'supplement-search',
    placeholder: 'Search by name, or by what you are after',
    autocomplete: 'off',
    oninput: (e) => { state.q = e.target.value.trim().toLowerCase(); paint(); },
  });
  root.append(
    h('div.card', {},
      h('label', { for: 'supplement-search', class: 'visually-hidden' }, 'Search supplements'),
      search,
    ),
  );

  /* ------------------------------ add your own --------------------------- */
  // "Many supplements are combos and blends now too." A shelf of a hundred
  // generic substances cannot hold somebody's proprietary blend, and the thing
  // they actually want to tick off every morning is the tub on their counter.
  const own = { name: '', timing: 'anytime', dose: '', units: '', unitName: 'capsule', perDose: '1' };
  const field = (label, key, attrs = {}) => h('div.field', {},
    h('label', { for: `own-${key}` }, label),
    h('input', { id: `own-${key}`, value: own[key], oninput: (e) => { own[key] = e.target.value; }, ...attrs }),
  );

  root.append(
    h('details.card', {},
      h('summary', {}, 'Add one that is not on the shelf'),
      h('p.muted', {}, 'A blend, a brand-specific formula, anything the list does not have. It tracks exactly like the rest.'),
      field('What it is called', 'name', { placeholder: 'e.g. Morning Greens Blend' }),
      h('div.field', {},
        h('label', { for: 'own-timing' }, 'When you take it'),
        h('select', { id: 'own-timing', onchange: (e) => { own.timing = e.target.value; } },
          MOMENTS.map((m) => h('option', { value: m.timing, selected: m.timing === own.timing }, m.name))),
      ),
      field('How much (optional)', 'dose', { placeholder: 'e.g. 1 scoop' }),
      h('div.field-row', {},
        field('Units in a container', 'units', { type: 'number', inputmode: 'numeric', placeholder: '60' }),
        field('Units per dose', 'perDose', { type: 'number', inputmode: 'numeric' }),
        field('Called', 'unitName', { placeholder: 'capsule' }),
      ),
      h('p.muted', {}, 'Leave the container count blank if you would rather not track how much is left — blank means "not counting", never zero.'),
      h('button.btn.primary', {
        style: 'width:100%',
        onclick: (e) => addOwn(e.currentTarget),
      }, 'Add it to my day'),
    ),
  );

  root.append(nutrientRow);
  paintNutrients();
  root.append(results);

  /* ---------------------------- nutrient chips ---------------------------- */
  // The join. Every nutrient that something on THIS side actually provides, so
  // a chip is never a dead end, with a count of what it would leave.
  function sideItems() {
    return state.part === 'food' ? shelf.foods : shelf.supplements;
  }

  function paintNutrients() {
    clear(nutrientRow);
    const counts = new Map();
    for (const i of sideItems()) for (const n of i.provides ?? []) counts.set(n, (counts.get(n) ?? 0) + 1);
    const values = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (state.nutrient) {
      nutrientRow.append(h('button.chip', {
        'aria-pressed': 'true',
        onclick: () => { state.nutrient = null; paintNutrients(); paint(); },
      }, `${NUTRIENTS[state.nutrient] ?? state.nutrient} ✕`));
      return;
    }
    for (const [value, count] of values) {
      nutrientRow.append(h('button.chip', {
        onclick: () => { state.nutrient = value; paintNutrients(); paint(); },
      }, `${NUTRIENTS[value] ?? value} · ${count}`));
    }
  }

  /* ------------------------------ painting ------------------------------- */
  function matches(s2) {
    if (state.nutrient && !(s2.provides ?? []).includes(state.nutrient)) return false;
    if (!state.q) return true;
    const hay = [
      s2.name, s2.substance, s2.serving,
      ...(s2.supports ?? []).map((v) => SUPPORTS_LABELS[v] ?? v),
      ...(s2.provides ?? []).map((v) => NUTRIENTS[v] ?? v),
    ].join(' ').toLowerCase();
    return hay.includes(state.q);
  }

  function supplyLine(id) {
    const sup = supplies[id];
    if (!sup || doseUnits(sup) === null) return null;
    const doses = Math.floor(sup.count / sup.unitsPerDose);
    return `${sup.count} ${sup.unitName ?? 'left'} — about ${doses} more ${doses === 1 ? 'dose' : 'doses'}`;
  }

  const nutrientsOf = (i) => (i.provides ?? []).map((v) => NUTRIENTS[v] ?? v).join(' · ');

  function foodRow(f) {
    const onList = shopping.has(f.id);
    return h('details.card.lib-item', {},
      h('summary', {},
        h('span.name', {}, f.name),
        h('span.why', {}, [f.serving, nutrientsOf(f)].filter(Boolean).join(' · ')),
      ),
      f.fields?.release ? h('p.muted', {}, f.fields.release) : null,
      h('button.btn' + (onList ? '.quiet' : '.primary'), {
        style: 'width:100%',
        onclick: (e) => toggleShopping(f, e.currentTarget),
      }, onList ? 'On the shopping list' : 'Add to shopping list'),
    );
  }

  function row(s2, { owned, where }) {
    if (s2.intakeKind === 'food') return foodRow(s2);
    const supports = (s2.supports ?? []).map((v) => SUPPORTS_LABELS[v] ?? v).join(' · ');
    const moment = MOMENT_BY_TIMING[s2.timing] ?? MOMENT_BY_TIMING.anytime;
    const stock = supplyLine(s2.id);
    // The honest line. A supplement that names a nutrient has a food route and
    // the page can offer it; one that does not, does not — and saying so is
    // more use than a column that quietly has nothing in it.
    const alsoFood = (s2.provides ?? []).length
      ? h('button.thin-link', {
        onclick: () => {
          state.part = 'food';
          state.nutrient = s2.provides[0];
          paintParts(); paintNutrients(); paint();
        },
      }, `Eat it instead — foods with ${NUTRIENTS[s2.provides[0]] ?? s2.provides[0]}`)
      : h('p.muted.tiny', {}, 'No food route to this one.');
    return h('details.card.lib-item', {},
      h('summary', {},
        h('span.name', {}, s2.name),
        h('span.why', {},
          [owned ? `In your day · ${where}` : moment.name, supports, s2.typicalDose]
            .filter(Boolean).join(' · ')),
        stock ? h('span.why', {}, stock) : null,
      ),
      s2.fields?.release ? h('p.muted', {}, s2.fields.release) : null,
      alsoFood,
      owned
        ? h('button.btn.quiet', { style: 'width:100%', onclick: (e) => removeFromDay(s2, e.currentTarget) }, 'Remove from my day')
        : h('button.btn.primary', { style: 'width:100%', onclick: (e) => addToDay(s2, e.currentTarget) }, `Add to ${moment.name}`),
    );
  }

  /* --------------------------- the shopping list --------------------------- */
  // Grouped by aisle, because that is the order somebody walks a shop in. It is
  // a list of what to buy, not a meal plan — the app has no business telling
  // anybody what to cook on Tuesday, and pretending to would be the invented
  // number problem in a new costume.
  function shoppingCard() {
    if (!shopping.size) return null;
    const chosen = shelf.foods.filter((f) => shopping.has(f.id));
    const byAisle = new Map();
    for (const f of chosen) {
      if (!byAisle.has(f.aisle)) byAisle.set(f.aisle, []);
      byAisle.get(f.aisle).push(f);
    }
    const card = h('div.card', {},
      h('div.card-head', {}, h('h2', {}, `Shopping list — ${chosen.length}`)),
    );
    for (const [aisle, foods] of [...byAisle.entries()].sort()) {
      card.append(h('h3.section-title', {}, AISLE_LABELS[aisle] ?? aisle));
      for (const f of foods) {
        card.append(h('div.row.compact', {},
          h('div.grow', {}, h('span.name', {}, f.name, h('span.dose', {}, ` · ${f.serving}`))),
          h('button.btn.quiet.small', {
            'aria-label': `Take ${f.name} off the list`,
            onclick: (e) => toggleShopping(f, e.currentTarget),
          }, '✕'),
        ));
      }
    }
    card.append(h('button.btn.quiet', {
      style: 'width:100%',
      onclick: () => guarded(async () => {
        shopping.clear();
        await store.putSetting({ key: SHOPPING_KEY, items: [], updatedAt: nowIso() });
        return true;
      }, { what: 'Clearing the list', onOk: () => paint() }),
    }, 'Clear the list'));
    return card;
  }

  function toggleShopping(f, btn) {
    btn.disabled = true;
    const wasOn = shopping.has(f.id);
    if (wasOn) shopping.delete(f.id); else shopping.add(f.id);
    return guarded(
      () => store.putSetting({ key: SHOPPING_KEY, items: [...shopping], updatedAt: nowIso() }),
      {
        what: wasOn ? `Taking ${f.name} off the list` : `Adding ${f.name} to the list`,
        onOk: () => paint(),
        onFail: () => { if (wasOn) shopping.add(f.id); else shopping.delete(f.id); btn.disabled = false; },
      },
    );
  }

  function paint() {
    clear(results);

    if (state.part === 'food') {
      const list = shoppingCard();
      if (list) results.append(list);
      const found = shelf.foods.filter(matches);
      results.append(h('h2.section-title', {},
        state.nutrient
          ? `Foods with ${NUTRIENTS[state.nutrient] ?? state.nutrient} — ${found.length}`
          : `Food — ${found.length}`));
      if (!found.length) {
        results.append(h('div.card', {}, h('p.muted', {},
          'Nothing here matches. Not every nutrient has a good food source, and where it does not, that is worth knowing rather than working around.')));
      }
      for (const f of found) results.append(foodRow(f));
      return;
    }

    // Yours first, always — the complaint that started this screen was "I had
    // to dig to find where the supplements landed in my daily routine".
    const yours = mine.filter(({ item }) => item.intakeKind !== 'food' && matches(item));
    if (yours.length) {
      results.append(h('h2.section-title', {}, `What you take — ${yours.length}`));
      for (const { item, block } of yours) results.append(row(item, { owned: true, where: block.name }));
    } else if (!state.q && !state.nutrient && !mine.length) {
      results.append(h('div.card', {}, h('p.muted', {},
        'Nothing yet. Add what you already take from the shelf below, or type in anything it does not have.')));
    }

    const rest = shelf.supplements.filter((s2) => !mineIds.has(s2.id) && matches(s2));
    results.append(h('h2.section-title', {},
      state.nutrient
        ? `Supplements with ${NUTRIENTS[state.nutrient] ?? state.nutrient} — ${rest.length}`
        : `The shelf — ${rest.length}`));
    if (!rest.length) {
      results.append(h('div.card', {}, h('p.muted', {},
        state.q || state.nutrient
          ? 'Nothing on the shelf matches. If you take it, add it above — the list will never cover every blend.'
          : 'You have added everything on the shelf.')));
    }
    for (const s2 of rest) results.append(row(s2, { owned: false }));
  }

  /* -------------------------------- writes -------------------------------- */
  async function place(item, timing, btn, label) {
    btn.disabled = true;
    return guarded(async () => {
      const all = await store.loadProtocols();
      const p = all.find((x) => x.id === PICKS_ID) ?? emptyPicks();
      const block = blockFor(p, timing);
      if (!p.blocks.some((b) => b.items.some((i) => i.id === item.id))) block.items.push(item);
      await store.saveProtocol(p);
      if (item.bottle?.unitsPerDose) {
        await store.putSetting(makeSupply(item.id, {
          name: item.name,
          unitsPerDose: item.bottle.unitsPerDose,
          unitName: item.bottle.unitName,
          ...(Number.isFinite(item.bottle.count) ? { count: item.bottle.count } : {}),
        }, await store.getSetting(`supply:${item.id}`)));
      }
      return block.name;
    }, {
      what: `Adding ${item.name}`,
      onOk: (where) => {
        btn.textContent = `${label} ${where}`;
        reload?.();
      },
      onFail: () => { btn.disabled = false; },
    });
  }

  function planItemFrom(s) {
    return {
      id: s.id,
      name: s.name,
      type: 'intake',
      timing: s.timing,
      ...(s.substance ? { substance: s.substance } : {}),
      ...(s.supports?.length ? { supports: [...s.supports] } : {}),
      ...(s.typicalDose ? { dose: s.typicalDose } : {}),
      ...(s.fields ? { fields: s.fields } : {}),
      ...(s.bottle ? { bottle: { ...s.bottle } } : {}),
    };
  }

  function addToDay(s, btn) {
    return place(planItemFrom(s), s.timing, btn, 'Added to');
  }

  function removeFromDay(s, btn) {
    btn.disabled = true;
    return guarded(async () => {
      const all = await store.loadProtocols();
      for (const p of all) {
        const before = JSON.stringify(p.blocks);
        p.blocks = p.blocks.map((b) => ({ ...b, items: b.items.filter((i) => i.id !== s.id) }));
        if (JSON.stringify(p.blocks) !== before) await store.saveProtocol(p);
      }
      // The supply record stays. A bottle you still own is a fact about your
      // cupboard, and deleting the count because you took the item off your day
      // would lose a number nobody asked to lose.
      return true;
    }, {
      what: `Removing ${s.name}`,
      onOk: () => { btn.textContent = 'Removed'; reload?.(); },
      onFail: () => { btn.disabled = false; },
    });
  }

  function addOwn(btn) {
    const name = own.name.trim();
    if (!name) {
      btn.textContent = 'Give it a name first';
      return undefined;
    }
    const units = Number(own.units);
    const perDose = Number(own.perDose);
    const item = {
      id: `sup-own-${newId()}`,
      name,
      type: 'intake',
      timing: own.timing,
      ...(own.dose.trim() ? { dose: own.dose.trim() } : {}),
      // Blank is not zero (ruling A): somebody who does not want to count how
      // much is left gets no count, not a count of nothing.
      ...(Number.isFinite(perDose) && perDose > 0
        ? {
          bottle: {
            unitsPerDose: perDose,
            unitName: own.unitName.trim() || 'unit',
            ...(Number.isFinite(units) && units > 0 ? { count: units } : {}),
          },
        }
        : {}),
    };
    return place(item, own.timing, btn, 'Added to');
  }

  paint();
  return root;
}
