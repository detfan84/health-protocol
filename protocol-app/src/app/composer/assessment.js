// assessment.js — what the app needs to know before it can deal you a day.
//
// Kevin, 31 Aug: "there should be a thing for me to take an initial assessment
// so it can know what my problem areas are and be intentionally devise what
// kind of releases and stretches and exercises and things that I should be
// doing to work on the problem areas."
//
// WHAT THIS IS NOT: the Recognition Quiz. That one composes module toggles from
// a deterministic tree over the Connection map, and the roadmap marks the map
// itself as Kevin's critical path with §3–9 outstanding (roadmap, Recognition
// quiz line). R26 puts the template slate behind a fuller library too. Neither
// is buildable today, and faking either would be sorting people into lanes —
// exactly what D16 forbids.
//
// What IS buildable is the half Kevin actually asked for, because the machinery
// it feeds now exists: seeded findings and weights, the dial, and the safety
// settings. D16 names those as quiz output in their own right — "module toggles
// + seeded findings/weights + dial/safety settings" — so this is three of the
// four, with the fourth waiting on the map.
//
// THE QUESTION-EARNING RULE (D16), applied without exceptions: "a question
// belongs in the bank only if some answer changes the output." Every question
// below carries a `changes` line naming what moves when it is answered, and a
// test asserts every one of them is real. That rule is why SLEEP POSITION IS
// NOT ASKED HERE, even though FRAMEWORK's onboarding order lists it: nothing
// yet consumes it. The wake block is fixed content, the unwind-the-night bias
// is not implemented, and a question whose answer changes nothing is a question
// that wastes the one bit of patience a new person has.
//
// And no labels, ever (D16). Picking "hips" seeds weight on hips. It does not
// make you a Hip Person, it does not name a condition, and it gates nothing —
// the whole library stays browsable and addable regardless.

import { makeEvent } from './findings.js';

/** Everything under a node, so "my hips" reaches the muscles in them. */
export function descendantsOf(anatomy, id) {
  const out = new Set();
  const walk = (parent) => {
    for (const node of Object.values(anatomy ?? {})) {
      if (!(node.parents ?? []).includes(parent) || out.has(node.id)) continue;
      out.add(node.id);
      walk(node.id);
    }
  };
  walk(id);
  return [...out];
}

/**
 * The areas somebody would name about themselves.
 *
 * Each is an anatomy node the catalogue can actually work, because an area you
 * can pick and nothing can address is a promise the app cannot keep.
 */
export const AREAS = [
  { id: 'neck', name: 'Neck', also: 'stiffness, turning your head' },
  { id: 'jaw', name: 'Jaw', also: 'clenching, grinding' },
  { id: 'head', name: 'Head', also: 'tension headaches' },
  { id: 'shoulder-girdle', name: 'Shoulders', also: 'rounding, reaching overhead' },
  { id: 'upper-back', name: 'Upper back', also: 'between the shoulder blades' },
  { id: 'chest', name: 'Chest', also: 'tight in front, hard to open' },
  { id: 'ribs', name: 'Ribs and breathing', also: 'shallow breath, tight sides' },
  { id: 'low-back', name: 'Low back', also: 'aching, seizing up' },
  { id: 'deep-core', name: 'Deep core', also: 'the deep support, pelvic floor' },
  { id: 'hip', name: 'Hips', also: 'tight, pinching, sitting all day' },
  { id: 'thigh', name: 'Thighs', also: 'hamstrings, quads, groin' },
  { id: 'lower-leg', name: 'Calves and shins', also: 'cramping, tight ankles' },
  { id: 'foot', name: 'Feet', also: 'arches, plantar pain' },
  { id: 'forearm', name: 'Forearms and wrists', also: 'grip, typing, gripping' },
];

export const DIALS = [
  { id: 'light', name: 'Light', also: 'a few minutes — enough to keep the thread' },
  { id: 'standard', name: 'Standard', also: 'the middle setting' },
  { id: 'deep', name: 'Deep', also: 'when there is time and you want the work' },
];

/**
 * D28, and the copy matters as much as the mechanism.
 *
 * Self-designation, NEVER screening-as-diagnosis. The app does not decide this
 * about anybody and does not use the answer to name a condition — it sets where
 * the dial starts and how fast it may climb, and nothing else.
 */
export const PACING = [
  {
    id: 'steady',
    name: 'Doing more is mostly fine',
    also: 'A hard day might leave you sore. It does not knock you out for days.',
  },
  {
    id: 'careful',
    name: 'Doing too much costs me later',
    also: 'Sometimes a day or two later, out of proportion to what you did. This is a pattern, not a diagnosis, and it is worth bringing to a clinician.',
  },
];

export const EQUIPMENT = [
  { id: 'band', name: 'Resistance band' },
  { id: 'dumbbell', name: 'Dumbbells' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'pullup-bar', name: 'Pull-up bar' },
  { id: 'roller', name: 'Foam roller' },
  { id: 'ball', name: 'Massage ball' },
  { id: 'chair', name: 'A chair' },
  { id: 'wall', name: 'A clear wall' },
  { id: 'step', name: 'A step or box' },
  { id: 'balance-board', name: 'Balance board' },
  { id: 'rope', name: 'Rope' },
  { id: 'mace', name: 'Mace or club' },
];

/**
 * How the day starts — which is Kevin's, and a correction.
 *
 * The shipped wake block is called "Before your feet touch the floor" and he
 * says plainly that it is not what he does: "it was a misread on what I said
 * that I do." FRAMEWORK agrees with him and the content does not — "the anchor
 * ritual itself belongs to the user; the app schedules around it, never inside
 * it." So it gets asked rather than assumed.
 */
export const MORNING = [
  { id: 'in-bed', name: 'In bed, before I get up', also: 'The first block happens where you wake up.' },
  { id: 'on-feet', name: 'Once I am up and moving', also: 'The first block waits until you are on your feet.' },
];

/**
 * The bank. `changes` is not documentation — a test reads it, and a question
 * that cannot say what it changes does not ship.
 */
export const QUESTIONS = [
  {
    id: 'areas',
    ask: 'Where does it bother you?',
    note: 'Pick as many as you like, or none. This is not a diagnosis and it does not lock anything — you can change it whenever, and the whole library stays open either way.',
    kind: 'multi',
    options: AREAS,
    changes: 'seeds weight on those parts, so the composer deals their work first',
  },
  {
    id: 'pacing',
    ask: 'When you do more than usual, what happens?',
    note: 'This sets where the dial starts and how fast it climbs. It is not a label and the app never names a condition from it.',
    kind: 'one',
    options: PACING,
    changes: 'caps the dial and how quickly it may rise',
  },
  {
    id: 'dial',
    ask: 'How much do you want in a session?',
    note: 'Change it any day. Nothing is lost by picking the small one.',
    kind: 'one',
    options: DIALS,
    changes: 'sets how many things are dealt into a session',
  },
  {
    id: 'equipment',
    ask: 'What do you have?',
    note: 'Only so the app stops offering you things you cannot do. Most of the library needs nothing at all.',
    kind: 'multi',
    options: EQUIPMENT,
    changes: 'stops the composer dealing work that needs kit you do not have',
  },
  {
    id: 'morning',
    ask: 'When does your day actually start?',
    note: 'The app schedules around your morning; it does not get to be inside it.',
    kind: 'one',
    options: MORNING,
    changes: 'moves the first block, and renames it to match what you actually do',
  },
];

/** Careful pacing starts light and cannot be talked past standard (D28). */
export function capDial(dial, pacing) {
  if (pacing !== 'careful') return dial ?? 'standard';
  return dial === 'deep' ? 'standard' : (dial ?? 'light');
}

/**
 * Answers → what the composer reads.
 *
 * Returns events and settings; it writes nothing itself, so it can be tested
 * and shown back to somebody before anything is saved.
 */
export function seedFrom(answers = {}, { anatomy = {}, reachable = [] } = {}) {
  const canReach = new Set(reachable);
  const events = [];
  const notes = [];

  for (const areaId of answers.areas ?? []) {
    const area = AREAS.find((a) => a.id === areaId);
    if (!area) continue;
    // The area AND everything under it, filtered to what some item can actually
    // work. Seeding "hip" alone would not lift a single glute exercise, because
    // items target the muscles rather than the region they sit in.
    const nodes = [areaId, ...descendantsOf(anatomy, areaId)].filter((n) => canReach.has(n));
    if (!nodes.length) {
      notes.push(`${area.name} was chosen and nothing in the library works it yet`);
      continue;
    }
    events.push(makeEvent({
      kind: 'hot-spot',
      nodes,
      source: 'quiz-seed',
      note: `you named ${area.name.toLowerCase()} as somewhere that bothers you`,
    }));
  }

  const pacing = answers.pacing ?? null;
  const dial = capDial(answers.dial, pacing);
  if (pacing === 'careful' && answers.dial === 'deep') {
    notes.push('Deep was asked for and the dial starts at Standard — it can climb from there');
  }

  const settings = [
    { key: 'composer.dial', value: dial },
    { key: 'composer.pacing', value: pacing },
    { key: 'composer.equipment', value: answers.equipment ?? [] },
    { key: 'composer.morning', value: answers.morning ?? null },
    // Provenance: what was answered, so the focus list can say "quiz seed" and
    // mean something, and so re-taking it can start from what was said before.
    { key: 'composer.assessment', value: { ...answers }, takenAt: new Date().toISOString() },
  ];

  return { events, settings, notes };
}
