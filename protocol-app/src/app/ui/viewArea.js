// viewArea.js — one area, one page.
//
// An area is a protocol: the day arc, the body-work library, a strength
// routine, your own picks. Its page lists that area's PARTS — the blocks —
// each as something you can start, with its items folded underneath for when
// you would rather do it yourself.
//
// This is the middle of the three screens the app now has: menu → area →
// session. Nothing on this page is a mile long, because a page only ever
// holds one area.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { icon } from './icons.js';
import { lookFor, minutes } from './viewHome.js';
import { localDateKey } from '../../lib/core.js';
import { cadenceOf, cadenceLabel } from '../../lib/cadence.js';

export async function viewArea({ areaId, back, startSession, openEditor }) {
  const [protocols, day] = await Promise.all([store.loadProtocols(), store.loadDay(localDateKey())]);
  const p = protocols.find((x) => x.id === areaId);

  const root = h('div');
  if (!p) {
    root.append(
      h('div.card', {}, h('h1', {}, 'Not here any more'), h('button.btn', { onclick: back }, 'Back')),
    );
    return root;
  }

  const look = lookFor(p);
  root.append(
    h('div.area-head', { dataset: { accent: look.accent } },
      h('button.btn.quiet.small', { onclick: back, 'aria-label': 'Back to the menu' }, '‹ Back'),
      h('div.area-title', {},
        h('span.tile-icon', {}, icon(look.icon, { size: 28 })),
        h('h1', {}, p.name),
      ),
      p.notes ? h('p.muted', {}, p.notes) : (look.blurb ? h('p.muted', {}, look.blurb) : null),
    ),
  );

  /* ------------------------- on or off the day -------------------------- */
  if (p.active !== true) {
    root.append(
      h('div.card', {},
        h('p.muted', {}, 'This is not on your day right now. Turning it on puts its parts back on Today.'),
        h('button.btn.primary', {
          style: 'width:100%',
          onclick: (e) => {
            e.currentTarget.disabled = true;
            guarded(() => store.saveProtocol({ ...p, active: true }), {
              what: `Turning on ${p.name}`,
              onOk: () => back(),
              onFail: () => { e.currentTarget.disabled = false; },
            });
          },
        }, 'Put this on my day'),
      ),
    );
  }

  /* -------------------------------- parts -------------------------------- */
  const blocks = [...(p.blocks ?? [])].sort((a, b) => a.order - b.order);
  for (const b of blocks) {
    if (!b.items.length) continue;
    const doneCount = b.items.filter((it) => day.checks[it.id]).length;
    const list = h('div');
    for (const it of b.items) {
      const c = cadenceOf(it);
      list.append(
        h('div.row.compact', {},
          h('div.grow', {},
            h('span.name', {},
              it.name,
              it.dose ? h('span.dose', {}, ` · ${it.dose}`) : null,
              c.kind === 'daily' ? null : h('span.chip.cadence', {}, cadenceLabel(c)),
              day.checks[it.id] ? h('span.chip', {}, 'done today') : null,
            ),
            it.why ? h('span.why', {}, it.why) : null,
          ),
        ),
      );
    }

    root.append(
      h('section.card', {},
        h('div.card-head', {},
          h('h2', {}, b.name),
          b.start ? h('span.chip', {}, b.end ? `${b.start}–${b.end}` : `from ${b.start}`) : null,
        ),
        h('p.muted', {}, `${b.items.length} ${b.items.length === 1 ? 'thing' : 'things'} · about ${minutes(b)} min${doneCount ? ` · ${doneCount} done today` : ''}`),
        h('button.btn.primary', {
          style: 'width:100%',
          onclick: () => startSession(p.id, b.id),
        }, doneCount === b.items.length ? 'Run it again' : 'Start'),
        h('details.notes', {},
          h('summary', {}, 'What is in it'),
          list,
        ),
      ),
    );
  }

  root.append(
    h('div.card', {},
      h('p.muted', {}, 'Everything here is yours to change — reorder it, retime it, remove what does not apply.'),
      h('button.btn', { style: 'width:100%', onclick: () => openEditor(p.id) }, `Edit ${p.name}`),
    ),
  );

  return root;
}
