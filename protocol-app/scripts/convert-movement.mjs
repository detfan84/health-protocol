// convert-movement.mjs — carries the exercise, breathing and body work content
// out of the old app.
//
// Three different shapes come across, and one of them does not fit cleanly.
// Rather than force it, the mismatch is handled where a person can see it:
//
//   bodywork.js  SECTIONS -> blocks, cards -> items. Near-perfect fit; the
//                cards already carry a `dose`. This is also where the
//                breathing, airway and vagus work lives.
//   stretching.js  Morning Flow and Evening Wind-Down -> two timed blocks.
//                The old app offered 5/10/15/20/25/30-minute versions of each;
//                the longest is taken, because trimming a list is easy and
//                remembering what was cut is not.
//   routines.js  8 strength routines. These do NOT become blocks in one
//                protocol - Today would then show all eight every day, which
//                is not how training works. Each becomes its own protocol,
//                switched on for the day you are doing it. That is what the
//                app's active toggle is for.
//
// Everything except the supplements arrives switched OFF, so loading this
// cannot bury Today under content you have not chosen yet.

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OLD = resolve(here, '../../src/data');
const load = (f) => import(pathToFileURL(resolve(OLD, f)).href);

const { SECTIONS } = await load('bodywork.js');
const { STRETCHING_ROUTINES, STRETCH_LIBRARY } = await load('stretching.js');
const { ROUTINE_TEMPLATES } = await load('routines.js');
const { EXERCISES } = await load('exercises.js');

const now = new Date().toISOString();
const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

/** Joins labelled paragraphs, dropping the ones with nothing in them. */
function section(...pairs) {
  return pairs
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([label, v]) => (label ? `${label}: ${v}` : String(v)))
    .join('\n\n');
}

/* --------------------------- body work & breathing ------------------- */

const bodyworkProtocol = {
  id: 'body-work',
  name: 'Body work & breathing',
  notes:
    'Release, breathing, airway, nerve glides, balance and vagal work, carried ' +
    'over from the previous app. Switched off until you want it — turn it on ' +
    'in Protocols, or thin it down first.',
  active: false,
  phases: [],
  blocks: SECTIONS.map((s, i) => ({
    id: `bw-${s.id}`,
    name: s.name,
    order: i,
    items: s.items.map((c) => ({
      id: `bw-${c.id}`,
      name: c.name,
      dose: c.dose ?? undefined,
      why: c.fix ?? s.note ?? undefined,
      notes: section(
        ['Tool', c.tool],
        [null, Array.isArray(c.steps) ? c.steps.map((t, n) => `${n + 1}. ${t}`).join('\n') : null],
        ['Release', c.release],
        ['Load', c.load],
        ['Feels like', c.feels],
        ['Notice', c.notice],
        ['Careful', c.careful],
      ),
      phaseIds: [],
    })),
  })),
  createdAt: now,
  updatedAt: now,
};

/* ------------------------------ stretching --------------------------- */

const STRETCH_TIMES = {
  morning: { start: '06:00', end: '09:00' },
  evening: { start: '20:00', end: '23:00' },
};

const stretchingProtocol = {
  id: 'stretching',
  name: 'Stretching',
  notes:
    'Morning Flow and Evening Wind-Down. The longest version of each is here — ' +
    'delete what you do not want rather than hunting for a shorter list.',
  active: false,
  phases: [],
  blocks: Object.entries(STRETCHING_ROUTINES).map(([key, r], i) => {
    const longest = Object.keys(r.durations)
      .map(Number)
      .sort((a, b) => b - a)[0];
    return {
      id: `st-${key}`,
      name: r.name,
      ...(STRETCH_TIMES[key] ?? {}),
      order: i,
      items: r.durations[String(longest)].map((s) => {
        const lib = STRETCH_LIBRARY[s.key] ?? {};
        const muscles = s.muscles ?? lib.muscles ?? [];
        return {
          id: `st-${key}-${s.key}`,
          name: s.name ?? lib.name ?? s.key,
          dose: [s.duration ? `${s.duration} sec` : null, s.note].filter(Boolean).join(' — ') || undefined,
          why: muscles.length ? muscles.join(', ') : undefined,
          notes: s.details ?? lib.details ?? '',
          phaseIds: [],
        };
      }),
    };
  }),
  createdAt: now,
  updatedAt: now,
};

/* --------------------------- strength routines ----------------------- */
// The two stretch templates are skipped: the stretching protocol above is the
// same content, with the full list rather than a trimmed one.
const SKIP = new Set(['morning-stretch', 'evening-stretch']);

function doseFor(entry) {
  const sets = entry.sets ?? 1;
  if (entry.targetDuration) return `${sets} × ${entry.targetDuration} sec`;
  if (entry.targetReps) return `${sets} × ${entry.targetReps} reps`;
  return `${sets} sets`;
}

function exerciseItem(routineId, entry) {
  const ex = EXERCISE_BY_ID.get(entry.exerciseId);
  const level = ex?.progression?.find((p) => p.level === entry.currentLevel);
  return {
    id: `ex-${routineId}-${entry.exerciseId}`,
    name: ex?.name ?? entry.exerciseId,
    dose: doseFor(entry),
    why: ex?.muscles?.length ? ex.muscles.join(', ') : undefined,
    notes: section(
      ['Form', ex?.formCue],
      ['Starting level', level ? `${level.name}${level.note ? ` — ${level.note}` : ''}` : null],
      [null, ex?.details],
      ['Equipment', ex?.equipment],
    ),
    phaseIds: [],
  };
}

const routineProtocols = ROUTINE_TEMPLATES.filter((t) => !SKIP.has(t.id)).map((t) => {
  // Start at the gentlest variant. Levels are a choice you make, not one the
  // conversion should make for you.
  const variant = t.variants?.easy ?? Object.values(t.variants ?? {})[0] ?? [];
  return {
    id: `routine-${t.id}`,
    name: t.name,
    notes: `${t.description}. Switch this on for the day you are doing it. Starting at the easiest level of each movement — raise it as you go.`,
    active: false,
    phases: [],
    blocks: [
      {
        id: `routine-${t.id}-main`,
        name: t.name,
        order: 0,
        items: variant.map((e) => exerciseItem(t.id, e)),
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
});

export const movementProtocols = [bodyworkProtocol, stretchingProtocol, ...routineProtocols];
