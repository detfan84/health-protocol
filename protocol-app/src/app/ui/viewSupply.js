// viewSupply.js — what you have on hand, and what one dose takes out of it.
//
// Counts and dose configs live in the settings store (see trackerOps.js for
// why), and every field is optional. Blank is not zero: an item with no count
// is one you are not keeping a number for, which is a different thing from one
// you have run out of (ruling A).
//
// Two things this screen learned in the Q3 build:
//
//   - Decision 22's dose model. Units per dose, what a unit is called, how
//     strong one is. Set units per dose against a count and check-offs start
//     decrementing on their own; leave it blank and nothing moves.
//   - Only list what is actually being tracked. It used to list every item in
//     every protocol, so a person opening it met thirty-three body-work cards
//     with "Count" boxes beside them — a screen about supplements asking how
//     many calf stretches you have left. Everything is still reachable, folded
//     under "Start tracking something else".

import { h, add } from './dom.js';
import * as store from '../store.js';
import { makeSupply, isTracked, doseUnits, supplyKey } from '../trackerOps.js';
import { guarded } from './announcer.js';

/** One item's row of fields. Shared by the tracked list and the add list. */
function supplyRow(item, initial) {
  // The row keeps its own copy so the "what this will do" line underneath can
  // be refreshed in place. Redrawing the whole screen on every blur would take
  // the scroll position and any open section with it.
  let rec = initial;
  const save = (patch, copyText) =>
    guarded(
      // One transaction, not load-then-save: three fields edited in quick
      // succession would otherwise all read the same pre-edit record and the
      // last one would win, quietly throwing the other two away.
      () => store.mutateSetting(supplyKey(item.id), (existing) =>
        makeSupply(item.id, { name: item.name, ...patch }, existing)),
      {
        what: `The supply update for ${item.name}`,
        copyText,
        onOk: (next) => { rec = next; refresh(); },
      },
    );

  const field = (label, attrs, patchKey, { width = '92px' } = {}) => {
    const id = `sup-${patchKey}-${item.id}`;
    const input = h('input', {
      id,
      ...attrs,
      onchange: () => save({ [patchKey]: input.value }, () => input.value),
    });
    return h('div', { style: `width:${width}` },
      h('label', { for: id, class: 'visually-hidden' }, `${label} for ${item.name}`),
      input,
    );
  };

  // Say plainly whether anything is going to move, because a setting that
  // silently does nothing is the failure this whole app is built against.
  const summary = h('p.why', {});
  function refresh() {
    const perDose = doseUnits(rec);
    const unit = rec?.unitName || 'units';
    summary.textContent = perDose !== null
      ? `Checking this off takes ${perDose} ${unit} off the count. Un-checking puts them back.`
      : Number.isFinite(rec?.count)
        ? 'Counting by hand. Set units per dose and check-offs will do it for you.'
        : 'Not tracking a number for this yet.';
  }
  refresh();

  return h('div.supply-item', {},
    h('div.row', {},
      h('div.grow', {},
        h('span.name', {}, item.name),
        item.dose ? h('span.why', {}, item.dose) : null,
      ),
      field('Count on hand', {
        type: 'number', min: '0', inputmode: 'numeric',
        value: rec?.count ?? '', placeholder: 'On hand',
      }, 'count'),
      field('Units per dose', {
        type: 'number', min: '1', inputmode: 'numeric',
        value: rec?.unitsPerDose ?? '', placeholder: 'Per dose',
      }, 'unitsPerDose'),
    ),
    h('div.row.compact', {},
      field('Unit name', {
        type: 'text', value: rec?.unitName ?? '', placeholder: 'capsules',
      }, 'unitName', { width: '120px' }),
      field('Unit strength', {
        type: 'text', value: rec?.unitStrength ?? '', placeholder: '400 mg',
      }, 'unitStrength', { width: '120px' }),
      field('Note', {
        type: 'text', value: rec?.note ?? '', placeholder: 'Note',
      }, 'note', { width: '150px' }),
    ),
    summary,
  );
}

export async function viewSupply({ back } = {}) {
  const [protocols, supplies] = await Promise.all([store.loadProtocols(), store.loadSupplies()]);
  const root = h('div');
  add(root,
    // Reached from the Home menu rather than a tab, so it carries its own way
    // back — the same shape an area page uses.
    back ? h('button.btn.quiet.small', { onclick: back, 'aria-label': 'Back to the menu' }, '‹ Back') : null,
    h('h1', {}, 'Supply'),
    h('p.muted', {}, 'What you have on hand, in your own numbers. Set how many units one dose takes and the app will keep the count for you — check off, it goes down; un-check, it comes back. Run out and it simply stops asking, which is information and nothing more.'),
  );

  // Every item in the app, once, in protocol order — active plans first.
  const seen = new Set();
  const all = [];
  for (const p of [...protocols].sort((a, b) => (b.active === true) - (a.active === true))) {
    for (const it of p.blocks.flatMap((b) => b.items)) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      all.push({ item: it, protocol: p });
    }
  }

  const tracked = all.filter(({ item }) => isTracked(supplies[item.id]));
  const rest = all.filter(({ item }) => !isTracked(supplies[item.id]));

  /* ------------------------- what you are tracking ---------------------- */
  if (tracked.length) {
    const card = h('div.card', {}, h('div.card-head', {}, h('h2', {}, 'What you are tracking')));
    for (const { item } of tracked) card.append(supplyRow(item, supplies[item.id]));
    root.append(card);
  } else if (seen.size) {
    root.append(h('div.card', {},
      h('p.muted', {}, 'Nothing tracked yet. Open the list below and put a count against anything you want the app to keep an eye on — supplements, tea, whatever runs out.')));
  }

  /* ---------------------- start tracking something else ------------------ */
  if (rest.length) {
    const byProtocol = new Map();
    for (const row of rest) {
      if (!byProtocol.has(row.protocol.id)) byProtocol.set(row.protocol.id, { p: row.protocol, items: [] });
      byProtocol.get(row.protocol.id).items.push(row.item);
    }
    const host = h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Start tracking something else')),
      h('p.muted', {}, 'Everything in your plans, by area. Most of it will never need a count — put one against the things that run out.'),
    );
    for (const { p, items } of byProtocol.values()) {
      const list = h('div');
      for (const it of items) list.append(supplyRow(it, supplies[it.id]));
      host.append(h('details.notes', {}, h('summary', {}, `${p.name} · ${items.length}`), list));
    }
    root.append(host);
  }

  if (seen.size === 0) {
    root.append(h('div.card', {}, h('p.muted', {}, 'Items from your protocols will appear here once a protocol has some.')));
  }

  return root;
}
