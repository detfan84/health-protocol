// facet-tags.mjs — deriving `type` and `effect` for the whole catalogue.
//
// The catalogue has 376 items and no facets. Hand-tagging them is a week of
// work with a week's worth of mistakes in it, so this derives what the existing
// fields already say and leaves a short list of exceptions to be argued with.
//
// Two sources, in order of trust:
//
//   `role`     is already an effect on 118 items — release, activate, stretch,
//              balance, nerve-glide. Where it exists it WINS, because it was
//              authored per item rather than inherited from a shelf.
//   `category` is the seven-questions field (TAXONOMY §1). For effect it is a
//              blunt instrument, but a blunt instrument aimed at the right
//              question: every value maps to exactly one reading.
//
// Where the two disagree the disagreement is real and role is right. The
// eleven `activate / release` items are the loading halves of release-and-load
// pairs: their shelf says release, their role says activate, and the role is
// what the item does.
//
// `kind` is deliberately not a source. It is the five files of the 2025 app
// (TAXONOMY T7) and it already disagrees with itself.

/** role → effect. Authored per item, so it wins. */
export const EFFECT_BY_ROLE = {
  release: ['release'],
  activate: ['activate'],
  'nerve-glide': ['mobilise'],
  balance: ['control'],
  stretch: ['lengthen'],
};

/** category → effect. Every one of the 26 values, so nothing falls through. */
export const EFFECT_BY_CATEGORY = {
  release: ['release'],
  'entry-points': ['release'],
  ribs: ['release'],
  recovery: ['release'],       // eight foam-roller items, all of them release
  breath: ['calm'],
  vagal: ['calm'],
  mind: ['calm'],
  sleep: ['calm'],
  detox: ['circulate'],
  mobility: ['mobilise'],
  nerve: ['mobilise'],
  range: ['lengthen', 'load'], // contract–relax, eccentrics, the squat hang
  airway: ['activate'],
  balance: ['control'],
  vestibular: ['control'],
  core: ['load'],
  push: ['load'],
  pull: ['load'],
  legs: ['load'],
  kettlebell: ['load'],
  mace: ['load'],
  athletic: ['condition', 'load'], // jumps and sprints: capacity, and real load
  jump_rope: ['condition'],
  martial_arts: ['condition'],
  movement: ['condition'],
  measure: [],                 // a measurement does nothing to you
};

/** category → tradition, so retiring the shelf does not lose where it came from. */
export const TRADITION_BY_CATEGORY = { martial_arts: 'martial-arts', athletic: 'athletic' };

/** category and the free-text equipment field → equipment ids. */
export const EQUIPMENT_BY_CATEGORY = { kettlebell: 'kettlebell', mace: 'mace', jump_rope: 'rope' };
export const EQUIPMENT_BY_FIELD = {
  bodyweight: 'none', None: 'none', band: 'band', dumbbell: 'dumbbell',
  foam_roller: 'roller', pullup_bar: 'pullup-bar', parallel_bars: 'pullup-bar',
  bench: 'chair', balance_board: 'balance-board', jump_box: 'step',
  kettlebell: 'kettlebell', mace: 'mace', jump_rope: 'rope',
};

/**
 * type. Three rules and no list:
 *
 *   a self-test is a measurement — it produces a number, or it should (D36);
 *   a technique guide is teaching, always;
 *   an awareness cue is teaching WHEN IT IS NOT A DRILL, and the item says
 *     which by how it is tracked. The six eye drills carrying this role are
 *     timed — they are practices with a cue attached. The ten that are ticked
 *     are explainers: what a nerve glide is, where not to press on a neck,
 *     which kind of dizziness is yours.
 *
 * Everything else is a practice. No `intake` or `record` content exists yet.
 */
export function typeOf(item) {
  if (item.kind === 'selftest') return 'measurement';
  if (item.role === 'technique-guide') return 'teaching';
  if (item.role === 'awareness-cue' && (item.tracking ?? 'check') === 'check') return 'teaching';
  return 'practice';
}

export function effectOf(item, type = typeOf(item)) {
  if (type !== 'practice') return []; // teaching and measurement do nothing to the body
  const byRole = EFFECT_BY_ROLE[item.role];
  if (byRole) return byRole;
  return EFFECT_BY_CATEGORY[item.category] ?? null; // null = the caller must fail loudly
}

/**
 * Tag one item. Returns a NEW item, or throws naming what it could not read —
 * a category with no mapping is a new shelf somebody added, and guessing an
 * effect for it would put an invented answer in the ledger's own vocabulary.
 *
 * `kind` is dropped here: `type` now carries the only real question it was
 * answering, and everything else it said was which file the item came from.
 *
 * `category` is KEPT, and that is not an oversight. Push, pull and legs are a
 * movement pattern, and no facet holds one yet (TAXONOMY §1 lists it as one of
 * the seven questions). Under the §10.1 rule a legacy field keeps its name
 * until its replacement can carry the information — and for 77 items this one
 * still carries something nothing else does.
 */
/**
 * Movement pattern (TAXONOMY §10.2). Data rather than derivation, because the
 * proposal came from matching exercise names and ten of the hundred and
 * forty-eight were wrong — a substring rule made a leg press a push and found a
 * hop inside "Woodchop". The corrections are in the file with their reasons.
 */
export function applyPatterns(items, file) {
  const byId = new Map((file?.entries ?? []).map((e) => [e.id, e]));
  const present = new Set(items.map((i) => i.id));
  const orphans = [...byId.keys()].filter((id) => !present.has(id));
  if (orphans.length) {
    throw new Error(`pattern-tags.json names items that are not in the catalogue:\n    ${orphans.join('\n    ')}`);
  }
  return items.map((item) => {
    const e = byId.get(item.id);
    if (!e || e.noPattern || !e.pattern?.length) return item;
    return { ...item, pattern: [...e.pattern] };
  });
}

export function tagItem(item, overrides = new Map()) {
  const type = typeOf(item);
  const override = overrides.get(item.id);
  const effect = override ? override.effect : effectOf(item, type);
  if (effect === null) {
    throw new Error(`item "${item.id}" has category "${item.category}", which has no effect mapping. Add it to EFFECT_BY_CATEGORY — do not guess one at build time.`);
  }
  // `kind` and `category` both retire here (T7, T9). `kind` was the five source
  // files of the 2025 app. `category` answered seven questions at once, and the
  // last one it held alone — the movement pattern — is a facet now, so the rule
  // in §10.1 has run out of reasons to keep it: a legacy field keeps its name
  // only while it carries something nothing else can.
  //
  // They are read from, and then dropped. The SOURCES keep them — this is the
  // build artifact — so the derivations above go on working.
  const { kind, category, categoryName, ...rest } = item;
  const out = { ...rest, type };
  if (effect.length) out.effect = [...effect];

  const tradition = TRADITION_BY_CATEGORY[item.category];
  if (tradition && !out.tradition) out.tradition = tradition;

  // `equipment` arrives as one of two things: a short enum-ish value from the
  // exercise import ("bodyweight", "band"), or prose written for a reader
  // ("A ball and a wall, or a foam roller"). Only the first is a facet value.
  //
  // Seeding the set from `out.equipment` directly turned the second kind into
  // its own letters — `new Set("Foam roller")` is a set of characters — and
  // shipped 334 items filed under "F", "o", "a", "m". A string is iterable and
  // that is exactly why this has to be explicit.
  const prose = typeof out.equipment === 'string' ? out.equipment : null;
  const equipment = new Set(Array.isArray(out.equipment) ? out.equipment : []);
  const fromCategory = EQUIPMENT_BY_CATEGORY[item.category];
  if (fromCategory) equipment.add(fromCategory);
  const fromField = prose ? EQUIPMENT_BY_FIELD[prose] : undefined;
  if (fromField) equipment.add(fromField);

  if (equipment.size) out.equipment = [...equipment].sort();
  else delete out.equipment;

  // Prose that mapped to nothing is instruction, not a filter. It belongs in
  // fields.tool, where the card already says what to pick up — and where most
  // of these items were already carrying the same sentence.
  if (prose && !fromField) {
    const fields = { ...(out.fields ?? {}) };
    if (!fields.tool) {
      fields.tool = prose;
      out.fields = fields;
    }
  }

  return out;
}

export function tagAll(items, overrideFile) {
  const overrides = new Map((overrideFile?.overrides ?? []).map((o) => [o.id, o]));
  const seen = new Set();
  const out = items.map((item) => {
    if (overrides.has(item.id)) seen.add(item.id);
    return tagItem(item, overrides);
  });
  // An override for an item that is not in the catalogue is a rename or a
  // deletion nobody followed through, and it will sit there being wrong
  // silently. Every other file in this build fails loudly; so does this one.
  const orphans = [...overrides.keys()].filter((id) => !seen.has(id));
  if (orphans.length) {
    throw new Error(`facet-overrides.json names items that are not in the catalogue:\n    ${orphans.join('\n    ')}`);
  }
  return out;
}
