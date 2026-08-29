// viewHome.js — the front door: your day, and one door to everything else.
//
// What this replaces, and why (Kevin, 23 Aug): "I don't like how it's all in
// one big list... every block is on the same page. Why can't we do different
// pages for different blocks?" He is right. Everything the app knows was
// arriving on one screen at once, which is not a design — it is an absence of
// one.
//
// And then (29 Aug): "the day arc shouldn't be parked alongside the things
// that are contained within it." The first answer to the first complaint was a
// grid of tiles — five active protocols, six "More" destinations, five
// switched-off ones — with The day arc sitting beside Body work, Daily flow
// and Support, which are the four places the arc DRAWS FROM. Sixteen tiles is
// not a menu either; it is the same list with borders on it, and it made a
// container look like a sibling of its contents.
//
// So the front door is now four things, in this order:
//
//   1. Right now                → one card, with Start on it
//   2. The rest of today        → what is still open, as places to go
//   3. Browse                   → the one door the "More" row was six bad
//                                 answers to (the faceted library, TAXONOMY §8)
//   4. A thin row               → Everything today · Supply · Plans
//
// The protocols themselves have not gone anywhere: they fold up at the bottom,
// where a plan is a plan rather than a peer of the day it feeds. Every area
// page is still one tap from here, which is the rule that matters — commit
// 197da3e dropped Supply and Plans off this screen with nothing to replace
// them, and every screen still rendered perfectly in isolation.

import { h } from './dom.js';
import * as store from '../store.js';
import { icon } from './icons.js';
import { buildToday } from '../todayModel.js';
import { localDateKey, displayTime, timeFormatOf } from '../../lib/core.js';
import { lengthForYou, lengthTextForYou } from '../../lib/durations.js';

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

/**
 * How long a block reads as, and whose number that is.
 *
 * This used to be
 *   block.items.reduce((n, it) => n + (it.amount?.seconds ?? 60), 0)
 * — a minute invented for every item with no duration, summed, and shown to a
 * person as though the app knew. Most of the day carries no clock at all, so
 * most of that number was fabricated. Canon 3.7: no uncertainty was
 * experienced while writing it, which is exactly how a made-up number gets
 * mistaken for a known one.
 *
 * Now it says what it knows, counts what it does not, and — given a person's
 * recorded times — prefers theirs and says so. "About 8 min" is what the cards
 * claim; "about 11 min · your own times" is what it actually takes them. With
 * 369 catalogue items carrying no duration at all, their own history is the
 * faster route to an honest estimate than authoring 369 numbers.
 */
const lengthLabel = (block, history = {}) => lengthTextForYou(lengthForYou(block.items, history));

/**
 * The rest of the day, split by whether the day actually asks for it yet.
 *
 * → { scheduled, anytime }
 *
 * `scheduled` is what has a place in the day — still open from earlier, also
 * open now, coming up at eight — each labelled with WHY it is on screen. A
 * block whose window closed an hour ago and one that opens at ten are both
 * "not done", and reading them as the same thing is how a screen stops being
 * useful.
 *
 * `anytime` is the other thirteen. This split is the whole lesson of the first
 * cut of this screen: with the real shipped content the front door drew
 * NINETEEN rows, because every body-work section and every support section is
 * an untimed block and therefore "the rest of today". That is not a day; it is
 * the library wearing a schedule, and it is the same failure as the sixteen
 * tiles it replaced. The suite was green throughout — the fixture had two
 * protocols. Open what a person opens.
 *
 * So the untimed blocks fold to one line, the way Today folds a large group,
 * and the day keeps its shape.
 *
 * "When needed" and "not asking right now" are deliberately absent from both:
 * they are answers to a question nobody asked this minute.
 */
function restOfToday(groups, fmt) {
  const scheduled = [];
  for (const b of groups.now.slice(1)) scheduled.push({ block: b, when: 'also open now' });
  for (const b of groups.missed) scheduled.push({ block: b, when: 'still open from earlier' });
  for (const b of groups.later) {
    scheduled.push({ block: b, when: b.start ? `from ${displayTime(b.start, fmt)}` : 'later today' });
  }
  const anytime = groups.anytime.map((b) => ({ block: b, when: 'anytime today' }));
  return { scheduled, anytime };
}

export async function viewHome({ open, startSession }) {
  const date = localDateKey();
  // The same reads Today makes, for the same reason: a cadence question
  // ("have I had my three this week?") answered without the week is answered
  // wrong, and this screen was asking it with an empty history. `history` also
  // carries what things have actually taken, which is what turns an estimate
  // from the cards' number into the person's own.
  const [protocols, day, history, pauses, supplies] = await Promise.all([
    store.loadProtocols(),
    store.loadDay(date),
    store.loadRecentDays(date),
    store.loadPauses(),
    store.loadSupplies(),
  ]);
  // Read, never advanced: `phaseAsOf` works out where a plan has got to
  // without writing anything, and moving somebody's phase pointer is not a
  // thing opening the front door should do. Today owns that write.
  const phaseSettings = await store.loadPhaseSettings(protocols);
  const fmt = timeFormatOf(await store.getSetting('ui.timeFormat'));
  const today = buildToday({ protocols, phaseSettings, now: new Date(), day, history, pauses, supplies });

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
          h('p.muted', {}, `${b.items.length} left · ${lengthLabel(b, history)}`),
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

  /* --------------------------- the rest of today ------------------------- */
  // What is left, as blocks rather than as protocols. This is the half of the
  // old tile grid that was actually about today: a person wants "the evening
  // wind-down, still open" and not "Body work, 8 parts, 41 things".
  const { scheduled, anytime } = restOfToday(today.groups, fmt);
  const dayRow = ({ block, when }) => h('button.day-row', {
    onclick: () => startSession(block.protocolId, block.blockId),
  },
    h('span.day-row-body', {},
      h('span.day-row-title', {},
        block.name,
        today.multipleActive ? h('span.day-row-from', {}, ` · ${block.protocolName}`) : null,
      ),
      h('span.day-row-sub', {}, `${when} · ${block.items.length} left · ${lengthLabel(block, history)}`),
    ),
    h('span.day-row-go', {}, 'Start'),
  );

  if (scheduled.length || anytime.length) {
    const section = h('section', {}, h('h2.section-title', {}, 'The rest of today'));
    if (scheduled.length) {
      const list = h('div.day-list', {});
      for (const row of scheduled) list.append(dayRow(row));
      section.append(list);
    } else {
      section.append(h('p.muted', {}, 'Nothing else is scheduled. What is below is yours to pick up whenever.'));
    }

    if (anytime.length) {
      const things = anytime.reduce((n, r) => n + r.block.items.length, 0);
      const list = h('div.day-list', {});
      for (const row of anytime) list.append(dayRow(row));
      section.append(
        h('details.anytime-fold', {},
          h('summary', {},
            `Anytime today — ${anytime.length} ${anytime.length === 1 ? 'part' : 'parts'}, ${things} things`),
          list,
        ),
      );
    }
    root.append(section);
  } else if (nowBlocks.length) {
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'The rest of today'),
        h('div.card', {}, h('p.muted', {}, 'Nothing else is open. Anything below is there when you want it.')),
      ),
    );
  }

  /* -------------------------------- browse ------------------------------- */
  // The one door. There used to be six here — Library, Reference, Track,
  // Supply, Plans, Everything today — three of which are already tabs, and a
  // row of tiles that repeats the tab bar teaches a person that neither one
  // means anything. The library slices by effect, body part, pattern,
  // equipment and context now, so it is a real answer to "what else can I
  // work on" rather than a shelf named after which file something came from.
  root.append(
    h('section', {},
      h('h2.section-title', {}, 'Anything else'),
      tile({
        title: 'Browse',
        sub: 'Everything the app can teach — by what it does, where in the body, and what you need for it',
        iconName: 'library',
        accent: 'plum',
        wide: true,
        onclick: () => open({ tab: 'library' }),
      }),
      h('div.thin-row', {},
        h('button.thin-link', { onclick: () => open({ tab: 'day' }) }, 'Everything today'),
        h('button.thin-link', { onclick: () => open({ tab: 'supply' }) }, 'Supply'),
        h('button.thin-link', { onclick: () => open({ tab: 'plans' }) }, 'Plans'),
      ),
    ),
  );

  /* -------------------------------- plans -------------------------------- */
  // Folded, and this is the whole point of the redesign: a plan is where the
  // day comes FROM, so it sits under the day rather than beside it. Closed it
  // is one line; open it is every area page, on and off, still one tap away.
  const active = protocols.filter((p) => p.active === true);
  const inactive = protocols.filter((p) => p.active !== true);
  if (active.length || inactive.length) {
    const counts = [
      active.length ? `${active.length} on` : null,
      inactive.length ? `${inactive.length} off` : null,
    ].filter(Boolean).join(', ');

    const body = h('div', {});
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
      body.append(grid);
    }
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
      body.append(
        h('p.muted', {}, 'Here when you want them. Turning one on puts it back on your day.'),
        grid,
      );
    }

    root.append(
      h('section', {},
        h('details.plans-fold', {},
          h('summary', {}, `Your plans — ${counts}`),
          body,
        ),
      ),
    );
  }

  return root;
}

export { lookFor, lengthLabel, restOfToday };
