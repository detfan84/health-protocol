// viewSupplements.js — its own tab, its own search, its own list.
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

let shelfCache = null;
async function loadShelf() {
  if (shelfCache) return shelfCache;
  const res = await fetch(new URL('../../content/library.json', import.meta.url));
  if (!res.ok) throw new Error(`the shelf did not load: HTTP ${res.status}`);
  const lib = await res.json();
  shelfCache = lib.items.filter((i) => i.type === 'intake');
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
    h('h1', {}, 'Supplements'),
    h('p.muted', {}, 'What you take, when you take it, and what is left in the bottle. Nothing here is a recommendation — it is a shelf, and the app only counts what you tell it you take.'),
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

  const state = { q: '' };
  const results = h('div');

  /* ------------------------------- search -------------------------------- */
  const search = h('input', {
    type: 'search',
    id: 'supplement-search',
    placeholder: 'Search 110+ supplements, or what they are for',
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

  root.append(results);

  /* ------------------------------ painting ------------------------------- */
  function matches(s) {
    if (!state.q) return true;
    const hay = [s.name, s.substance, ...(s.supports ?? []).map((v) => SUPPORTS_LABELS[v] ?? v)]
      .join(' ').toLowerCase();
    return hay.includes(state.q);
  }

  function supplyLine(id) {
    const sup = supplies[id];
    if (!sup || doseUnits(sup) === null) return null;
    const left = sup.count;
    const doses = Math.floor(left / sup.unitsPerDose);
    return `${left} ${sup.unitName ?? 'left'} — about ${doses} more ${doses === 1 ? 'dose' : 'doses'}`;
  }

  function row(s, { owned, where }) {
    const supports = (s.supports ?? []).map((v) => SUPPORTS_LABELS[v] ?? v).join(' · ');
    const moment = MOMENT_BY_TIMING[s.timing] ?? MOMENT_BY_TIMING.anytime;
    const stock = supplyLine(s.id);
    return h('details.card.lib-item', {},
      h('summary', {},
        h('span.name', {}, s.name),
        h('span.why', {},
          [owned ? `In your day · ${where}` : moment.name, supports, s.typicalDose]
            .filter(Boolean).join(' · ')),
        stock ? h('span.why', {}, stock) : null,
      ),
      s.fields?.release ? h('p.muted', {}, s.fields.release) : null,
      s.substance && s.substance !== s.name.toLowerCase()
        ? h('p.muted', {}, `What it is: ${s.substance}`) : null,
      owned
        ? h('button.btn.quiet', { style: 'width:100%', onclick: (e) => removeFromDay(s, e.currentTarget) }, 'Remove from my day')
        : h('button.btn.primary', { style: 'width:100%', onclick: (e) => addToDay(s, e.currentTarget) }, `Add to ${moment.name}`),
    );
  }

  function paint() {
    clear(results);

    // Yours first, always. The complaint that started this screen was "I had to
    // dig to find where the supplements landed in my daily routine" — so what
    // you take, and where it sits, is the first thing on the page rather than
    // something to be discovered.
    const yours = mine.filter(({ item }) => matches(item));
    if (yours.length) {
      results.append(h('h2.section-title', {}, `What you take — ${mine.length}`));
      for (const { item, block } of yours) {
        results.append(row(item, { owned: true, where: block.name }));
      }
    } else if (!state.q && !mine.length) {
      results.append(
        h('div.card', {},
          h('p.muted', {}, 'Nothing yet. Add what you already take from the shelf below, or type in anything it does not have.')),
      );
    }

    const rest = shelf.filter((s) => !mineIds.has(s.id) && matches(s));
    results.append(h('h2.section-title', {}, state.q ? `Shelf — ${rest.length}` : `The shelf — ${shelf.length}`));
    if (!rest.length) {
      results.append(h('div.card', {}, h('p.muted', {},
        state.q
          ? `Nothing on the shelf matches “${state.q}”. If you take it, add it above — the list will never cover every blend.`
          : 'You have added everything on the shelf.')));
    }
    for (const s of rest) results.append(row(s, { owned: false }));
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
