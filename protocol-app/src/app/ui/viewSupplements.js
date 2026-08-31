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
import { NUTRIENT_NOTES } from './nutrientNotes.js';

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
const PLAN_KEY = 'meal.plan';

// A week, not a calendar. A meal plan is the thing somebody makes on a Sunday
// for the seven days after it; dating it to 3 March means it expires and has to
// be rebuilt rather than adjusted.
const DAYS = [
  { id: 'mon', name: 'Monday' }, { id: 'tue', name: 'Tuesday' },
  { id: 'wed', name: 'Wednesday' }, { id: 'thu', name: 'Thursday' },
  { id: 'fri', name: 'Friday' }, { id: 'sat', name: 'Saturday' },
  { id: 'sun', name: 'Sunday' },
];
const MEALS = [
  { id: 'breakfast', name: 'Breakfast' }, { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' }, { id: 'snack', name: 'Snack' },
];
const DAY_BY_ID = Object.fromEntries(DAYS.map((d) => [d.id, d]));
const MEAL_BY_ID = Object.fromEntries(MEALS.map((m) => [m.id, m]));

function emptyPlanDays() {
  const days = {};
  for (const d of DAYS) { days[d.id] = {}; for (const m of MEALS) days[d.id][m.id] = []; }
  return days;
}

/** A saved plan, with every slot present and nothing in it that is not an id. */
export function normalisePlan(saved) {
  const days = emptyPlanDays();
  for (const d of DAYS) {
    for (const m of MEALS) {
      const got = saved?.days?.[d.id]?.[m.id];
      if (Array.isArray(got)) days[d.id][m.id] = got.filter((x) => typeof x === 'string');
    }
  }
  return days;
}

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

  // `planning` is a slot — { day, meal } — and while it is set the food rows
  // put things into that meal instead of onto the list. A mode, but a signposted
  // one: picking a meal and then browsing is how somebody actually plans a week,
  // and it saves building a second copy of the food list inside a picker.
  const state = { part: 'supplements', q: '', nutrient: null, planning: null };
  const shopping = new Set((await store.getSetting(SHOPPING_KEY))?.items ?? []);
  const plan = normalisePlan(await store.getSetting(PLAN_KEY));
  const foodById = Object.fromEntries(shelf.foods.map((f) => [f.id, f]));
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

  function foodRow(f, { sibling = false } = {}) {
    const onList = shopping.has(f.id);
    const target = state.planning;
    const inSlot = !!target && plan[target.day][target.meal].includes(f.id);
    // A form reads as what it is — "pickled", "tinned, with bones" — rather
    // than repeating the food's name, when it is sitting under its own parent.
    const label = sibling && f.form ? f.form.replace(/^./, (c) => c.toUpperCase()) : f.name;
    return h('details.card.lib-item' + (sibling ? '.food-form' : ''), {},
      h('summary', {},
        h('span.name', {}, label),
        h('span.why', {}, [f.serving, nutrientsOf(f)].filter(Boolean).join(' · ')),
      ),
      f.fields?.release ? h('p.muted', {}, f.fields.release) : null,
      nutrientChips(f),
      target
        ? h('button.btn' + (inSlot ? '.quiet' : '.primary'), {
          style: 'width:100%',
          onclick: (e) => togglePlanned(f, target, e.currentTarget),
        }, inSlot ? `On ${slotLabel(target)}` : `Add to ${slotLabel(target)}`)
        : h('button.btn' + (onList ? '.quiet' : '.primary'), {
          style: 'width:100%',
          onclick: (e) => toggleShopping(f, e.currentTarget),
        }, onList ? 'On the shopping list' : 'Add to shopping list'),
    );
  }

  /**
   * Foods, with their other forms tucked under them.
   *
   * Kevin, 29 Aug: "I would think you can split beets into different varieties
   * like fresh or pickled and beetroot extract or powder as different things."
   * They are different things — different nutrients, sometimes a different
   * aisle — but listing "Beetroot, fresh" and "Beetroot, pickled" as unrelated
   * neighbours makes the reader work out that they are the same vegetable. So
   * the parent carries its forms, and a filtered view still shows a form on its
   * own when its parent does not match: looking for calcium should surface
   * tinned salmon whether or not the fresh fillet qualifies.
   */
  function foodGroup(found) {
    const shown = new Set(found.map((f) => f.id));
    const out = [];
    for (const f of found) {
      if (f.variationOf && shown.has(f.variationOf)) continue; // drawn under its parent
      const forms = found.filter((x) => x.variationOf === f.id);
      if (!forms.length) { out.push(foodRow(f)); continue; }
      out.push(h('div.food-family', {},
        foodRow(f),
        h('div.food-forms', {}, forms.map((x) => foodRow(x, { sibling: true }))),
      ));
    }
    return out;
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
          // Landing halfway down the previous scroll position is the same bug
          // wearing a different hat.
          results.scrollIntoView?.({ block: 'start' });
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
      nutrientChips(s2),
      owned
        ? h('button.btn.quiet', { style: 'width:100%', onclick: (e) => removeFromDay(s2, e.currentTarget) }, 'Remove from my day')
        : addPanel(s2),
    );
  }

  /* ----------------------- adding one from the shelf ----------------------- */
  // Kevin, 31 Aug: "the vitamins, they don't give you the opportunity to adjust
  // the size of the container or the dosage or anything like that, like we had
  // discussed. You should be able to do that before you add it to your day. You
  // should also have the ability to add it to your day where you want to, not
  // necessarily where it's recommended… It's good to have the suggestion, but
  // we need to make it so people can just track their routine. If their routine
  // is their routine, then they can keep their routine."
  //
  // So everything the shelf knows is a STARTING POINT and says so. The suggested
  // moment is pre-selected and labelled as the suggestion; the other four are
  // one tap away and none of them argue. Same for the bottle — 60 capsules at
  // one per dose is the shelf's guess, and somebody holding a tub of 120 should
  // not have to go and correct it on another screen afterwards.

  const drafts = new Map();
  function draftFor(s) {
    if (!drafts.has(s.id)) {
      drafts.set(s.id, {
        dose: s.typicalDose ?? '',
        timing: s.timing ?? 'anytime',
        units: Number.isFinite(s.bottle?.count) ? String(s.bottle.count) : '',
        perDose: Number.isFinite(s.bottle?.unitsPerDose) ? String(s.bottle.unitsPerDose) : '1',
        unitName: s.bottle?.unitName ?? 'capsule',
      });
    }
    return drafts.get(s.id);
  }

  function addPanel(s) {
    const d = draftFor(s);
    const fieldFor = (label, key, attrs = {}) => h('div.field', {},
      h('label', { for: `add-${s.id}-${key}` }, label),
      h('input', {
        id: `add-${s.id}-${key}`, type: 'text', value: d[key],
        oninput: (e) => { d[key] = e.target.value; }, ...attrs,
      }),
    );
    // Marked in place rather than re-rendered. Rebuilding the row on every tap
    // destroys the button that was just pressed, which throws focus back to the
    // body — fine with a mouse, and the end of the road for anybody moving
    // through this with a keyboard or a screen reader.
    const momentBtns = MOMENTS.map((m) => {
      const btn = h('button.chip', {
        'aria-pressed': d.timing === m.timing ? 'true' : 'false',
        onclick: () => {
          d.timing = m.timing;
          for (const b of momentBtns) b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        },
      }, m.timing === s.timing ? `${m.name} · suggested` : m.name);
      return btn;
    });
    const moments = h('div.chip-row', { role: 'group', 'aria-label': `When to take ${s.name}` }, momentBtns);
    return h('div.add-panel', {},
      h('h3.section-title', {}, 'When you take it'),
      moments,
      fieldFor('How much', 'dose', { placeholder: s.typicalDose ?? 'e.g. 1 capsule' }),
      h('h3.section-title', {}, 'Your container'),
      h('div.field-row', {},
        fieldFor('Units in it', 'units', { type: 'number', inputmode: 'numeric', placeholder: '60' }),
        fieldFor('Units per dose', 'perDose', { type: 'number', inputmode: 'numeric' }),
        fieldFor('Called', 'unitName', { placeholder: 'capsule' }),
      ),
      h('p.muted.tiny', {}, 'Whatever the shelf guessed, yours wins. Leave the count blank if you would rather not track what is left — blank means "not counting", never zero.'),
      h('button.btn.primary', {
        style: 'width:100%',
        onclick: (e) => addFromShelf(s, e.currentTarget),
      }, 'Add it to my day'),
    );
  }

  function addFromShelf(s, btn) {
    const d = draftFor(s);
    const units = Number(d.units);
    const perDose = Number(d.perDose);
    const item = { ...planItemFrom(s), timing: d.timing };
    if (d.dose.trim()) item.dose = d.dose.trim(); else delete item.dose;
    // Blank is not zero (ruling A). No units-per-dose means no bottle to count.
    if (Number.isFinite(perDose) && perDose > 0) {
      item.bottle = {
        unitsPerDose: perDose,
        unitName: d.unitName.trim() || 'unit',
        ...(Number.isFinite(units) && units > 0 ? { count: units } : {}),
      };
    } else {
      delete item.bottle;
    }
    return place(item, d.timing, btn, 'Added to');
  }

  /* -------------------------- what a nutrient is --------------------------- */
  // Kevin, 31 Aug: "it's nice to see that it has polyphenols or whatever too,
  // but what are those? We should be able to click to get some education on it
  // if we want."
  //
  // "If we want" is the design. Behind a tap, never in the way of somebody who
  // already knows what magnesium is — and the explainer carries the way back out
  // to the rest of the shelf, because "what is this" and "where else do I get
  // it" are the same curiosity half a second apart.
  function nutrientChips(item) {
    const list = item.provides ?? [];
    if (!list.length) return null;
    const row2 = h('div.chip-row', { role: 'group', 'aria-label': `What is in ${item.name}` });
    const note = h('div');
    for (const n of list) {
      row2.append(h('button.chip', {
        'aria-pressed': 'false',
        onclick: (e) => {
          const wasOpen = e.currentTarget.getAttribute('aria-pressed') === 'true';
          for (const b of row2.querySelectorAll('button')) b.setAttribute('aria-pressed', 'false');
          clear(note);
          if (wasOpen) return;
          e.currentTarget.setAttribute('aria-pressed', 'true');
          note.append(nutrientNote(n));
        },
      }, NUTRIENTS[n] ?? n));
    }
    return h('div.nutrient-strip', {},
      h('p.muted.tiny', {}, 'Tap one to see what it is.'),
      row2,
      note,
    );
  }

  function nutrientNote(n) {
    const label = NUTRIENTS[n] ?? n;
    return h('div.nutrient-note', {},
      h('p', {}, NUTRIENT_NOTES[n] ?? `No plain-words explanation is written for ${label} yet.`),
      h('button.thin-link', {
        onclick: () => {
          state.part = 'food';
          state.nutrient = n;
          paintParts(); paintNutrients(); paint();
        },
      }, `Foods with ${label}`),
    );
  }

  /* ----------------------------- the meal plan ----------------------------- */
  // Kevin, 29 Aug: "they can create a shopping list and meal plan on one side
  // and have the supps on the other side." Both halves of that sentence, and
  // the arrow between them runs one way: you plan the week, and the shopping
  // list is what the plan needs. Keeping two independent lists would mean
  // planning a Tuesday dinner and still having to remember to buy it.
  //
  // The app does not decide what you eat on Tuesday. It has no business doing
  // that and inventing meals is the sixty-seconds-per-item failure in an apron.
  // You pick the slot, you pick the food, and the only thing it works out for
  // itself is the consequence for the shop.

  const slotLabel = (t) => `${DAY_BY_ID[t.day].name} ${MEAL_BY_ID[t.meal].name.toLowerCase()}`;
  const savePlan = () => store.putSetting({ key: PLAN_KEY, days: plan, updatedAt: nowIso() });

  /** foodId → the meals that want it, so a row can say why it is on the list. */
  function plannedFoods() {
    const want = new Map();
    for (const d of DAYS) {
      for (const m of MEALS) {
        for (const id of plan[d.id][m.id]) {
          if (!want.has(id)) want.set(id, []);
          want.get(id).push(`${d.name} ${m.name.toLowerCase()}`);
        }
      }
    }
    return want;
  }

  function togglePlanned(f, target, btn) {
    btn.disabled = true;
    const slot = plan[target.day][target.meal];
    const at = slot.indexOf(f.id);
    if (at >= 0) slot.splice(at, 1); else slot.push(f.id);
    return guarded(savePlan, {
      what: at >= 0 ? `Taking ${f.name} off ${slotLabel(target)}` : `Putting ${f.name} on ${slotLabel(target)}`,
      onOk: () => paint(),
      onFail: () => {
        if (at >= 0) slot.splice(at, 0, f.id); else slot.splice(slot.indexOf(f.id), 1);
        btn.disabled = false;
      },
    });
  }

  function planningBanner() {
    return h('div.card', {},
      h('p', {}, `Planning ${slotLabel(state.planning)} — tap a food below to put it in.`),
      h('button.btn.quiet', {
        style: 'width:100%',
        onclick: () => { state.planning = null; paint(); },
      }, 'Done planning'));
  }

  function mealPlanCard() {
    const want = plannedFoods();
    const card = h('div.card', {},
      h('div.card-head', {}, h('h2', {},
        want.size ? `Meal plan — ${want.size} ${want.size === 1 ? 'food' : 'foods'}` : 'Meal plan')),
    );
    if (!want.size) {
      card.append(h('p.muted', {}, 'Nothing planned yet. Pick a meal, then tap the foods that go in it — whatever you plan turns up on the shopping list.'));
    }
    for (const d of DAYS) {
      const slots = h('div.chip-row', { role: 'group', 'aria-label': `${d.name} meals` });
      for (const m of MEALS) {
        const ids = plan[d.id][m.id];
        const on = state.planning?.day === d.id && state.planning?.meal === m.id;
        slots.append(h('button.chip', {
          'aria-pressed': on ? 'true' : 'false',
          onclick: () => { state.planning = on ? null : { day: d.id, meal: m.id }; paint(); },
        }, ids.length ? `${m.name} · ${ids.length}` : m.name));
      }
      card.append(h('h3.section-title', {}, d.name), slots);
      for (const m of MEALS) {
        for (const id of plan[d.id][m.id]) {
          // A food can be planned and then dropped from the shelf between
          // builds. Showing the id beats silently losing somebody's Tuesday.
          const f = foodById[id] ?? { id, name: id };
          card.append(h('div.row.compact', {},
            h('div.grow', {}, h('span.name', {}, f.name, h('span.dose', {}, ` · ${m.name}`))),
            h('button.btn.quiet.small', {
              'aria-label': `Take ${f.name} off ${d.name} ${m.name.toLowerCase()}`,
              onclick: (e) => togglePlanned(f, { day: d.id, meal: m.id }, e.currentTarget),
            }, '✕'),
          ));
        }
      }
    }
    if (want.size) {
      card.append(h('button.btn.quiet', {
        style: 'width:100%',
        onclick: () => guarded(async () => {
          for (const d of DAYS) for (const m of MEALS) plan[d.id][m.id] = [];
          await savePlan();
          return true;
        }, { what: 'Clearing the plan', onOk: () => { state.planning = null; paint(); } }),
      }, 'Clear the plan'));
    }
    return card;
  }

  /* --------------------------- the shopping list --------------------------- */
  // Grouped by aisle, because that is the order somebody walks a shop in.
  //
  // Two ways onto it, and the difference is visible rather than merged: what
  // the plan needs, which says which meals want it, and what you added straight
  // to the list, which says nothing because there is nothing to say. A planned
  // row has no ✕ — it leaves when it leaves the plan, and a list that could
  // silently disagree with the plan above it is worse than no list.
  function shoppingCard() {
    const want = plannedFoods();
    const chosen = shelf.foods.filter((f) => want.has(f.id) || shopping.has(f.id));
    if (!chosen.length) return null;
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
        const meals = want.get(f.id);
        card.append(h('div.row.compact', {},
          h('div.grow', {}, h('span.name', {}, f.name, h('span.dose', {}, ` · ${f.serving}`)),
            meals ? h('span.why', {}, `For ${meals.join(', ')}`) : null),
          meals ? null : h('button.btn.quiet.small', {
            'aria-label': `Take ${f.name} off the list`,
            onclick: (e) => toggleShopping(f, e.currentTarget),
          }, '✕'),
        ));
      }
    }
    if (shopping.size) {
      card.append(h('button.btn.quiet', {
        style: 'width:100%',
        onclick: () => guarded(async () => {
          shopping.clear();
          await store.putSetting({ key: SHOPPING_KEY, items: [], updatedAt: nowIso() });
          return true;
        }, { what: 'Clearing the list', onOk: () => paint() }),
      }, want.size ? 'Clear the ones you added' : 'Clear the list'));
    }
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
      // Kevin, 31 Aug, arriving here from a supplement: "when you click on one
      // and you're like, okay, eat it instead, foods with calcium — that should
      // show up before."
      //
      // It should, and it did not: the plan and the shopping list sat above the
      // answer and pushed it off the screen. Neither of them knows anything
      // about calcium. A filter is a question, so when one is on, the answer
      // goes first and the two cards that ignore it drop below.
      const filtered = !!state.nutrient || !!state.q;

      const cards = [];
      if (state.planning) cards.push(planningBanner());
      cards.push(mealPlanCard());
      const list = shoppingCard();
      if (list) cards.push(list);

      const found = shelf.foods.filter(matches);
      const answer = [h('h2.section-title', {},
        state.nutrient
          ? `Foods with ${NUTRIENTS[state.nutrient] ?? state.nutrient} — ${found.length}`
          : `Food — ${found.length}`)];
      if (!found.length) {
        answer.push(h('div.card', {}, h('p.muted', {},
          'Nothing here matches. Not every nutrient has a good food source, and where it does not, that is worth knowing rather than working around.')));
      }
      answer.push(...foodGroup(found));

      if (filtered) results.append(...answer, ...cards);
      else results.append(...cards, ...answer);
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
