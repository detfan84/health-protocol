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

const CONTEXTS = [
  ['floor', 'On the floor'], ['bed', 'In bed'], ['chair', 'In a chair'],
  ['standing', 'Standing'], ['desk', 'At a desk'], ['travel', 'Travelling'],
];

/**
 * The shelf is a view over one facet, and the facet is a choice (TAXONOMY §8).
 *
 * `effect` is the default because it is the one a person can answer about
 * themselves — tight, weak, wired — where "which of the 2025 app's five source
 * files did this come from" never was.
 *
 * Each slice says how to read its values off an item, so one matcher serves all
 * of them and a new slice is a row here rather than a branch anywhere.
 */
const SLICES = [
  { id: 'effect', label: 'What it does', read: (i) => i.effect ?? [] },
  { id: 'target', label: 'Where in the body', read: (i) => i.target ?? [], rollUp: true },
  { id: 'pattern', label: 'How it moves', read: (i) => i.pattern ?? [] },
  { id: 'equipment', label: 'What you need', read: (i) => i.equipment ?? [] },
  { id: 'context', label: 'Where you are', read: (i) => i.context ?? [] },
  { id: 'type', label: 'Kind of thing', read: (i) => (i.type ? [i.type] : []) },
];
const SLICE_BY_ID = Object.fromEntries(SLICES.map((s) => [s.id, s]));
const PATTERN_LABELS = {
  push: 'Push', pull: 'Pull', squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge',
  carry: 'Carry', rotate: 'Rotate', brace: 'Hold still under load', jump: 'Jump',
  gait: 'Travel', strike: 'Strike',
};
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

  // One slice on show at a time, but every chosen value keeps applying —
  // TAXONOMY §8. Somebody looking for "something for my leg that releases" is
  // asking two facets one after the other, not choosing between them, and the
  // chosen ones stay visible as pills they can take off.
  const state = { q: '', slice: 'effect', filters: { effect: null, type: null, target: null, equipment: null, context: null } };
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

  /**
   * Where else a complaint can come from (TAXONOMY §4).
   *
   * It answers the search box, because that is where somebody types "elbow" —
   * a person arriving with a symptom does not know the app files things by what
   * they do to you. Typing a site name puts this above the results rather than
   * instead of them.
   *
   * Red flags first, always. Then candidates, each with the tell that makes it
   * worth checking and its own grade — the local patterns and the
   * postural-chain guesses must not look alike on the page (law 5).
   */
  function referralFor(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return null;
    return (library.referral ?? []).find((site) =>
      [site.name, ...(site.also ?? [])].some((t) => t.toLowerCase().includes(q) || q.includes(t.toLowerCase())));
  }

  /**
   * What can pull on this region from outside it (Kevin, 29 Aug: "the person
   * looking to stretch or release something in their leg may not realise there
   * is something in their hip, glute or back that is pulling on it").
   *
   * The referral map already knew this and only answered a symptom search, so
   * somebody browsing by body part never met it. Browsing a region is the
   * moment the question arises, and it is the one moment the map was silent.
   *
   * Everything except the `local` candidates, because those are already in the
   * results underneath and repeating them here would bury the point.
   *
   * The first version worked this out geometrically — anything whose source did
   * not roll up into the chosen region — and it dropped the single most useful
   * row in the file. The sciatic nerve sits under `hip` and `leg` in the graph,
   * because that is where it runs, so browsing the leg filtered out "your
   * hamstring may not be a short muscle at all". The map already says which
   * candidates are local; deriving it again from the anatomy was re-answering a
   * question the data had answered better.
   */
  function elsewhereFor(region) {
    if (!region) return [];
    const out = new Map();
    for (const site of library.referral ?? []) {
      if (!(site.at ?? []).some((n) => rollUpOf(n).has(region))) continue;
      for (const c of site.candidates) {
        if (c.kind === 'local') continue;
        const key = c.source.join('+');
        if (!out.has(key)) out.set(key, { ...c, site });
      }
    }
    return [...out.values()];
  }

  function elsewhereCard(region, candidates) {
    const card = h('details.card.referral.elsewhere', { open: true },
      h('summary', {},
        h('span.name', {}, `${labelFor('target', region)} — what can pull on it from elsewhere`),
        h('span.why', {}, 'Worth knowing before you work on the spot itself. Candidates, not causes.'),
      ),
    );
    for (const c of candidates) {
      card.append(h('div.referral-row', {},
        h('p', {},
          h('strong', {}, c.source.map((id) => anatomyIndex.get(id)?.name ?? id).join(', ')),
          ' — for ', c.site.name.toLowerCase(),
          h('span.tier', { dataset: { tier: c.evidence.grade } }, TIER_LABELS[c.evidence.grade] ?? c.evidence.grade)),
        h('p', {}, h('span.field-label', {}, 'The tell'), ' ', c.tell),
        h('div.chip-row', {}, c.then.map((id) => {
          const target = library.items.find((i) => i.id === id);
          return target ? chip(target.name, false, () => { state.q = target.name.toLowerCase(); search.value = target.name; renderFilters(); render(); }) : null;
        }).filter(Boolean)),
      ));
    }
    return card;
  }

  function referralCard(site) {
    const KIND = { local: 'Where it hurts', neural: 'A nerve', referred: 'Referred from', chain: 'Further up the chain' };
    const card = h('details.card.referral', { open: true },
      h('summary', {},
        h('span.name', {}, `${site.name} — where else it can come from`),
        h('span.why', {}, 'Candidates worth checking. Not a diagnosis, and not a list of what you have.'),
      ),
      h('div.field-line.careful', {},
        h('span.field-label', {}, 'Before anything else'),
        h('span', {}, site.redFlags),
      ),
    );
    for (const c of site.candidates) {
      const names = c.source
        .map((id) => anatomyIndex.get(id)?.name ?? id)
        .join(', ');
      card.append(h('div.referral-row', {},
        h('p', {}, h('strong', {}, names), ' — ', KIND[c.kind] ?? c.kind,
          h('span.tier', { dataset: { tier: c.evidence.grade } }, TIER_LABELS[c.evidence.grade] ?? c.evidence.grade)),
        c.why ? h('p.muted', {}, c.why) : null,
        h('p', {}, h('span.field-label', {}, 'The tell'), ' ', c.tell),
        h('p.muted', {}, c.evidence.basis),
        h('div.chip-row', {}, c.then.map((id) => {
          const target = library.items.find((i) => i.id === id);
          if (!target) return null;
          return chip(target.name, false, () => { state.q = target.name.toLowerCase(); search.value = target.name; render(); });
        }).filter(Boolean)),
      ));
    }
    return card;
  }

  /**
   * The chips for one slice: every value with something behind it, largest
   * first, counted against the OTHER filters already chosen.
   *
   * The count is not decoration. A chip with nothing behind it is worse than no
   * chip — the suite has said so since the shelf was sliced by `kind` — and a
   * count computed against the current narrowing is the difference between
   * "there are 81 releases" and "there are 4 releases for your calf".
   */
  function valuesFor(sliceId) {
    const slice = SLICE_BY_ID[sliceId];
    const others = { ...state.filters, [sliceId]: null };
    const counts = new Map();
    for (const item of library.items) {
      if (!matchesFilters(item, others) || !matchesQuery(item)) continue;
      const seen = new Set();
      for (const raw of slice.read(item)) {
        for (const v of slice.rollUp ? rollUpOf(raw) : [raw]) {
          if (seen.has(v)) continue;
          seen.add(v);
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
    }
    let values = [...counts.entries()];
    if (sliceId === 'target') {
      // 136 nodes is not a chip row. The regions gather everything under them,
      // and the search box is there for anybody who wants a named muscle.
      const regions = new Set((library.anatomy ?? []).filter((n) => !n.parents?.length).map((n) => n.id));
      values = values.filter(([v]) => regions.has(v));
    }
    return values
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || labelFor(sliceId, a[0]).localeCompare(labelFor(sliceId, b[0])));
  }

  function labelFor(sliceId, value) {
    if (sliceId === 'effect') return EFFECT_LABELS[value] ?? value;
    if (sliceId === 'equipment') return EQUIPMENT_LABELS[value] ?? value.replace(/-/g, ' ');
    if (sliceId === 'context') return Object.fromEntries(CONTEXTS)[value] ?? value;
    if (sliceId === 'type') return { practice: 'Something to do', measurement: 'Measure yourself', teaching: 'Read about it' }[value] ?? value;
    if (sliceId === 'pattern') return PATTERN_LABELS[value] ?? value;
    if (sliceId === 'target') return anatomyIndex.get(value)?.name ?? value;
    return value;
  }

  const search = h('input', {
    type: 'search',
    id: 'library-search',
    placeholder: 'Search — “hip”, “neck”, “band”, “breath”…',
    'aria-label': 'Search the library',
    // The chip counts are counted against the search too, so they move with it.
    // A chip promising 81 releases while the query has cut the shelf to nine is
    // a number that is true about the wrong thing.
    oninput: (e) => { state.q = e.target.value.trim().toLowerCase(); renderFilters(); render(); },
  });

  const chip = (label, active, onclick) =>
    h('button.phase-chip', { 'aria-pressed': String(active), onclick }, label);

  const filters = h('div');
  function renderFilters() {
    clear(filters);

    // Which question you are asking. Three parallel mechanisms lived here —
    // a chip row for `kind`, a muscle dropdown and an equipment dropdown — and
    // they were three because the facets did not exist yet. One now.
    filters.append(
      h('div.chip-row.slices', { role: 'group', 'aria-label': 'Browse by' },
        h('span.field-label', {}, 'Browse by'),
        SLICES.map((slice) => chip(slice.label, state.slice === slice.id, () => {
          state.slice = slice.id;
          renderFilters();
        })),
      ),
    );

    // What you have already narrowed to, and how to undo it. Chosen values from
    // other facets keep applying while you browse this one, so they have to
    // stay visible — a filter you cannot see is a filter you cannot take off.
    const chosen = Object.entries(state.filters).filter(([, v]) => v);
    if (chosen.length) {
      filters.append(
        h('div.chip-row', { role: 'group', 'aria-label': 'Narrowed to' },
          h('span.field-label', {}, 'Narrowed to'),
          chosen.map(([sliceId, value]) => h('button.chip.on', {
            'aria-label': `Remove ${labelFor(sliceId, value)}`,
            onclick: () => { state.filters[sliceId] = null; renderFilters(); render(); },
          }, `${labelFor(sliceId, value)} ✕`)),
          h('button.chip.quiet', {
            onclick: () => {
              for (const k of Object.keys(state.filters)) state.filters[k] = null;
              renderFilters(); render();
            },
          }, 'Clear all'),
        ),
      );
    }

    const values = valuesFor(state.slice);
    filters.append(
      values.length
        ? h('div.chip-row', { role: 'group', 'aria-label': SLICE_BY_ID[state.slice].label },
            values.map(([value, count]) => chip(
              `${labelFor(state.slice, value)} · ${count}`,
              state.filters[state.slice] === value,
              () => {
                state.filters[state.slice] = state.filters[state.slice] === value ? null : value;
                renderFilters();
                render();
              },
            )),
          )
        // Not an error state: it means the narrowing you already have leaves
        // nothing to choose here, which is worth saying rather than showing a
        // row of chips that all return nothing.
        : h('p.muted', {}, 'Nothing left to choose here with the filters you have on.'),
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
          ...(item.measure ? { measure: item.measure } : {}),
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

  /**
   * Does this item satisfy every chosen facet? Separated from `matches` so the
   * chip counts can ask the same question with one facet held back — which is
   * how a chip knows how many items it would leave rather than how many exist.
   */
  function matchesFilters(item, filters) {
    for (const [sliceId, value] of Object.entries(filters)) {
      if (!value) continue;
      const slice = SLICE_BY_ID[sliceId];
      const values = slice.read(item);
      // An item tagged `glute-med-min` answers "Leg" and "Hip", because the tag
      // implies everything above it (TAXONOMY §3).
      const hit = slice.rollUp
        ? values.some((v) => rollUpOf(v).has(value))
        : values.includes(value);
      if (!hit) return false;
    }
    return true;
  }

  function matchesQuery(item) {
    if (!state.q) return true;
    const hay = [
      item.name,
      (item.equipment ?? []).join(' '),
      item.type, (item.effect ?? []).map((e) => `${e} ${EFFECT_LABELS[e] ?? ''}`).join(' '),
      (item.pattern ?? []).map((v) => `${v} ${PATTERN_LABELS[v] ?? ''}`).join(' '),
      (item.target ?? []).join(' '), item.technique, item.tradition,
      (item.muscles ?? []).join(' '), item.why,
      item.tier, evidenceOf(item.evidence).grade, evidenceOf(item.evidence).basis,
      item.dose, item.sourceNote,
      Object.values(item.fields ?? {}).join(' '),
      (item.levels ?? []).map((l) => `${l.name} ${l.note ?? ''}`).join(' '),
    ].join(' ').toLowerCase();
    return state.q.split(/\s+/).every((word) => hay.includes(word));
  }

  const matches = (item) => matchesFilters(item, state.filters) && matchesQuery(item);

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
            // Labels, not ids — this was printing "none", "pullup-bar" and
            // "balance-board" at people. And `none` is dropped entirely:
            // needing nothing is the default, not a feature worth a line.
            (item.equipment ?? [])
              .filter((e) => e !== 'none')
              .map((e) => EQUIPMENT_LABELS[e] ?? e.replace(/-/g, ' '))
              .join(', ') || null,
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
    // A symptom search gets the map first, then the ordinary results. Above
    // them rather than instead of them: somebody typing "elbow" may want either.
    const site = referralFor(state.q ?? '');
    if (site) results.append(referralCard(site));

    const elsewhere = elsewhereFor(state.filters.target);
    if (elsewhere.length) results.append(elsewhereCard(state.filters.target, elsewhere));

    const found = library.items.filter(matches);
    results.append(
      h('p.muted.result-count', { style: 'margin-top:var(--sp-4)' },
        `${found.length} of ${library.items.length}`),
    );
    if (!found.length) {
      if (site) return; // the map is a real answer, so this is not an empty screen
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
