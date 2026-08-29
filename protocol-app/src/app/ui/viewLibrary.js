// viewLibrary.js — the whole catalogue, and the way something gets from it
// into your day.
//
// This is the app's actual purpose (Kevin, 23 Aug): a large library that
// anybody can self-select from, not a curated day for one person — exercises
// with their progression ladders, stretches, body-work cards with photographs,
// daily practices, measured self-tests — searchable by name, by muscle, by
// equipment, by what kind of thing it is.
//
// The count is deliberately not written down here. It used to say 287 while
// the file held 258, because a number in a comment is a fact with nobody
// checking it. `npm run catalog` prints the real one, and the screen shows it.
//
// Nothing here judges what you pick. Being in the library costs nothing and
// asks nothing; adding is one tap, removing is one tap on the other screen.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { newId, nowIso } from '../../lib/core.js';

// The shelf you browse by is EFFECT — what a thing does to you — because it is
// the facet a person can answer about themselves: tight, weak, wired
// (TAXONOMY §8). This used to be `kind`, which sorted by which file of the 2025
// app an item arrived in, so "Strength & movement" and "Stretches" held the
// same work depending on its provenance.
//
// Plain words, not the ids. `mobilise` is the ledger's vocabulary; "move it
// through its range" is what somebody is actually looking for.
const EFFECTS = [
  ['release', 'Release something tight'],
  ['lengthen', 'Lengthen it'],
  ['mobilise', 'Move it through its range'],
  ['load', 'Load it'],
  ['activate', 'Wake it up'],
  ['control', 'Balance and control'],
  ['calm', 'Settle down'],
  ['circulate', 'Move fluid'],
  ['condition', 'Build capacity'],
];
// The other slice: what KIND of record it is. Practices are the default and
// need no chip; these two are what a person asks for by name.
const TYPES = [
  ['measurement', 'Measure yourself'],
  ['teaching', 'Read about it'],
];
const EFFECT_LABELS = Object.fromEntries(EFFECTS);
const EQUIPMENT_LABELS = {
  none: 'Nothing', ball: 'Ball', roller: 'Foam roller', band: 'Resistance band',
  strap: 'Strap or towel', mat: 'Mat', wall: 'A wall', doorway: 'A doorway',
  chair: 'A chair or bench', step: 'A step', dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell', mace: 'Steel mace', rope: 'Jump rope',
  'pullup-bar': 'Pull-up bar', 'balance-board': 'Balance board',
  'acupressure-mat': 'Acupressure mat',
};

const FIELD_LABELS = {
  tool: 'You need',
  release: 'Do this',
  load: 'Then load it',
  notice: 'Notice',
  careful: 'Careful',
};

// Content law 5: a claim carries its epistemic status. An evidence grade that
// ships in the file and renders nowhere does not satisfy that — it satisfies
// the author, which is a different thing. Tolerant of both shapes an authored
// item might use: a bare string is the grade, an object may add the basis.
const evidenceOf = (e) => (typeof e === 'string' ? { grade: e } : (e ?? {}));

const TIER_LABELS = {
  exploratory: 'Exploratory',
  established: 'Established',
};

/** Where a picked item goes: one protocol, made the first time it is needed. */
const PICKS_ID = 'my-picks';

let cache = null;
async function loadLibrary() {
  if (cache) return cache;
  const res = await fetch(new URL('../../content/library.json', import.meta.url));
  if (!res.ok) throw new Error(`the library did not load: HTTP ${res.status}`);
  cache = await res.json();
  return cache;
}

export async function viewLibrary({ reload } = {}) {
  const root = h('div');
  root.append(
    h('h1', {}, 'Library'),
    h('p.muted', {}, 'Everything the app knows how to teach. Search it, or narrow it down, and add whatever fits what you are working on. Nothing here is a recommendation — it is a shelf.'),
  );

  let library;
  try {
    library = await loadLibrary();
  } catch (error) {
    root.append(
      h('div.card', {},
        h('h2', {}, "The library didn't load."),
        h('p.muted', {}, 'Everything else still works. This needs a connection the first time, and after that it is cached with the app.'),
        h('p.tech', {}, String(error.message ?? error)),
      ),
    );
    return root;
  }

  const protocols = await store.loadProtocols();
  const owned = new Set(protocols.flatMap((p) => p.blocks.flatMap((b) => b.items.map((i) => i.id))));

  const state = { q: '', kind: null, muscle: null, equipment: null };
  const results = h('div');

  /* ------------------------------ filters ------------------------------ */

  // Filter by the anatomy graph, not by the free-text `muscles` field.
  //
  // This is what hid the calf releases. `bw-calf` is a release card called
  // "Calves" and it carried no `muscles` at all — like every body-work card, as
  // the 28 Aug correction log recorded — so filtering by a muscle could not
  // return it, and the shelf looked like it held no calf release. It holds
  // four. The graph tags them now, and one option covers a group and everything
  // under it: picking "Glutes" returns items tagged maximus or medius, because
  // a tag rolls up (TAXONOMY §3).
  const anatomyIndex = new Map((library.anatomy ?? []).map((n) => [n.id, n]));
  const rollUpOf = (id) => {
    const out = new Set();
    const walk = (n) => {
      if (!n || out.has(n) || !anatomyIndex.has(n)) return;
      out.add(n);
      for (const parent of anatomyIndex.get(n).parents ?? []) walk(parent);
    };
    walk(id);
    return out;
  };
  const inUse = new Set(library.items.flatMap((i) => i.target ?? []).flatMap((id) => [...rollUpOf(id)]));
  const muscles = [...inUse]
    .map((id) => [id, anatomyIndex.get(id)?.name ?? id])
    .sort((a, b) => a[1].localeCompare(b[1]));
  // `equipment` is the facet now: a list of ids from the vocabulary, not the
  // free-text field it was derived from. That field held two things at once —
  // 263 enum-ish values and 71 sentences written for a reader — and the sentence
  // half was being offered as a dropdown option nobody could pick usefully. The
  // prose stays where it belongs, in fields.tool.
  const equipment = [...new Set(library.items.flatMap((i) => i.equipment ?? []))].sort();

  const search = h('input', {
    type: 'search',
    id: 'library-search',
    placeholder: 'Search — “hip”, “neck”, “band”, “breath”…',
    'aria-label': 'Search the library',
    oninput: (e) => { state.q = e.target.value.trim().toLowerCase(); render(); },
  });

  const chip = (label, active, onclick) =>
    h('button.phase-chip', { 'aria-pressed': String(active), onclick }, label);

  const filters = h('div');
  function renderFilters() {
    clear(filters);
    filters.append(
      h('div.chip-row', {},
        chip('Everything', !state.effect && !state.type, () => { state.effect = null; state.type = null; render(); }),
        EFFECTS.map(([value, label]) =>
          chip(label, state.effect === value, () => {
            state.effect = state.effect === value ? null : value;
            state.type = null;
            render();
          })),
        TYPES.map(([value, label]) =>
          chip(label, state.type === value, () => {
            state.type = state.type === value ? null : value;
            state.effect = null;
            render();
          })),
      ),
      h('div.field-row', { style: 'margin-top:var(--sp-2)' },
        h('div', {},
          h('label', { for: 'lib-muscle' }, 'Muscle or area'),
          h('select', {
            id: 'lib-muscle',
            onchange: (e) => { state.muscle = e.target.value || null; render(); },
          },
            [h('option', { value: '' }, 'Any')].concat(
              muscles.map(([id, label]) => h('option', { value: id, selected: state.muscle === id }, label)),
            ),
          ),
        ),
        h('div', {},
          h('label', { for: 'lib-equip' }, 'Equipment'),
          h('select', {
            id: 'lib-equip',
            onchange: (e) => { state.equipment = e.target.value || null; render(); },
          },
            [h('option', { value: '' }, 'Any')].concat(
              equipment.map((m) => h('option', { value: m, selected: state.equipment === m }, EQUIPMENT_LABELS[m] ?? m.replace(/-/g, ' '))),
            ),
          ),
        ),
      ),
    );
  }
  renderFilters();

  root.append(
    h('div.card', {},
      h('div.field', {}, h('label', { for: 'library-search' }, 'Search'), search),
      filters,
    ),
    results,
  );

  /* ------------------------------ adding ------------------------------- */

  async function addToDay(item, btn, chosenLevel) {
    btn.disabled = true;
    return guarded(
      async () => {
        const all = await store.loadProtocols();
        let picks = all.find((p) => p.id === PICKS_ID);
        if (!picks) {
          picks = {
            id: PICKS_ID,
            name: 'My picks',
            notes: 'Things you chose from the library. Edit, reorder or remove any of it — it is an ordinary protocol.',
            active: true,
            phases: [],
            blocks: [{ id: newId(), name: 'From the library', order: 0, items: [] }],
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
        }
        const block = picks.blocks[0];
        if (block.items.some((i) => i.id === item.id)) return { already: true };

        // The library item becomes an ordinary plan item — the same shape as
        // everything else, so nothing about it is special once it is yours.
        //
        // The rung travels. This used to take levels[0] unconditionally, so
        // whichever rung a person was actually on, their day said rung 1 —
        // which is worse than silent when a clinician has deliberately put
        // somebody on an easier one.
        const levels = item.levels ?? [];
        const level = levels.find((l) => l.level === chosenLevel) ?? levels[0];
        const planItem = {
          id: item.id,
          name: item.name,
          ...(item.why ? { why: item.why } : {}),
          ...(item.fields ? { fields: item.fields } : {}),
          ...(item.photos?.length ? { photos: item.photos } : {}),
          ...(item.tracking && item.tracking !== 'check' ? { tracking: item.tracking } : {}),
          // The plan asks for what the item says, or it asks for nothing.
          //
          // This used to synthesise 3 × 10 for anything tracked in sets and 45
          // seconds for anything tracked by duration — numbers nobody derived,
          // shown to the person as the prescription. Canon 3.7: no uncertainty
          // was experienced when they were written, which is exactly how an
          // invented number gets mistaken for a known one. The PT said thirty
          // seconds and the app would have said forty-five.
          //
          // Absent stays absent. A blank asks the person to fill it in; a
          // confident wrong number tells them not to look.
          ...(item.amount ? { amount: item.amount } : {}),
          ...(item.carefulAudience ? { carefulAudience: item.carefulAudience } : {}),
          // The facets travel now (schema 3, docs/TAXONOMY.md §9.3). They used
          // to stop here: this function translated a handful of fields and the
          // validator had no slot for the rest, so what an item WAS — what it
          // does, what it acts on, where, with what — was known in the library
          // and unknown the moment it became yours.
          //
          // Absent stays absent, one field at a time. An item the catalogue has
          // not tagged arrives untagged rather than arriving with empty lists,
          // because "nobody has said" and "none" are different facts (D24).
          ...Object.fromEntries(
            ['type', 'technique', 'performedBy', 'tradition', 'variationOf']
              .filter((k) => item[k])
              .map((k) => [k, item[k]]),
          ),
          ...(item.outcomes?.length ? { outcomes: item.outcomes } : {}),
          ...Object.fromEntries(
            ['effect', 'tissue', 'target', 'context', 'equipment', 'demands', 'before']
              .filter((k) => Array.isArray(item[k]) && item[k].length)
              .map((k) => [k, [...item[k]]]),
          ),
          ...(item.tier ? { tier: item.tier } : {}),
          ...(item.everyNDays ? { cadence: { kind: 'everyNDays', n: item.everyNDays } } : {}),
          ...(level ? { activeLevel: level.level } : {}),
          // A dose and a rung are different things, and we separated them on
          // purpose. The dose is what the plan asks for; the rung note says
          // which version you are doing. When an item has a real dose that is
          // the dose — otherwise the chosen rung's note stands in, which is
          // what ladder items have always done.
          ...(item.dose
            ? { dose: item.dose }
            : level?.note ? { dose: level.note } : {}),
        };
        block.items.push(planItem);
        await store.saveProtocol(picks);
        return { already: false };
      },
      {
        what: `Adding ${item.name}`,
        onOk: (res) => {
          owned.add(item.id);
          btn.textContent = res.already ? 'Already in your day' : 'Added to your day';
          btn.classList.remove('primary');
        },
        onFail: () => { btn.disabled = false; },
      },
    );
  }

  /* ------------------------------ results ------------------------------ */

  function matches(item) {
    if (state.effect && !(item.effect ?? []).includes(state.effect)) return false;
    if (state.type && item.type !== state.type) return false;
    // An item tagged `glute-med-min` answers a search for "Glutes" and for
    // "Hip", because the tag implies everything above it.
    if (state.muscle && !(item.target ?? []).some((t) => rollUpOf(t).has(state.muscle))) return false;
    if (state.equipment && !(item.equipment ?? []).includes(state.equipment)) return false;
    if (!state.q) return true;
    const hay = [
      item.name, item.category, item.categoryName,
      (item.equipment ?? []).join(' '),
      item.type, (item.effect ?? []).map((e) => `${e} ${EFFECT_LABELS[e] ?? ''}`).join(' '),
      (item.target ?? []).join(' '), item.technique, item.tradition,
      (item.muscles ?? []).join(' '), item.why,
      item.tier, evidenceOf(item.evidence).grade, evidenceOf(item.evidence).basis,
      item.dose, item.sourceNote,
      Object.values(item.fields ?? {}).join(' '),
      (item.levels ?? []).map((l) => `${l.name} ${l.note ?? ''}`).join(' '),
    ].join(' ').toLowerCase();
    return state.q.split(/\s+/).every((word) => hay.includes(word));
  }

  function card(item) {
    // What the card says it is: what it does, in the words above. A teaching
    // card or a self-test says so instead, because neither does anything to
    // the body and an empty effect on them is the truth, not a gap.
    const doesLabel = item.type === 'practice'
      ? (item.effect ?? []).map((e) => EFFECT_LABELS[e] ?? e).join(' · ')
      : (TYPES.find(([t]) => t === item.type)?.[1] ?? item.type);
    // Which rung goes into the day. Defaults to the first, which is the
    // gentlest — a ladder's bottom rung is a real answer, not a failure state.
    let chosenLevel = item.levels?.[0]?.level;
    const addBtn = h('button.btn' + (owned.has(item.id) ? '' : '.primary'), {
      style: 'width:100%; margin-top:var(--sp-2)',
      disabled: owned.has(item.id) ? '' : null,
      onclick: (e) => addToDay(item, e.currentTarget, chosenLevel),
    }, owned.has(item.id) ? 'Already in your day' : 'Add to my day');

    return h('details.card.lib-item', {},
      h('summary', {},
        h('span.name', {}, item.name),
        h('span.why', {},
          [
            TIER_LABELS[item.tier] ?? item.tier,
            doesLabel,
            (item.equipment ?? []).join(', ').replace(/_/g, ' ') || null,
          ].filter(Boolean).join(' · '),
        ),
      ),
      item.why ? h('p.muted', {}, item.why) : null,
      item.dose
        ? h('div.fields', {},
            h('div.field-line', {},
              h('span.field-label', {}, 'Dose'),
              h('span', {}, item.dose)))
        : null,
      item.fields
        ? h('div.fields', {},
            Object.keys(FIELD_LABELS)
              .filter((k) => item.fields[k])
              .map((k) => h('div.field-line' + (k === 'careful' ? '.careful' : ''), {},
                h('span.field-label', {}, FIELD_LABELS[k]),
                h('span', {}, item.fields[k]))),
          )
        : null,
      // No grade, no Evidence line. Saying "not graded" is itself a claim about
      // the evidence, and an absent grade is a gap, not a finding.
      evidenceOf(item.evidence).grade
        ? h('div.fields', { style: 'margin-top:var(--sp-3)' },
            h('div.field-line', {},
              h('span.field-label', {}, 'Evidence'),
              h('span', {}, evidenceOf(item.evidence).grade)),
            evidenceOf(item.evidence).basis
              ? h('p.why', {}, evidenceOf(item.evidence).basis)
              : null,
          )
        : null,
      item.sourceNote
        ? h('div.fields', { style: 'margin-top:var(--sp-2)' },
            h('div.field-line', {},
              h('span.field-label', {}, 'Source'),
              h('span', {}, item.sourceNote)))
        : null,
      item.levels?.length
        ? h('div', { style: 'margin-top:var(--sp-3)' },
            h('span.field-label', {}, (item.effect ?? []).includes('lengthen') ? 'How hard' : 'Where to start'),
            h('div', {}, item.levels.map((l) =>
              h('p.why', {}, `${l.level}. ${l.name}${l.note ? ` — ${l.note}` : ''}`))),
          )
        : null,
      item.levels?.length > 1
        ? h('div.field', { style: 'margin-top:var(--sp-2)' },
            h('label', { for: `lib-level-${item.id}` }, 'Start at'),
            h('select', {
              id: `lib-level-${item.id}`,
              onchange: (e) => { chosenLevel = Number(e.target.value); },
            }, item.levels.map((l) =>
              h('option', { value: String(l.level), selected: l.level === chosenLevel },
                `${l.level}. ${l.name}`))),
          )
        : null,
      item.photos?.length
        ? h('div.photos', {}, item.photos.map((ph) =>
            h('figure.photo-figure', {},
              h('img.photo', {
                src: `./src/content/photos/${ph.set}_0.jpg`,
                alt: ph.caption ?? item.name,
                loading: 'lazy',
              }),
              ph.caption ? h('figcaption.why', {}, ph.caption) : null)))
        : null,
      addBtn,
    );
  }

  function render() {
    clear(results);
    const found = library.items.filter(matches);
    results.append(
      h('p.muted', { style: 'margin-top:var(--sp-4)' },
        `${found.length} of ${library.items.length}`),
    );
    if (!found.length) {
      results.append(h('div.card', {}, h('p.muted', {}, 'Nothing matches that. Try a muscle, a piece of equipment, or a plainer word.')));
      return;
    }
    // Long lists get heavy on a phone; the rest is one tap away.
    for (const item of found.slice(0, 60)) results.append(card(item));
    if (found.length > 60) {
      const more = h('button.btn', { style: 'width:100%' }, `Show the other ${found.length - 60}`);
      more.addEventListener('click', () => {
        more.remove();
        for (const item of found.slice(60)) results.append(card(item));
      });
      results.append(more);
    }
  }

  render();
  return root;
}
