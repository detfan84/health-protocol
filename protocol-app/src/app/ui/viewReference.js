// viewReference.js — the reading material. Food, spacing, symptoms.
//
// Reference, not routine: nothing here goes on a day or gets ticked. It is
// what you look up when you are deciding something, which is a different mode
// from doing the work, and it gets its own page rather than another list of
// things to tap.

import { h, clear } from './dom.js';

let cache = null;
async function loadReference() {
  if (cache) return cache;
  const res = await fetch(new URL('../../content/reference.json', import.meta.url));
  if (!res.ok) throw new Error(`the reference did not load: HTTP ${res.status}`);
  cache = await res.json();
  return cache;
}

export async function viewReference() {
  const root = h('div');
  root.append(h('h1', {}, 'Reference'));

  let ref;
  try {
    ref = await loadReference();
  } catch (error) {
    root.append(h('div.card', {},
      h('h2', {}, "The reference didn't load."),
      h('p.muted', {}, 'It needs a connection the first time, then it is cached with the app.'),
      h('p.tech', {}, String(error.message ?? error))));
    return root;
  }

  /* -------------------------------- food -------------------------------- */
  const food = h('div');
  for (const phase of ref.diet ?? []) {
    const body = h('div');
    if (phase.strategy) body.append(h('p', {}, phase.strategy));
    for (const section of phase.groups ?? []) {
      body.append(h('h3.section-title', {}, section.heading));
      for (const group of section.groups ?? []) {
        body.append(
          h('div', { style: 'margin-bottom:var(--sp-3)' },
            h('span.field-label', {}, group.category),
            h('div', {}, group.items.map((it) =>
              h('p.why', {}, h('strong', {}, it.name), it.why ? ` — ${it.why}` : ''))),
          ),
        );
      }
    }
    food.append(
      h('details.card.lib-item', {},
        h('summary', {},
          h('span.name', {}, phase.name),
          phase.duration ? h('span.why', {}, phase.duration) : null),
        body,
      ),
    );
  }

  // Only if there is any. The food section used to be a four-phase detox diet
  // carried over from the 2025 app — somebody's treatment plan, told to a
  // stranger — and it is not shipped any more (see scripts/build-reference.mjs).
  // An empty heading over nothing is worse than no heading: it reads as a screen
  // that failed to load rather than a section that has not been written.
  if ((ref.diet ?? []).length) {
    root.append(
      h('section', {},
        h('h2.section-title', {}, 'Food'),
        h('p.muted', {}, 'What to lean on, what to go easy on, what to leave out — and why each one is on the list.'),
        food,
        h('p.muted', {}, 'Prescription-medication timing has been left out of this on purpose. That belongs with whoever prescribed it, not in an app.'),
      ),
    );
  }

  /* ------------------------------ spacing -------------------------------- */
  root.append(
    h('section', {},
      h('h2.section-title', {}, 'Spacing — what not to take together'),
      h('p.muted', {}, 'Principles rather than a schedule, because the schedule depends on what you are actually taking.'),
      h('div.card', {},
        (ref.spacing ?? []).map((s) =>
          h('div.field-line', {},
            h('span.field-label', {}, s.rule),
            h('span', {}, s.detail))),
      ),
    ),
  );

  /* ------------------------------ symptoms ------------------------------- */
  root.append(
    h('section', {},
      h('h2.section-title', {}, 'What is worth watching'),
      h('p.muted', {}, 'The things that move first when something is working, or is not. You can score these daily on the Track page.'),
      h('div.card', {},
        h('div.chip-row', {}, (ref.symptoms ?? []).map((s) => h('span.chip', {}, s.name))),
      ),
    ),
  );

  return root;
}
