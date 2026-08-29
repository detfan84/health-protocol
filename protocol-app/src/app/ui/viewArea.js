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
import { lookFor, lengthLabel } from './viewHome.js';
import { localDateKey, displayTime, timeFormatOf } from '../../lib/core.js';
import { cadenceOf, cadenceLabel } from '../../lib/cadence.js';

export async function viewArea({ areaId, back, startSession, openEditor }) {
  // `history` is here for one reason: the length a block reads as. Home now
  // tells a block in a person's own recorded times where it has them, and the
  // same block on this page saying a different number would be worse than
  // neither screen saying one.
  const [protocols, day, history] = await Promise.all([
    store.loadProtocols(),
    store.loadDay(localDateKey()),
    store.loadRecentDays(localDateKey()),
  ]);
  const fmt = timeFormatOf(await store.getSetting('ui.timeFormat'));
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
          b.start
            ? h('span.chip', {}, b.end
                ? `${displayTime(b.start, fmt)}–${displayTime(b.end, fmt)}`
                : `from ${displayTime(b.start, fmt)}`)
            : null,
        ),
        h('p.muted', {}, `${lengthLabel(b, history)}${doneCount ? ` · ${doneCount} done today` : ''}`),
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

  // The inverse of "Put this on my day". Without it the only way off the day
  // was the Plans screen, and for one commit there was no Plans screen — so an
  // area page could switch a protocol on and never off again.
  const offCard = p.active === true
    ? h('div.card', {},
        h('p.muted', {}, 'Taking this off your day hides its parts from Today. Nothing is deleted and nothing you have recorded changes — it moves into "Your plans" on the menu, and goes back whenever you want it.'),
        h('button.btn.quiet', {
          style: 'width:100%',
          onclick: (e) => {
            e.currentTarget.disabled = true;
            guarded(() => store.saveProtocol({ ...p, active: false }), {
              what: `Taking ${p.name} off your day`,
              onOk: () => back(),
              onFail: () => { e.currentTarget.disabled = false; },
            });
          },
        }, 'Take this off my day'),
      )
    : null;

  root.append(
    h('div.card', {},
      h('p.muted', {}, 'Everything here is yours to change — reorder it, retime it, remove what does not apply.'),
      h('button.btn', { style: 'width:100%', onclick: () => openEditor(p.id) }, `Edit ${p.name}`),
    ),
    offCard,
  );

  return root;
}
