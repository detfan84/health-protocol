// viewToday.js — the daily surface. One tap is the whole ask.
//
// Content law 2 lives here structurally: there are no totals, meters, or
// summaries about the person anywhere on this screen. A tap re-sorts the day
// — done things move to Done — but nothing is scored, and nothing is said
// about how much of it you did.
//
// The day is grouped, not listed (PLAN §5, R16): Now · still open from
// earlier · anytime · later (folded) · done (folded). A protocol with nine
// blocks is nine cards you scroll past; grouped, it is the handful you can
// act on right now.
//
// Fail-loudly (ruling B): every write on this screen goes through guarded().
// Success paints only after the write confirms; failure lands on screen with
// a real Retry; typed text is never discarded. Absence renders as "—", never
// as 0 (ruling A) — an unlogged tally is not a zero tally.

import { h, clear } from './dom.js';
import { buildToday, makePhaseSetting } from '../todayModel.js';
import { toggleCheck, setJournal, addFood, removeFood, bumpWaterMl, setWaterMl } from '../trackerOps.js';
import { unitsOf, stepMl, volumeUnitLabel, displayVolume, parseVolume } from '../../lib/units.js';
import { guarded } from './announcer.js';
import * as store from '../store.js';
import { localDateKey, nowIso } from '../../lib/core.js';

/** Scroll, where scrolling exists — jsdom and headless renders have no view. */
function scrollToY(y) {
  try { window.scrollTo(0, y); } catch { /* no viewport to move */ }
}

function timeLabel(b) {
  if (b.start && b.end) return `${b.start}–${b.end}`;
  if (b.start) return `from ${b.start}`;
  return null;
}

/**
 * The instructions, folded away until asked for.
 *
 * Notes carry the whole point of an item — how to do it, how long, what to
 * watch for, what to be careful of. They were stored and never drawn, which
 * left a screen of names you could tick without knowing why. Printing them
 * inline would make an already-long list unreadable, so each item keeps a
 * disclosure: closed by default, one tap to the real thing.
 *
 * Paragraphs that begin with a short label ("Release: ...", "Careful: ...")
 * keep that label in bold, because that is how they read on paper.
 */
function notesBlock(notes, itemId, openNotes) {
  const paragraphs = String(notes).split(/\n{2,}/).filter((t) => t.trim() !== '');
  if (paragraphs.length === 0) return null;
  // Opened instructions stay open. The screen re-sorts itself as the day gets
  // ticked off, and re-closing what somebody opened to read mid-exercise would
  // make the app fight them.
  const el = h(
    'details.notes',
    { open: openNotes?.has(itemId) ? '' : null },
    h('summary', {}, 'How'),
    paragraphs.map((text) => {
      const m = /^([A-Z][A-Za-z ]{1,14}):\s([\s\S]+)$/.exec(text);
      return m
        ? h('p', {}, h('strong', {}, `${m[1]} `), m[2])
        : h('p', {}, text);
    }),
  );
  if (openNotes) {
    el.addEventListener('toggle', () => {
      if (el.open) openNotes.add(itemId);
      else openNotes.delete(itemId);
    });
  }
  return el;
}

function checkRow(item, day, why, { openNotes, onChanged } = {}) {
  const pressed = Boolean(day.checks[item.id]);
  const btn = h(
    'button.check',
    {
      'aria-pressed': String(pressed),
      'aria-label': `${item.name} — done today`,
      onclick: () =>
        guarded(
          () => store.mutateDay(localDateKey(), (fresh) => toggleCheck(fresh, item.id)),
          {
            what: `The check-off for ${item.name}`,
            // Paint only after the write confirms — a checkmark is a receipt,
            // not a hope (ruling B, point 1).
            onOk: (next) => {
              Object.assign(day, next); // keep this view's copy current
              btn.setAttribute('aria-pressed', String(Boolean(next.checks[item.id])));
              // The receipt paints on this button first (ruling B), then the
              // screen re-sorts: a done item moves to Done, and what is left is
              // what is left. Nothing is scored — things just move.
              onChanged?.(next);
            },
          },
        ),
    },
    '✓',
  );
  return h(
    'div.row',
    {},
    btn,
    h(
      'div.grow',
      {},
      h('span.name', {}, item.name, item.dose ? h('span.dose', {}, ` · ${item.dose}`) : null),
      why ? h('span.why', {}, why) : null,
      item.notes ? notesBlock(item.notes, item.id, openNotes) : null,
    ),
  );
}

export async function viewToday({ reload, stamp } = {}) {
  const date = localDateKey();
  const [protocols, day] = await Promise.all([store.loadProtocols(), store.loadDay(date)]);
  const phaseSettings = await store.loadPhaseSettings(protocols);
  const today = buildToday({ protocols, phaseSettings, now: new Date(), day });

  // Instructions the person has opened, by item id — kept across the
  // re-sorts a tap causes, so reading stays read.
  const openNotes = new Set();

  // Fired when this screen is replaced, so its page-level listeners go with
  // it — and so anything half-typed is saved on the way out.
  const leaving = new AbortController();

  const root = h('div');
  const dateText = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  root.append(h('h1', {}, 'Today'), h('p.muted', {}, dateText));

  /* ------------------------- phase pointers ------------------------- */
  for (const pp of today.phasedProtocols) {
    // The select may only display a phase that actually persisted. On a
    // failed write it snaps back — the screen never gets ahead of storage.
    let persisted = pp.current?.id ?? pp.phases[0]?.id;
    const select = h(
      'select',
      {
        'aria-label': `Current phase of ${pp.protocolName}`,
        onchange: (e) => {
          const chosen = e.target.value;
          guarded(
            () =>
              store.putSetting(
                makePhaseSetting(pp.protocolId, chosen, localDateKey(), nowIso()),
              ),
            {
              what: `The phase change for ${pp.protocolName}`,
              onOk: () => {
                persisted = chosen;
                rerenderBlocks();
              },
              onFail: () => {
                e.target.value = persisted;
              },
            },
          );
        },
      },
      pp.phases.map((ph) =>
        h('option', { value: ph.id, selected: ph.id === pp.current?.id }, ph.name),
      ),
    );
    root.append(
      h('div.card', {}, h('div.field', {}, h('label', {}, `${pp.protocolName} — current phase`), select)),
    );
  }

  /* ------------------------------ blocks ---------------------------- */
  const blocksHost = h('div');
  root.append(blocksHost);

  function rerenderBlocks() {
    return guarded(
      async () => {
        const ps = await store.loadProtocols();
        const settings = await store.loadPhaseSettings(ps);
        const fresh = await store.loadDay(localDateKey());
        return buildToday({ protocols: ps, phaseSettings: settings, now: new Date(), day: fresh });
      },
      {
        what: "Refreshing today's blocks",
        detail: "Today's blocks couldn't refresh from storage, so this screen may not show the latest change.",
        onOk: (t) => {
          // Hold the scroll: the list shrinks as things move to Done, and a
          // screen that jumps under your thumb loses the next tap.
          const y = window.scrollY;
          clear(blocksHost);
          renderBlocks(t);
          scrollToY(y);
        },
      },
    );
  }

  /** One block, drawn as a card, with only the items that belong here. */
  function blockCard(b, t, { flavour = '' } = {}) {
    const head = h(
      'div.card-head',
      {},
      h('h2', {}, b.name),
      timeLabel(b) ? h('span.chip', {}, timeLabel(b)) : null,
      t.multipleActive ? h('span.chip', {}, b.protocolName) : null,
    );
    return h('section.card' + flavour, { 'aria-label': `${b.name} block` },
      head,
      b.items.map((it) => checkRow(it, day, it.why, { openNotes, onChanged: rerenderBlocks })),
    );
  }

  /**
   * A group of the day: Now, missed earlier, anytime, later, done.
   *
   * Open groups are the ones you act on; closed ones are one line you can
   * reach for. The count on a closed group says how much is inside it — it is
   * a label on a drawer, not a score (content law 2: no meters, no commentary
   * about the person).
   */
  function groupSection(t, { key, title, note, closed, foldOver }) {
    const parts = t.groups[key];
    if (!parts.length) return null;
    const count = parts.reduce((n, p) => n + p.items.length, 0);
    const cards = parts.map((b) => blockCard(b, t, { flavour: key === 'now' ? '.now' : '' }));
    // A handful left from this morning is worth showing; a whole untouched day
    // is a wall, and a wall is what made this screen unusable. Over the fold
    // line it becomes one line you can open — present either way, never a
    // scroll you have to fight past to reach right now.
    if (foldOver && count > foldOver) closed = true;
    if (!closed) {
      return h('div', {},
        h('h2.group-title', {}, title),
        note ? h('p.muted', {}, note) : null,
        cards,
      );
    }
    return h('details.group', {},
      h('summary', {}, `${title} · ${count}`),
      note ? h('p.muted', {}, note) : null,
      cards,
    );
  }

  function renderBlocks(t) {
    if (t.blocks.length === 0) {
      const card = h('div.card', {},
        h('p.muted', {}, 'Nothing active yet. Build a protocol — or bring one in — in Protocols.'),
      );
      blocksHost.append(card);
      return;
    }
    // The order is the day as it is lived: what is open right now, what is
    // still waiting from earlier, what has no time attached, then what is
    // coming and what is behind you — the last two folded away.
    const sections = [
      groupSection(t, { key: 'now', title: 'Now' }),
      groupSection(t, {
        key: 'missed',
        title: 'Still open from earlier',
        note: 'Their time has passed. Tap them if you get to them — nothing here is counted against you.',
        foldOver: 8,
      }),
      groupSection(t, { key: 'anytime', title: 'Anytime today' }),
      groupSection(t, { key: 'later', title: 'Later today', closed: true }),
      groupSection(t, { key: 'done', title: 'Done', closed: true }),
    ].filter(Boolean);

    if (sections.length === 0) {
      blocksHost.append(h('div.card', {}, h('p.muted', {}, 'Everything scheduled for today is done.')));
      return;
    }
    for (const s of sections) blocksHost.append(s);
  }
  renderBlocks(today);

  // Tell the shell what this screen assumes, so it can notice when the day
  // has moved past it (see watchForStaleScreen in app.js).
  stamp?.({ date, nextBoundaryHM: today.nextBoundaryHM });

  root._beforeUnmount = () => {
    saveJournal();
    leaving.abort();
  };

  // Open on the block the person is actually in. Landing at the top of a
  // nine-block day means scrolling past the morning to find the afternoon.
  root._afterMount = () => {
    const nowCard = blocksHost.querySelector('.card.now');
    if (!nowCard) { scrollToY(0); return; }
    const top = nowCard.getBoundingClientRect().top + window.scrollY;
    scrollToY(Math.max(0, top - 12));
  };

  /* ------------------------------ journal ---------------------------- */
  const journalTa = h('textarea', {
    id: 'journal',
    placeholder: 'Anything worth keeping about today.',
    value: day.journal ?? '',
  });
  // The journal used to save on `change`, which is blur — and swiping to
  // another app does not blur a textarea on a phone. Typed thoughts sat in a
  // box that was never written. Now it saves as you type (settled), and again
  // the moment the page is hidden or unloaded, which is when a phone takes
  // the app away mid-sentence.
  let journalTimer = null;
  let lastSaved = day.journal ?? '';
  function saveJournal() {
    if (journalTimer) { clearTimeout(journalTimer); journalTimer = null; }
    if (journalTa.value === lastSaved) return;
    const text = journalTa.value;
    return guarded(
      // Read the field at write time (and at every retry) — what saves is
      // what the person sees in the box. The box is never cleared, so a
      // failure strands nothing (ruling B, point 2).
      () => store.mutateDay(localDateKey(), (fresh) => setJournal(fresh, journalTa.value)),
      {
        what: 'The journal entry',
        copyText: () => journalTa.value,
        onOk: () => { lastSaved = text; },
      },
    );
  }
  journalTa.addEventListener('input', () => {
    if (journalTimer) clearTimeout(journalTimer);
    journalTimer = setTimeout(saveJournal, 800);
  });
  journalTa.addEventListener('change', saveJournal);
  // Page-level listeners belong to THIS drawing of the screen. Without the
  // signal they would pile up one per render, each holding a textarea that is
  // no longer on screen — and an old one could write its stale text over new.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveJournal();
  }, { signal: leaving.signal });
  window.addEventListener('pagehide', saveJournal, { signal: leaving.signal });
  root.append(
    h(
      'section.card',
      { 'aria-label': 'Journal' },
      h('div.field', {},
        h('label', { for: 'journal' }, 'Journal'),
        journalTa,
      ),
    ),
  );

  /* ------------------------------- food ------------------------------ */
  const foodList = h('div');
  function renderFood(d) {
    clear(foodList);
    for (const f of d.food) {
      const at = new Date(f.at);
      const hm = isNaN(at) ? '' : at.toTimeString().slice(0, 5);
      foodList.append(
        h('div.row', {},
          h('div.grow', {}, h('span.name', {}, f.text), h('span.why', {}, hm)),
          h('button.btn.quiet.small', {
            'aria-label': `Remove food entry: ${f.text}`,
            onclick: () =>
              guarded(
                () => store.mutateDay(localDateKey(), (fresh) => removeFood(fresh, f.id)),
                {
                  what: `Removing the food entry "${f.text}"`,
                  onOk: (next) => renderFood(next),
                },
              ),
          }, 'Remove'),
        ),
      );
    }
  }
  renderFood(day);

  const foodInput = h('input', { type: 'text', id: 'food-entry', placeholder: 'What you ate.' });
  function submitFood() {
    const text = foodInput.value;
    if (!text.trim()) return;
    guarded(
      () => store.mutateDay(localDateKey(), (fresh) => addFood(fresh, text)),
      {
        what: `The food entry "${text.trim()}"`,
        copyText: () => text,
        onOk: (next) => {
          // Clear only what was saved; if the field has since changed,
          // whatever's typed there now stays put.
          if (foodInput.value === text) foodInput.value = '';
          renderFood(next);
        },
      },
    );
  }
  foodInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitFood(); });

  root.append(
    h('section.card', { 'aria-label': 'Food log' },
      h('div.card-head', {}, h('h2', {}, 'Food')),
      foodList,
      h('div.field-row', {},
        h('div', { style: 'flex:3' }, h('label', { for: 'food-entry', class: 'visually-hidden' }, 'Add a food entry'), foodInput),
        h('button.btn', { onclick: submitFood, 'aria-label': 'Add food entry' }, 'Add'),
      ),
    ),
  );

  /* ------------------------------- water ----------------------------- */
  // Ounces (or millilitres), never "glasses" — a glass is not a unit, it is a
  // guess about the size of somebody's cup (K2). Storage is ml either way.
  //
  // Ruling A on screen: before the first log the box is empty and the label
  // says "not logged yet". Empty is not zero, and the screen must not blur
  // the two. Clearing the box puts the day back to never-logged.
  const units = unitsOf(await store.getSetting('ui.units'));
  const unitLabel = volumeUnitLabel(units);
  const tap = stepMl(units);
  const shown = (d) => {
    const v = displayVolume(d.waterMl, units);
    return v === undefined ? '' : String(v);
  };
  const amount = h('input.count', {
    type: 'number',
    id: 'water-amount',
    min: '0',
    step: '1',
    inputmode: 'numeric',
    placeholder: '—',
    'aria-label': `Water today, in ${unitLabel}`,
    value: shown(day),
    style: 'flex:1;',
  });
  const provenance = h('p.muted', { style: 'margin-top:var(--sp-2)' }, '');
  function paint(d) {
    Object.assign(day, d);
    amount.value = shown(d);
    provenance.textContent = Number.isFinite(d.waterFromGlasses)
      ? `Converted from ${d.waterFromGlasses} glasses logged in the older version, at 8 oz a glass — not a number you typed. Correct it if it is wrong.`
      : '';
  }
  function water(deltaMl) {
    return guarded(
      // A minus-tap on nothing returns the same record, and mutateDay writes
      // nothing at all for it — no record is invented (ruling A).
      () => store.mutateDay(localDateKey(), (fresh) => bumpWaterMl(fresh, deltaMl)),
      {
        what: 'The water amount',
        onOk: (next) => paint(next),
      },
    );
  }
  amount.addEventListener('change', () =>
    guarded(
      () => store.mutateDay(localDateKey(), (fresh) => setWaterMl(fresh, parseVolume(amount.value, units))),
      {
        what: 'The water amount',
        copyText: () => amount.value,
        onOk: (next) => paint(next),
      },
    ),
  );
  root.append(
    h('section.card', { 'aria-label': 'Water' },
      h('div.card-head', {}, h('h2', {}, 'Water'), h('span.chip', {}, `${unitLabel} today`)),
      h('div.stepper', {},
        h('button.btn', { 'aria-label': `${displayVolume(tap, units)} ${unitLabel} less`, onclick: () => water(-tap) }, '−'),
        amount,
        h('button.btn', { 'aria-label': `${displayVolume(tap, units)} ${unitLabel} more`, onclick: () => water(+tap) }, '+'),
      ),
      provenance,
    ),
  );
  paint(day);

  return root;
}
