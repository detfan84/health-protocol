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
// The first answer to THAT was six equal-weight rows under a card that said
// "Nothing scheduled this minute" — 1259px of scroll on an 812px screen, with
// the one piece of prime real estate saying nothing while six blocks sat open
// underneath it. Kevin, 29 Aug: *"what's up now in the current time slot should
// be front and center… what's completed should vanish (but still be
// accessible)… what didn't get done, but the time has passed is still at the
// top of the list to circle back to, just not drawing the same attention…
// what's to come can be on there, but again smaller… not adding to the
// overwhelming list that turns into a wall of obligation."*
//
// So the front door has ONE loud thing and everything else in descending
// quiet:
//
//   1. Now          → one big card. The largest thing on the screen.
//   2. Circle back  → missed, plain rows, no buttons competing with Now
//   3. Later        → one folded line, for working ahead
//   4. Anytime      → one folded line
//   5. Done         → one folded line; gone from view, still reachable
//   6. Browse       → the one door the "More" row was six bad answers to
//   7. A thin row   → Everything today · Supply · Plans
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
 * The day in four tiers, loudest first.
 *
 * → { now, back, later, anytime }
 *
 * The tiers are the design. Everything on this screen used to be the same
 * size, which meant a person had to read all of it to find the one line that
 * mattered — and when nothing was scheduled this minute, the loudest thing on
 * the page was a sentence saying so.
 *
 *   `now`     the block whose window contains this minute. Front and centre.
 *   `back`    missed: the time passed and it did not happen. At the top of
 *             what follows, because circling back is a real thing people do —
 *             but plain, because it is not what the clock is asking for.
 *   `later`   coming up. Present so somebody can work ahead, folded so it does
 *             not become a wall.
 *   `anytime` the untimed pool. Thirteen body-work and support sections, which
 *             drawn flat made the front door nineteen rows long.
 *
 * Done is not here. It leaves the screen entirely (its own fold, further
 * down) — a finished thing is not an obligation, and a list of them under a
 * list of what is left reads as one longer list.
 *
 * "When needed" and "not asking right now" are absent from all of it: they are
 * answers to a question nobody asked this minute.
 */
function dayShape(groups) {
  return {
    now: groups.now,
    back: groups.missed,
    later: groups.later,
    anytime: groups.anytime,
  };
}

/** How many things are inside a list of blocks. */
const countItems = (blocks) => blocks.reduce((n, b) => n + b.items.length, 0);

// `now` is injectable for one reason: this screen's whole job is deciding what
// the clock is asking for, and a test that cannot set the clock can only ever
// check the branch that happens to be true when it runs.
export async function viewHome({ open, startSession, now = new Date() }) {
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
  const today = buildToday({ protocols, phaseSettings, now, day, history, pauses, supplies });

  const root = h('div.home', {});
  const hour = now.getHours();
  const greeting = hour < 5 ? 'Late night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  root.append(
    h('div.home-head', {},
      h('h1', {}, greeting),
      h('p.muted', {}, now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })),
    ),
  );

  /* --------------------------------- now --------------------------------- */
  // The largest thing on the screen, and the only loud one. When the clock has
  // something to say this is it; when it does not, this says THAT plainly and
  // in one line rather than spending a card on the word "nothing".
  const shape = dayShape(today.groups);
  const startOf = (b) => () => startSession(b.protocolId, b.blockId);

  if (shape.now.length) {
    const b = shape.now[0];
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'Now'),
        h('div.card.now-card', {},
          h('h3.now-name', {}, b.name),
          h('p.now-sub', {}, `${b.items.length} left · ${lengthLabel(b, history)}`),
          h('button.btn.primary.now-start', { onclick: startOf(b) }, 'Start'),
          // A second block genuinely open at the same minute is real (a
          // 06:00–08:00 and a 07:00–09:00 overlap), but only one thing can be
          // front and centre. The rest go quietly under it rather than
          // competing for the same job.
          shape.now.length > 1
            ? h('button.now-also', { onclick: startOf(shape.now[1]) },
                `Also open now: ${shape.now[1].name}`)
            : null,
        ),
      ),
    );
  } else {
    const next = shape.later[0];
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'Now'),
        h('div.card.now-card.now-quiet', {},
          h('h3.now-name', {}, next && next.start
            ? `Nothing until ${displayTime(next.start, fmt)}`
            : 'Nothing on the clock'),
          // Deliberately no button. The obvious move is to offer one of the
          // anytime blocks here, and the app would then be choosing for
          // somebody — "nothing here judges what you pick" is the library's
          // rule and it does not stop applying because there is a gap in the
          // clock. It says what is true and the Anytime fold is right below.
          h('p.now-sub.no-gap', {}, shape.anytime.length
            ? `${countItems(shape.anytime)} things you can do any time today.`
            : 'Nothing is asking for you right now.'),
        ),
      ),
    );
  }

  /* ----------------------------- circle back ----------------------------- */
  // Missed. Kevin: "still at the top of the list to circle back to, just not
  // drawing the same attention that the current timeframe should." So: first
  // under Now, and plain — no card, no accent, no Start button. The whole row
  // is still the tap target; it simply does not shout.
  const quietRow = (b, trailing) => h('button.quiet-row', { onclick: startOf(b) },
    h('span.quiet-row-name', {}, b.name),
    h('span.quiet-row-sub', {}, trailing),
  );

  if (shape.back.length) {
    const list = h('div.quiet-list', {});
    for (const b of shape.back) {
      list.append(quietRow(b, `${b.items.length} left · ${lengthLabel(b, history)}`));
    }
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'Circle back'),
        list,
      ),
    );
  }

  /* ------------------------- later · anytime · done ---------------------- */
  // Three one-line folds. Everything a person might want and nothing they have
  // to read: closed, this whole region is three lines tall.
  const fold = (summary, blocks, trailing) => {
    const list = h('div.quiet-list', {});
    for (const b of blocks) list.append(quietRow(b, trailing(b)));
    return h('details.day-fold', {}, h('summary', {}, summary), list);
  };

  const later = shape.later;
  const anytime = shape.anytime;
  const done = today.groups.done;

  if (later.length || anytime.length || done.length) {
    const section = h('section', {});
    if (later.length) {
      const next = later[0];
      section.append(fold(
        `Later — ${later.length === 1 ? 'one more' : `${later.length} more`}, next at ${next.start ? displayTime(next.start, fmt) : 'no set time'}`,
        later,
        (b) => `${b.start ? displayTime(b.start, fmt) : 'later'} · ${b.items.length} · ${lengthLabel(b, history)}`,
      ));
    }
    if (anytime.length) {
      section.append(fold(
        `Anytime — ${anytime.length} ${anytime.length === 1 ? 'part' : 'parts'}, ${countItems(anytime)} things`,
        anytime,
        (b) => `${b.items.length} left · ${lengthLabel(b, history)}`,
      ));
    }
    // Done vanishes from the day and stays reachable, which is the whole ask.
    // No proportion, no meter, no "3 of 9" — content law 2. It counts what is
    // in a drawer, the way Today's groups do.
    if (done.length) {
      section.append(fold(
        `Done today — ${countItems(done)}`,
        done,
        (b) => `${b.items.length} done`,
      ));
    }
    root.append(section);
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
        sub: 'By what it does, where in the body, what you need',
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

export { lookFor, lengthLabel, dayShape };
