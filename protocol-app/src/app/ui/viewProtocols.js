// viewProtocols.js — the plans. Multiple protocols may be active at once;
// Today interleaves whatever is switched on here.

import { h, add, clear } from './dom.js';
import * as store from '../store.js';
import { newProtocol, setProtocolFields } from '../editorOps.js';
import { guarded } from './announcer.js';

export async function viewProtocols({ openEditor, reload, back }) {
  const protocols = await store.loadProtocols();
  const root = h('div');
  add(root,
    // Reached from the Home menu rather than a tab, so it carries its own way
    // back — the same shape an area page uses.
    back ? h('button.btn.quiet.small', { onclick: back, 'aria-label': 'Back to the menu' }, '‹ Back') : null,
    h('h1', {}, 'Protocols'),
  );

  if (protocols.length === 0) {
    root.append(
      h('div.card', {},
        h('p.muted', {}, 'No protocols yet. A protocol is your plan: time blocks through the day, the items in them, and — if it helps — phases.'),
      ),
    );
  }

  for (const p of protocols.sort((a, b) => a.name.localeCompare(b.name))) {
    const itemCount = p.blocks.reduce((n, b) => n + b.items.length, 0);
    const parts = [
      `${p.blocks.length} ${p.blocks.length === 1 ? 'block' : 'blocks'}`,
      `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
    ];
    if (p.phases.length) parts.push(`${p.phases.length} phases`);

    const checkboxId = `active-${p.id}`;
    root.append(
      h('div.card', {},
        h('div.card-head', {}, h('h2', {}, p.name || 'Untitled')),
        h('p.muted', {}, parts.join(' · ')),
        p.notes ? h('p.muted', {}, p.notes) : null,
        h('div.field-row', {},
          h('div.row', { style: 'border:none; align-items:center' },
            h('input', {
              type: 'checkbox',
              id: checkboxId,
              checked: p.active === true,
              style: 'width:auto; min-height:auto; width:22px; height:22px',
              onchange: (e) => {
                const want = e.target.checked;
                guarded(
                  () => store.saveProtocol(setProtocolFields(p, { active: want })),
                  {
                    what: `Turning ${p.name || 'this protocol'} ${want ? 'on' : 'off'}`,
                    onOk: (saved) => Object.assign(p, saved),
                    // The box may only show what persisted — snap back on failure.
                    onFail: () => { e.target.checked = p.active === true; },
                  },
                );
              },
            }),
            h('label', { for: checkboxId, style: 'margin:0 0 0 8px; font-size:var(--fs-base); color:var(--ink)' },
              'Active — shows on Today'),
          ),
          h('button.btn', { onclick: () => openEditor(p.id), 'aria-label': `Edit ${p.name || 'untitled protocol'}` }, 'Edit'),
        ),
      ),
    );
  }

  /* --------------------------- import a file -------------------------- */
  const importResults = h('pre.tech', { 'aria-live': 'polite' });
  const fileInput = h('input', {
    type: 'file',
    id: 'protocol-file',
    accept: 'application/json,.json',
    onchange: (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      clear(importResults);
      guarded(
        async () => store.importFile(await file.text()),
        {
          what: 'The import',
          detail:
            'The import stopped before finishing. It writes in one storage transaction, so nothing was partly applied — this device is exactly as it was.',
          onOk: (res) => {
            if (res.ok) {
              importResults.textContent = 'Imported. Nothing was deleted — an import only ever adds or updates.';
              reload?.();
            } else {
              importResults.textContent = ["That file couldn't be imported. Nothing on this device changed."]
                .concat(res.errors.map((x) => `• ${x.path}: ${x.message}${x.hint ? ` — ${x.hint}` : ''}`))
                .join('\n');
            }
            e.target.value = '';
          },
          onFail: () => {
            importResults.textContent = 'The import stopped before finishing. Nothing on this device changed.';
            e.target.value = '';
          },
        },
      );
    },
  });
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Bring in a protocol')),
      h('p.muted', {},
        'Open a protocol or backup file you have been given, or one you exported from another device. Importing merges: where both sides have a record the newer one wins, and nothing is ever deleted.'),
      h('label', { for: 'protocol-file', class: 'visually-hidden' }, 'Choose a protocol or backup file'),
      fileInput,
      importResults,
    ),
  );

  root.append(
    h('button.btn.primary', {
      style: 'width:100%',
      onclick: () =>
        guarded(() => store.saveProtocol(newProtocol('New protocol')), {
          what: 'Creating the new protocol',
          onOk: (p) => openEditor(p.id), // open only a protocol that exists
        }),
    }, 'New protocol'),
  );

  return root;
}
