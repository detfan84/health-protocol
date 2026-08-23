// viewEditor.js — the protocol editor. Edits a working copy in memory;
// nothing touches storage until Save. Text fields write straight into the
// working copy as you type (no re-render, no lost focus); structural changes
// (add / remove / reorder / phase tags) re-render the editor.
//
// Plan/record separation, at the screen level: this view imports nothing
// day-record-related — it cannot rewrite history even by accident.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { cadenceOf, cadenceLabel } from '../../lib/cadence.js';
import {
  setProtocolFields,
  addPhase, updatePhase, removePhase, movePhase,
  addBlock, updateBlock, removeBlock, moveBlock,
  addItem, updateItem, removeItem, moveItem, toggleItemPhase,
} from '../editorOps.js';

export async function viewEditor({ protocolId, done }) {
  let working = await store.loadProtocol(protocolId);
  if (!working) {
    return h('div', {}, h('h1', {}, 'Not found'), h('button.btn', { onclick: done }, 'Back'));
  }
  let dirty = false;
  const apply = (next) => { working = next; dirty = true; };

  const root = h('div');
  const body = h('div');

  function field(labelText, input) {
    return h('div.field', {}, h('label', {}, labelText), input);
  }

  function render() {
    clear(body);

    /* ----------------------------- basics ---------------------------- */
    body.append(
      field('Name', h('input', {
        type: 'text', value: working.name,
        oninput: (e) => apply(setProtocolFields(working, { name: e.target.value })),
      })),
      field('Notes', h('input', {
        type: 'text', value: working.notes ?? '', placeholder: 'Optional',
        oninput: (e) => apply(setProtocolFields(working, { notes: e.target.value })),
      })),
    );

    /* ----------------------------- phases ----------------------------- */
    const phasesCard = h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Phases')),
      h('p.muted', {}, 'Optional. Phases let one plan change over time; items can belong to some phases and not others.'),
    );
    const sortedPhases = [...working.phases].sort((a, b) => a.order - b.order);
    for (const ph of sortedPhases) {
      phasesCard.append(
        h('div.editor-item', {},
          h('div.field-row', {},
            h('div', { style: 'flex:2' }, field('Phase name', h('input', {
              type: 'text', value: ph.name,
              oninput: (e) => apply(updatePhase(working, ph.id, { name: e.target.value })),
            }))),
            h('div', {}, field('Days (optional)', h('input', {
              type: 'number', min: '1', value: ph.days ?? '', placeholder: 'Open',
              oninput: (e) => apply(updatePhase(working, ph.id, { days: e.target.value })),
            }))),
          ),
          h('div.reorder', {},
            h('button.btn.small', { 'aria-label': `Move phase ${ph.name} up`, onclick: () => { apply(movePhase(working, ph.id, -1)); render(); } }, '↑'),
            h('button.btn.small', { 'aria-label': `Move phase ${ph.name} down`, onclick: () => { apply(movePhase(working, ph.id, +1)); render(); } }, '↓'),
            h('button.btn.small.danger', {
              'aria-label': `Remove phase ${ph.name}`,
              onclick: () => {
                apply(removePhase(working, ph.id));
                render();
              },
            }, 'Remove'),
          ),
        ),
      );
    }
    phasesCard.append(h('button.btn', { onclick: () => { apply(addPhase(working)); render(); } }, 'Add phase'));
    body.append(phasesCard);

    /* ----------------------------- blocks ----------------------------- */
    const sortedBlocks = [...working.blocks].sort((a, b) => a.order - b.order);
    for (const b of sortedBlocks) {
      const card = h('div.editor-block', {},
        h('div.field-row', {},
          h('div', { style: 'flex:2' }, field('Block name', h('input', {
            type: 'text', value: b.name,
            oninput: (e) => apply(updateBlock(working, b.id, { name: e.target.value })),
          }))),
          h('div', {}, field('Starts', h('input', {
            type: 'time', value: b.start ?? '',
            oninput: (e) => apply(updateBlock(working, b.id, { start: e.target.value })),
          }))),
          h('div', {}, field('Ends', h('input', {
            type: 'time', value: b.end ?? '',
            oninput: (e) => apply(updateBlock(working, b.id, { end: e.target.value })),
          }))),
        ),
        h('p.muted', {}, 'Times are optional. A block with no end runs until the next one begins.'),
      );

      for (const it of b.items) {
        const chips = working.phases.length
          ? h('div.field', {},
              h('label', {}, 'Phases this item belongs to (none selected = every phase)'),
              h('div.chip-row', {},
                [...working.phases].sort((x, y) => x.order - y.order).map((ph) =>
                  h('button.phase-chip', {
                    'aria-pressed': String(Boolean(it.phaseIds?.includes(ph.id))),
                    'aria-label': `${it.name} in phase ${ph.name}`,
                    onclick: () => { apply(toggleItemPhase(working, b.id, it.id, ph.id)); render(); },
                  }, ph.name),
                ),
              ),
            )
          : null;

        card.append(
          h('div.editor-item', {},
            h('div.field-row', {},
              h('div', { style: 'flex:2' }, field('Item', h('input', {
                type: 'text', value: it.name,
                oninput: (e) => apply(updateItem(working, b.id, it.id, { name: e.target.value })),
              }))),
              h('div', {}, field('Dose (optional)', h('input', {
                type: 'text', value: it.dose ?? '',
                oninput: (e) => apply(updateItem(working, b.id, it.id, { dose: e.target.value })),
              }))),
            ),
            field('Why — one line; it rides with the item on Today', h('input', {
              type: 'text', value: it.why ?? '', placeholder: 'What this piece is pushing on',
              oninput: (e) => apply(updateItem(working, b.id, it.id, { why: e.target.value })),
            })),
            // How often, as something the app can act on rather than prose
            // inside a dose string. Daily is the default and says nothing.
            field('How often', h('div.field-row', {},
              h('select', {
                'aria-label': `How often for ${it.name}`,
                onchange: (e) => {
                  const kind = e.target.value;
                  const n = kind === 'timesPerWeek' ? 3 : kind === 'everyNDays' ? 2 : undefined;
                  apply(updateItem(working, b.id, it.id, { cadence: { kind, n: cadenceOf(it).n ?? n } }));
                  render();
                },
              },
                [
                  ['daily', 'Every day'],
                  ['timesPerWeek', 'Some days a week'],
                  ['everyNDays', 'Every so many days'],
                  ['asNeeded', 'When needed'],
                ].map(([value, label]) =>
                  h('option', { value, selected: cadenceOf(it).kind === value }, label),
                ),
              ),
              ['timesPerWeek', 'everyNDays'].includes(cadenceOf(it).kind)
                ? h('input', {
                    type: 'number', min: '1', max: cadenceOf(it).kind === 'timesPerWeek' ? '7' : '365',
                    value: String(cadenceOf(it).n ?? ''),
                    style: 'max-width:6rem',
                    'aria-label': cadenceOf(it).kind === 'timesPerWeek'
                      ? `Days a week for ${it.name}`
                      : `Days between for ${it.name}`,
                    oninput: (e) => apply(updateItem(working, b.id, it.id, {
                      cadence: { kind: cadenceOf(it).kind, n: Number(e.target.value) },
                    })),
                  })
                : null,
              h('span.why', { style: 'align-self:center' }, cadenceLabel(cadenceOf(it))),
            )),
            // A textarea, not an input: notes are the how-to — several
            // paragraphs, including the "never take this without food" lines.
            // A text input silently strips every newline the moment the field
            // is written, so opening an item to fix a dose used to flatten its
            // instructions permanently. Records outlive plans; instructions
            // have to survive an edit.
            field('Notes (optional) — the how-to, as many paragraphs as it takes', h('textarea', {
              rows: '4', value: it.notes ?? '',
              oninput: (e) => apply(updateItem(working, b.id, it.id, { notes: e.target.value })),
            })),
            chips,
            h('div.reorder', {},
              h('button.btn.small', { 'aria-label': `Move ${it.name} up`, onclick: () => { apply(moveItem(working, b.id, it.id, -1)); render(); } }, '↑'),
              h('button.btn.small', { 'aria-label': `Move ${it.name} down`, onclick: () => { apply(moveItem(working, b.id, it.id, +1)); render(); } }, '↓'),
              h('button.btn.small.danger', {
                'aria-label': `Remove ${it.name} from the plan`,
                onclick: () => {
                  // Plan only: check-offs already recorded against this item
                  // stay in the day records. Editing the plan never rewrites
                  // what happened.
                  apply(removeItem(working, b.id, it.id));
                  render();
                },
              }, 'Remove'),
            ),
          ),
        );
      }

      card.append(
        h('div.field-row', { style: 'margin-top:var(--sp-3)' },
          h('button.btn', { onclick: () => { apply(addItem(working, b.id)); render(); } }, 'Add item'),
          h('button.btn.small', { 'aria-label': `Move block ${b.name} up`, onclick: () => { apply(moveBlock(working, b.id, -1)); render(); } }, '↑'),
          h('button.btn.small', { 'aria-label': `Move block ${b.name} down`, onclick: () => { apply(moveBlock(working, b.id, +1)); render(); } }, '↓'),
          h('button.btn.small.danger', {
            'aria-label': `Remove block ${b.name}`,
            onclick: () => {
              if (b.items.length === 0 || confirm(`Remove the block "${b.name}" and its ${b.items.length} item(s) from the plan? Day records are not touched.`)) {
                apply(removeBlock(working, b.id));
                render();
              }
            },
          }, 'Remove block'),
        ),
      );
      body.append(card);
    }

    body.append(h('button.btn', { onclick: () => { apply(addBlock(working)); render(); } }, 'Add time block'));

    /* --------------------------- delete plan --------------------------- */
    body.append(
      h('div.card', { style: 'margin-top:var(--sp-5)' },
        h('p.muted', {}, 'Deleting a protocol removes the plan only. Every check-off ever recorded against its items stays in your day records.'),
        h('button.btn.danger', {
          onclick: async () => {
            if (confirm(`Delete the protocol "${working.name}"? The plan is removed; your day records stay.`)) {
              await store.deleteProtocol(working.id);
              done();
            }
          },
        }, 'Delete this protocol'),
      ),
    );
  }

  render();

  root.append(
    h('button.btn.quiet', {
      onclick: () => {
        if (!dirty || confirm('Leave without saving? Changes since your last save will be lost.')) done();
      },
    }, '← Back'),
    h('h1', {}, 'Edit protocol'),
    body,
    h('div.savebar', {},
      h('button.btn.primary', {
        onclick: () =>
          // On failure the editor stays open with the working copy intact —
          // nothing typed is lost, and Save (or the card's Retry) runs the
          // same real write again (ruling B, point 2).
          guarded(() => store.saveProtocol(working), {
            what: `Saving \"${working.name || 'this protocol'}\"`,
            onOk: () => { dirty = false; done(); },
          }),
      }, 'Save'),
    ),
  );
  return root;
}
