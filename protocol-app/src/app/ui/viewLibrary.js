// viewLibrary.js — the whole catalogue, and the way something gets from it
// into your day.
//
// This is the app's actual purpose (Kevin, 23 Aug): a large library that
// anybody can self-select from, not a curated day for one person. 287 items —
// exercises with their progression ladders, stretches, body-work cards with
// photographs, daily practices, measured self-tests — searchable by name, by
// muscle, by equipment, by what kind of thing it is.
//
// Nothing here judges what you pick. Being in the library costs nothing and
// asks nothing; adding is one tap, removing is one tap on the other screen.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { newId, nowIso } from '../../lib/core.js';

const KINDS = [
  ['exercise', 'Strength & movement'],
  ['stretch', 'Stretches'],
  ['bodywork', 'Body work'],
  ['practice', 'Daily practices'],
  ['selftest', 'Measure yourself'],
];

const FIELD_LABELS = {
  tool: 'You need',
  release: 'Do this',
  load: 'Then load it',
  notice: 'Notice',
  careful: 'Careful',
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

  const muscles = [...new Set(library.items.flatMap((i) => i.muscles ?? []))].sort();
  const equipment = [...new Set(library.items.map((i) => i.equipment).filter(Boolean))]
    .filter((e) => e.length < 24) // body-work "tools" are sentences; keep the list usable
    .sort();

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
        chip('Everything', !state.kind, () => { state.kind = null; render(); }),
        KINDS.map(([value, label]) =>
          chip(label, state.kind === value, () => { state.kind = state.kind === value ? null : value; render(); })),
      ),
      h('div.field-row', { style: 'margin-top:var(--sp-2)' },
        h('div', {},
          h('label', { for: 'lib-muscle' }, 'Muscle or area'),
          h('select', {
            id: 'lib-muscle',
            onchange: (e) => { state.muscle = e.target.value || null; render(); },
          },
            [h('option', { value: '' }, 'Any')].concat(
              muscles.map((m) => h('option', { value: m, selected: state.muscle === m }, m)),
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
              equipment.map((m) => h('option', { value: m, selected: state.equipment === m }, m.replace(/_/g, ' '))),
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

  async function addToDay(item, btn) {
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
        const level = item.levels?.[0];
        const planItem = {
          id: item.id,
          name: item.name,
          ...(item.why ? { why: item.why } : {}),
          ...(item.fields ? { fields: item.fields } : {}),
          ...(item.photos?.length ? { photos: item.photos } : {}),
          ...(item.tracking && item.tracking !== 'check' ? { tracking: item.tracking } : {}),
          ...(item.tracking === 'sets' ? { target: { sets: 3, reps: 10 } } : {}),
          ...(item.tracking === 'duration' ? { target: { seconds: 45 } } : {}),
          ...(item.everyNDays ? { cadence: { kind: 'everyNDays', n: item.everyNDays } } : {}),
          ...(level?.note ? { dose: level.note } : {}),
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
    if (state.kind && item.kind !== state.kind) return false;
    if (state.muscle && !(item.muscles ?? []).includes(state.muscle)) return false;
    if (state.equipment && item.equipment !== state.equipment) return false;
    if (!state.q) return true;
    const hay = [
      item.name, item.category, item.categoryName, item.equipment,
      (item.muscles ?? []).join(' '), item.why,
      Object.values(item.fields ?? {}).join(' '),
      (item.levels ?? []).map((l) => `${l.name} ${l.note ?? ''}`).join(' '),
    ].join(' ').toLowerCase();
    return state.q.split(/\s+/).every((word) => hay.includes(word));
  }

  function card(item) {
    const kindLabel = KINDS.find(([k]) => k === item.kind)?.[1] ?? item.kind;
    const addBtn = h('button.btn' + (owned.has(item.id) ? '' : '.primary'), {
      style: 'width:100%; margin-top:var(--sp-2)',
      disabled: owned.has(item.id) ? '' : null,
      onclick: (e) => addToDay(item, e.currentTarget),
    }, owned.has(item.id) ? 'Already in your day' : 'Add to my day');

    return h('details.card.lib-item', {},
      h('summary', {},
        h('span.name', {}, item.name),
        h('span.why', {},
          [kindLabel, item.categoryName ?? item.category, item.equipment?.replace(/_/g, ' ')]
            .filter(Boolean).join(' · '),
        ),
      ),
      item.why ? h('p.muted', {}, item.why) : null,
      item.fields
        ? h('div.fields', {},
            Object.keys(FIELD_LABELS)
              .filter((k) => item.fields[k])
              .map((k) => h('div.field-line' + (k === 'careful' ? '.careful' : ''), {},
                h('span.field-label', {}, FIELD_LABELS[k]),
                h('span', {}, item.fields[k]))),
          )
        : null,
      item.levels?.length
        ? h('div', { style: 'margin-top:var(--sp-3)' },
            h('span.field-label', {}, item.kind === 'stretch' ? 'How hard' : 'Where to start'),
            h('div', {}, item.levels.map((l) =>
              h('p.why', {}, `${l.level}. ${l.name}${l.note ? ` — ${l.note}` : ''}`))),
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
