// viewProtocols.js — the plans. Multiple protocols may be active at once;
// Today interleaves whatever is switched on here.

import { h } from './dom.js';
import * as store from '../store.js';
import { newProtocol, setProtocolFields } from '../editorOps.js';
import { guarded } from './announcer.js';
import { hasBundled, loadBundledProtocol } from '../bundledProtocol.js';

export async function viewProtocols({ openEditor, reload }) {
  const protocols = await store.loadProtocols();
  const root = h('div');
  root.append(h('h1', {}, 'Protocols'));

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

  // Offered until it is here. Once loaded, this card gets out of the way.
  if (!hasBundled(protocols)) {
    root.append(
      h('div.card', {},
        h('div.card-head', {}, h('h2', {}, 'Your content from the old app')),
        h('p.muted', {},
          'Nine protocols: 65 supplements with doses, reasoning and phase timing; body work, breathing and airway drills; morning and evening stretching; and six workout routines. Everything except the supplements arrives switched off. Loading adds and removes nothing.'),
        h('button.btn', {
          style: 'width:100%',
          onclick: () =>
            guarded(loadBundledProtocol, {
              what: 'Loading your supplement protocol',
              onOk: () => reload?.(),
            }),
        }, 'Bring it in'),
      ),
    );
  }

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
