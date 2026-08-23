// viewSupply.js — what you have on hand, in your own numbers.
// Counts live in the settings store (see trackerOps.js for why) and are
// entirely manual: the app displays what you told it, and nothing else.

import { h } from './dom.js';
import * as store from '../store.js';
import { makeSupply } from '../trackerOps.js';
import { guarded } from './announcer.js';

export async function viewSupply({ back } = {}) {
  const [protocols, supplies] = await Promise.all([store.loadProtocols(), store.loadSupplies()]);
  const root = h('div');
  root.append(
    // Reached from the Home menu rather than a tab, so it carries its own way
    // back — the same shape an area page uses.
    back ? h('button.btn.quiet.small', { onclick: back, 'aria-label': 'Back to the menu' }, '‹ Back') : null,
    h('h1', {}, 'Supply'),
    h('p.muted', {}, 'What you have on hand, in your own numbers. Leave a count blank for anything you\'d rather not track.'),
  );

  const seen = new Set();
  const ordered = [...protocols].sort((a, b) => (b.active === true) - (a.active === true));

  for (const p of ordered) {
    const items = p.blocks.flatMap((b) => b.items).filter((it) => !seen.has(it.id));
    if (items.length === 0) continue;
    const card = h('div.card', {}, h('div.card-head', {}, h('h2', {}, p.name)));
    for (const it of items) {
      seen.add(it.id);
      const rec = supplies[it.id];
      // Failed saves leave the field exactly as typed (nothing is reverted or
      // cleared) and announce with Retry; the note field also offers Copy.
      const save = (patch, copyText) =>
        guarded(
          async () => {
            const existing = await store.loadSupply(it.id);
            return store.putSetting(makeSupply(it.id, { name: it.name, ...patch }, existing));
          },
          { what: `The supply update for ${it.name}`, copyText },
        );
      const noteInput = h('input', {
        type: 'text', id: `sup-n-${it.id}`,
        value: rec?.note ?? '', placeholder: 'Note',
        onchange: () => save({ note: noteInput.value }, () => noteInput.value),
      });
      card.append(
        h('div.row', {},
          h('div.grow', {},
            h('span.name', {}, it.name),
            it.dose ? h('span.why', {}, it.dose) : null,
          ),
          h('div', { style: 'width:90px' },
            h('label', { for: `sup-c-${it.id}`, class: 'visually-hidden' }, `Count on hand for ${it.name}`),
            h('input', {
              type: 'number', min: '0', id: `sup-c-${it.id}`,
              value: rec?.count ?? '', placeholder: 'Count',
              onchange: (e) => save({ count: e.target.value }),
            }),
          ),
          h('div', { style: 'width:130px' },
            h('label', { for: `sup-n-${it.id}`, class: 'visually-hidden' }, `Supply note for ${it.name}`),
            noteInput,
          ),
        ),
      );
    }
    root.append(card);
  }

  if (seen.size === 0) {
    root.append(h('div.card', {}, h('p.muted', {}, 'Items from your protocols will appear here once a protocol has some.')));
  }

  return root;
}
