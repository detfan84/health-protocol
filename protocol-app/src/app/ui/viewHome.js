// viewHome.js — the front door: a menu, not a list.
//
// What this replaces, and why (Kevin, 23 Aug): "I don't like how it's all in
// one big list... every block is on the same page. Why can't we do different
// pages for different blocks?" He is right. Everything the app knows was
// arriving on one screen at once, which is not a design — it is an absence of
// one. A person opening this wants three things, in this order:
//
//   1. What am I doing right now?          → one card, with Start on it
//   2. My day                              → the anchors, as places to go
//   3. What else can I work on?            → areas, each its own page
//
// Nothing here is a list of items. Items live inside a session or inside an
// area page. The front door holds destinations.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { icon } from './icons.js';
import { buildToday } from '../todayModel.js';
import { localDateKey, displayTime, timeFormatOf } from '../../lib/core.js';
import { lengthOf, lengthText } from '../../lib/durations.js';

/**
 * How a protocol presents itself on the menu. Seeded protocols get a look;
 * anything a person makes gets a sensible default rather than nothing.
 */
const LOOK = {
  'seed-day-arc': { icon: 'sunrise', accent: 'dawn', blurb: 'Four anchors. Each has a sixty-second floor.' },
  'seed-daily-flow': { icon: 'walk', accent: 'sage', blurb: 'Ten minutes, morning and evening.' },
  'seed-body-work': { icon: 'hands', accent: 'clay', blurb: 'Release, then load it so the range holds.' },
  'seed-support': { icon: 'breath', accent: 'sky', blurb: 'Movement, drainage, downregulation.' },
  'my-picks': { icon: 'list', accent: 'plum', blurb: 'What you chose from the library.' },
};
const ROUTINE_LOOK = { icon: 'strength', accent: 'ochre', blurb: 'Switch it on for the day you are doing it.' };
const DEFAULT_LOOK = { icon: 'list', accent: 'sage', blurb: '' };

function lookFor(p) {
  if (LOOK[p.id]) return LOOK[p.id];
  if (p.id.startsWith('seed-routine-')) return ROUTINE_LOOK;
  return DEFAULT_LOOK;
}

function tile({ title, sub, iconName, accent, onclick, wide = false }) {
  return h('button.tile' + (wide ? '.tile-wide' : ''), {
    dataset: { accent: accent ?? 'sage' },
    onclick,
  },
    h('span.tile-icon', {}, icon(iconName ?? 'list')),
    h('span.tile-body', {},
      h('span.tile-title', {}, title),
      sub ? h('span.tile-sub', {}, sub) : null,
    ),
  );
}

// How long a block reads as. This used to be
//   block.items.reduce((n, it) => n + (it.amount?.seconds ?? 60), 0)
// — a minute invented for every item with no duration, summed, and shown to a
// person as though the app knew. Most of the day carries no clock at all, so
// most of that number was fabricated. Canon 3.7: no uncertainty was
// experienced while writing it, which is exactly how a made-up number gets
// mistaken for a known one.
//
// It says what it knows and counts what it does not.
const lengthLabel = (block) => lengthText(lengthOf(block.items));

export async function viewHome({ open, startSession }) {
  const date = localDateKey();
  const [protocols, day] = await Promise.all([store.loadProtocols(), store.loadDay(date)]);
  const fmt = timeFormatOf(await store.getSetting('ui.timeFormat'));
  const today = buildToday({ protocols, now: new Date(), day });

  const root = h('div.home', {});
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Late night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  root.append(
    h('div.home-head', {},
      h('h1', {}, greeting),
      h('p.muted', {}, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })),
    ),
  );

  /* ------------------------------ right now ----------------------------- */
  // One card, and it is the reason to open the app at all.
  const nowBlocks = today.groups.now;
  if (nowBlocks.length) {
    const b = nowBlocks[0];
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'Right now'),
        h('div.card.now-card', {},
          h('h3', {}, b.name),
          h('p.muted', {}, `${b.items.length} left · ${lengthLabel(b)}`),
          h('button.btn.primary', {
            style: 'width:100%',
            onclick: () => startSession(b.protocolId, b.blockId),
          }, 'Start'),
        ),
      ),
    );
  } else {
    const nextUp = today.groups.later[0];
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'Right now'),
        h('div.card', {},
          h('p.muted', {},
            nextUp
              ? `Nothing scheduled this minute. Next is ${nextUp.name}${nextUp.start ? ` at ${displayTime(nextUp.start, fmt)}` : ''}.`
              : 'Nothing scheduled this minute. Pick anything below — it all counts.'),
        ),
      ),
    );
  }

  /* -------------------------------- areas -------------------------------- */
  // One tile per protocol, because a protocol IS an area: the day arc's four
  // anchors, the body-work sections, a strength routine. Tapping opens that
  // area's own page rather than dumping its items here.
  const active = protocols.filter((p) => p.active === true);
  const inactive = protocols.filter((p) => p.active !== true);

  if (active.length) {
    const grid = h('div.tiles', {});
    for (const p of active) {
      const look = lookFor(p);
      const count = p.blocks.reduce((n, b) => n + b.items.length, 0);
      grid.append(tile({
        title: p.name,
        sub: `${p.blocks.length} ${p.blocks.length === 1 ? 'part' : 'parts'} · ${count} things`,
        iconName: look.icon,
        accent: look.accent,
        onclick: () => open({ area: p.id }),
      }));
    }
    root.append(h('section', {}, h('h2.section-title', {}, 'Your day'), grid));
  }

  /* -------------------------------- more --------------------------------- */
  // Supply and Plans live here rather than in the tab bar. They were tabs
  // until the menu → area → session redesign, which dropped them without a
  // replacement: for one commit there was no way to reach a supply count, no
  // way to make a protocol, and no way to switch one off — while Today went on
  // telling anybody who ran out to "restock it on the Supply screen".
  const more = h('div.tiles', {});
  more.append(
    tile({ title: 'Library', sub: 'Everything the app can teach', iconName: 'library', accent: 'plum', onclick: () => open({ tab: 'library' }) }),
    tile({ title: 'Reference', sub: 'Food, spacing, symptoms', iconName: 'book', accent: 'ochre', onclick: () => open({ tab: 'reference' }) }),
    tile({ title: 'Track', sub: 'Journal, food, water', iconName: 'pencil', accent: 'sky', onclick: () => open({ tab: 'track' }) }),
    tile({ title: 'Supply', sub: 'What you have on hand', iconName: 'bottle', accent: 'clay', onclick: () => open({ tab: 'supply' }) }),
    tile({ title: 'Plans', sub: 'Make one, rename it, switch it on or off', iconName: 'plan', accent: 'dawn', onclick: () => open({ tab: 'plans' }) }),
    tile({ title: 'Everything today', sub: 'The full list, if you want it', iconName: 'list', accent: 'sage', onclick: () => open({ tab: 'day' }) }),
  );
  root.append(h('section', {}, h('h2.section-title', {}, 'More'), more));

  if (inactive.length) {
    const grid = h('div.tiles', {});
    for (const p of inactive) {
      const look = lookFor(p);
      grid.append(tile({
        title: p.name,
        sub: 'Switched off',
        iconName: look.icon,
        accent: 'muted',
        onclick: () => open({ area: p.id }),
      }));
    }
    root.append(h('section', {},
      h('h2.section-title', {}, 'Not on today'),
      h('p.muted', {}, 'Here when you want them. Turning one on puts it back on your day.'),
      grid,
    ));
  }

  return root;
}

export { lookFor, lengthLabel };
