// viewToday.js — the daily surface. One tap is the whole ask.
//
// Content law 2 lives here structurally: there are no totals, meters, or
// summaries anywhere on this screen — checking an item updates that item and
// nothing else, which is also why a tap never needs a full re-render.
//
// Fail-loudly (ruling B): every write on this screen goes through guarded().
// Success paints only after the write confirms; failure lands on screen with
// a real Retry; typed text is never discarded. Absence renders as "—", never
// as 0 (ruling A) — an unlogged tally is not a zero tally.

import { h, clear } from './dom.js';
import { buildToday, MOVEMENT_PROMPTS, MOVEMENT_SAFETY_LINE, makePhaseSetting } from '../todayModel.js';
import { toggleCheck, setJournal, addFood, removeFood, bumpWater } from '../trackerOps.js';
import { guarded } from './announcer.js';
import * as store from '../store.js';
import { localDateKey, nowIso } from '../../lib/core.js';

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
function notesBlock(notes) {
  const paragraphs = String(notes).split(/\n{2,}/).filter((t) => t.trim() !== '');
  if (paragraphs.length === 0) return null;
  return h(
    'details.notes',
    {},
    h('summary', {}, 'How'),
    paragraphs.map((text) => {
      const m = /^([A-Z][A-Za-z ]{1,14}):\s([\s\S]+)$/.exec(text);
      return m
        ? h('p', {}, h('strong', {}, `${m[1]} `), m[2])
        : h('p', {}, text);
    }),
  );
}

function checkRow(item, day, why) {
  const pressed = Boolean(day.checks[item.id]);
  const btn = h(
    'button.check',
    {
      'aria-pressed': String(pressed),
      'aria-label': `${item.name} — done today`,
      onclick: () =>
        guarded(
          async () => {
            const fresh = await store.loadDay(day.date);
            const next = toggleCheck(fresh, item.id);
            await store.saveDay(next);
            return next;
          },
          {
            what: `The check-off for ${item.name}`,
            // Paint only after the write confirms — a checkmark is a receipt,
            // not a hope (ruling B, point 1).
            onOk: (next) => {
              Object.assign(day, next); // keep this view's copy current
              btn.setAttribute('aria-pressed', String(Boolean(next.checks[item.id])));
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
      item.notes ? notesBlock(item.notes) : null,
    ),
  );
}

export async function viewToday({ reload } = {}) {
  const date = localDateKey();
  const [protocols, day] = await Promise.all([store.loadProtocols(), store.loadDay(date)]);
  const phaseSettings = await store.loadPhaseSettings(protocols);
  const today = buildToday({ protocols, phaseSettings, now: new Date() });

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
        return buildToday({ protocols: ps, phaseSettings: settings, now: new Date() });
      },
      {
        what: "Refreshing today's blocks",
        detail: "Today's blocks couldn't refresh from storage, so this screen may not show the latest change.",
        onOk: (t) => {
          clear(blocksHost);
          renderBlocks(t);
        },
      },
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
    for (const b of t.blocks) {
      const head = h(
        'div.card-head',
        {},
        h('h2', {}, b.name),
        timeLabel(b) ? h('span.chip', {}, timeLabel(b)) : null,
        t.multipleActive ? h('span.chip', {}, b.protocolName) : null,
        b.isNow ? h('span.chip.now-tag', {}, 'Now') : null,
      );
      blocksHost.append(
        h('section.card' + (b.isNow ? '.now' : ''), { 'aria-label': `${b.name} block` },
          head,
          b.items.map((it) => checkRow(it, day, it.why)),
        ),
      );
    }
  }
  renderBlocks(today);

  /* ----------------------------- movement --------------------------- */
  root.append(
    h(
      'section.card',
      { 'aria-label': 'Movement' },
      h('div.card-head', {}, h('h2', {}, 'Movement')),
      h('p.muted', {}, MOVEMENT_SAFETY_LINE),
      MOVEMENT_PROMPTS.map((m) => checkRow(m, day, m.why)),
    ),
  );

  /* ------------------------------ journal ---------------------------- */
  const journalTa = h('textarea', {
    id: 'journal',
    placeholder: 'Anything worth keeping about today.',
    value: day.journal ?? '',
  });
  journalTa.addEventListener('change', () =>
    guarded(
      async () => {
        // Read the field at write time (and at every retry) — what saves is
        // what the person sees in the box. The box is never cleared, so a
        // failure strands nothing (ruling B, point 2).
        const fresh = await store.loadDay(date);
        return store.saveDay(setJournal(fresh, journalTa.value));
      },
      {
        what: 'The journal entry',
        copyText: () => journalTa.value,
      },
    ),
  );
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
                async () => {
                  const fresh = await store.loadDay(date);
                  const next = removeFood(fresh, f.id);
                  await store.saveDay(next);
                  return next;
                },
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
      async () => {
        const fresh = await store.loadDay(date);
        const next = addFood(fresh, text);
        await store.saveDay(next);
        return next;
      },
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
  // Ruling A on screen: before the first tap there is no number, and the
  // display says so — "—" is "not logged", which 0 is not.
  const waterText = (d) => (Number.isFinite(d.water) ? String(d.water) : '—');
  const count = h('span.count', { 'aria-live': 'polite' }, waterText(day));
  function water(delta) {
    return guarded(
      async () => {
        const fresh = await store.loadDay(date);
        const next = bumpWater(fresh, delta);
        if (next !== fresh) await store.saveDay(next); // minus on nothing writes nothing
        return next;
      },
      {
        what: 'The water count',
        onOk: (next) => { count.textContent = waterText(next); },
      },
    );
  }
  root.append(
    h('section.card', { 'aria-label': 'Water' },
      h('div.card-head', {}, h('h2', {}, 'Water'), h('span.chip', {}, 'glasses today')),
      h('div.stepper', {},
        h('button.btn', { 'aria-label': 'One less glass', onclick: () => water(-1) }, '−'),
        count,
        h('button.btn', { 'aria-label': 'One more glass', onclick: () => water(+1) }, '+'),
      ),
    ),
  );

  return root;
}
