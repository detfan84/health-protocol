// findingSheet.js — the optional sheet after a check-off (D42, amended by R25).
//
// "Check-off alone is always complete — one tap stays the whole ask." So this
// whole surface is optional, folded, and off the card face. What it offers:
//
//   · a difficulty rating, 1–5. A 4–5 asks ONE follow-up naming the limiting
//     factor — muscle gave out · ran out of steam · it gave way — plus the
//     explicit way to leave it unanswered, which is itself recorded (the app
//     may ask once more when the item next comes up, and needs to know).
//   · hot spot / eased up, the discovery taps, unchanged from FRAMEWORK.
//   · "deal this less" — helpfulness, which is not difficulty and never
//     touches a muscle weight. Easy-and-useless exists.
//
// Sides (Kevin, 1 Sep: findings need to be sided): the weighing taps can carry
// left or right. The default is the whole of it — nobody is made to pick a
// side they did not come in knowing, and a side is only ever claimed when the
// person said it.
//
// What the taps DO is findings.js's business and is tested there; this file's
// job is to record honestly and read the receipt back in plain words.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { makeEvent, followUpFor } from '../composer/findings.js';

const RECEIPTS = {
  'muscle-gave-out': 'Noted. That muscle moves up the rotation, and its strengthening rides along when this comes round again.',
  'ran-out-of-steam': 'Noted as a system limit — it timestamps the effort for the 48-hour look-back and moves no muscle numbers.',
  'gave-way': 'A joint giving way is a stop-and-look signal, never a push-through one. Nothing was scored. If this movement keeps doing it, that is worth a professional’s eyes.',
  'follow-up-skipped': 'Left it. The app may ask once more the next time this one is dealt.',
  'hot-spot': 'Hot spot noted — its work moves up the rotation.',
  'eased-up': 'Good — its weight eases back toward baseline, so it stops leading the deal.',
  'not-helpful': 'This gets dealt less and its siblings get a turn. It never changes any muscle’s numbers.',
};

/**
 * The sheet for one checked item, or null where a finding could not attach.
 *
 * An item with no resolved anatomy can still be rated and thumbed; the muscle
 * taps only appear where there is a muscle to charge.
 */
export function findingSheet(item) {
  if (!item || (item.type && item.type !== 'practice')) return null;
  const nodes = item.target ?? [];
  const state = { side: undefined, rating: null };
  const receipts = h('div.sheet-receipts');
  const followHost = h('div');

  const note = (kind, extra = {}) => guarded(
    () => store.addFinding(makeEvent({
      kind,
      itemId: item.id,
      ...(extra.withNodes && nodes.length ? { nodes, side: state.side } : {}),
      ...(extra.rating !== undefined ? { rating: extra.rating } : {}),
    })),
    {
      what: 'Noting that',
      onOk: () => {
        receipts.append(h('p.muted.tiny', {}, RECEIPTS[kind] ?? 'Noted.'));
      },
    },
  );

  // ---- the rating, 1–5 --------------------------------------------------
  const ratingBtns = [1, 2, 3, 4, 5].map((n) => h('button.chip', {
    'aria-pressed': 'false',
    'aria-label': `${item.name} felt like a ${n} of 5`,
    onclick: () => {
      state.rating = n;
      for (const b of ratingBtns) b.setAttribute('aria-pressed', String(b.textContent === String(n)));
      note('rating', { rating: n });
      clear(followHost);
      const follow = followUpFor(n);
      if (!follow) return;
      followHost.append(
        h('p.muted.tiny', {}, follow.question),
        h('div.chip-row', {},
          follow.options.map((opt) => h('button.chip', {
            onclick: (e) => {
              e.currentTarget.setAttribute('aria-pressed', 'true');
              note(opt.kind, { withNodes: opt.kind === 'muscle-gave-out' });
              clear(followHost); // one follow-up, answered once
            },
          }, opt.label)),
          h('button.chip', {
            onclick: () => { note('follow-up-skipped'); clear(followHost); },
          }, 'Leave it'),
        ),
      );
    },
  }, String(n)));

  // ---- which side, for the taps that weigh ------------------------------
  // Only offered where there is anatomy to charge and the item works each side.
  const sideRow = nodes.length && item.sides !== false
    ? h('div.chip-row', {},
      h('span.why', {}, 'Where, if one side:'),
      [['left', 'Left'], ['right', 'Right'], [undefined, 'Whole thing']].map(([value, label]) => h('button.chip', {
        'aria-pressed': String(value === undefined),
        onclick: (e) => {
          state.side = value;
          for (const b of e.currentTarget.parentElement.querySelectorAll('button')) b.setAttribute('aria-pressed', 'false');
          e.currentTarget.setAttribute('aria-pressed', 'true');
        },
      }, label)),
    )
    : null;

  // ---- the discovery taps ------------------------------------------------
  const discovery = nodes.length
    ? h('div.chip-row', {},
      h('button.chip', { onclick: () => note('hot-spot', { withNodes: true }) }, 'Found a hot spot'),
      h('button.chip', { onclick: () => note('eased-up', { withNodes: true }) }, 'It eased up'),
    )
    : null;

  return h('details.finding-sheet', {},
    h('summary', {}, 'How was it?'),
    h('p.muted.tiny', {}, 'Optional, always — the check on its own is complete. Nothing here is a score of you; it steers what gets dealt.'),
    h('div.chip-row', { role: 'group', 'aria-label': `How hard ${item.name} was, 1 to 5` }, ratingBtns),
    followHost,
    sideRow,
    discovery,
    h('button.thin-link', { onclick: () => note('not-helpful') }, 'Deal this one less — it is not doing anything for me'),
    receipts,
  );
}
