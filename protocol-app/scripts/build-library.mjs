// build-library.mjs — the whole catalogue, as data the app ships.
//
// The point of the app, in Kevin's words (23 Aug): "This should be
// comprehensive for anyone in the world to be able to use and self-select what
// fits their needs." Not a curated day for one person — a large library, and
// the person picks from it.
//
// So this emits EVERYTHING, in one shape, browsable:
//
//   190 exercises, each with its progression levels, form cue, full how-to,
//       muscles and equipment
//    31 stretches with their details, muscles and easy/standard/advanced notes
//    33 body-work cards with tool / release / load / notice / careful + photos
//    19 daily practices
//    14 measured self-tests — how to take the measurement, and which way is
//       better, so a number means something
//
// starter.json is what a person WAKES UP TO. library.json is what they can
// reach for. Nothing is chosen for anybody here; being in the library costs
// nothing and asks nothing.
//
// ---------------------------------------------------------------------------
// FROZEN, 28 Aug 2026. This script's product is now src/content/imported-legacy
// .json — the legacy half of the catalogue — and NOT library.json, which since
// the freeze is the MERGED shelf written by build-catalog.mjs.
//
// It used to write library.json. Left that way it was a silent-data-loss path
// of exactly the class D24 forbids: one `npm run library` would overwrite the
// merged catalogue with the legacy 258 and every authored item would vanish,
// with a success message on the console. So it is retargeted, and it refuses to
// run without --re-freeze, because the freeze note says regenerate only if
// master changes and master is not changing.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OLD = resolve(here, '../../src/data');
const OLD_PHOTOS = resolve(here, '../../public/bodywork-images');
const OUT_DIR = resolve(here, '..', 'src/content');
const load = (f) => import(pathToFileURL(resolve(OLD, f)).href);

// Refuse by default. A re-freeze is a deliberate act with a reason behind it —
// master changed — and there is no situation in which somebody wants this to
// happen because they typed a familiar command out of habit.
if (!process.argv.includes('--re-freeze')) {
  console.error(`
build-library: refusing to run.

  This regenerates the FROZEN legacy import, which is not something a routine
  build does. The catalogue the app reads is built by:

      npm run catalog

  If master genuinely changed and the legacy import needs rebuilding from it:

      npm run re-freeze

  See src/content/imported-legacy.json's _meta block for what the freeze is and
  why it exists.
`);
  process.exit(1);
}

const { EXERCISES } = await load('exercises.js');
const { STRETCH_LIBRARY } = await load('stretching.js');
const { SECTIONS, PHOTOS, EVERY, METRICS } = await load('bodywork.js');
const { DEFAULT_MOVEMENTS } = await load('movements.js');

const clean = (o) => Object.fromEntries(
  Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)),
);

const items = [];

/* ----------------------------- exercises ----------------------------- */
// Each progression level is kept as a level, not flattened into separate
// items: "Wall Push-Up" is not a different exercise from "Push-Up", it is
// where you start, and a person choosing needs to see the ladder.

for (const ex of EXERCISES) {
  items.push(clean({
    id: `ex-${ex.id}`,
    name: ex.name,
    kind: 'exercise',
    category: ex.category,
    equipment: ex.equipment,
    muscles: ex.muscles,
    tracking: ex.trackingType === 'duration' ? 'duration' : 'sets',
    why: ex.formCue,
    fields: clean({
      release: ex.details,
      notice: ex.muscles?.length ? `Where the work should land: ${ex.muscles.join(', ')}.` : undefined,
    }),
    levels: (ex.progression ?? []).map((s) => clean({ level: s.level, name: s.name, note: s.note })),
  }));
}

/* ------------------------------ stretches ---------------------------- */

for (const [key, st] of Object.entries(STRETCH_LIBRARY)) {
  items.push(clean({
    id: `st-${key}`,
    name: st.name,
    kind: 'stretch',
    category: 'mobility',
    equipment: 'bodyweight',
    muscles: st.muscles,
    tracking: 'duration',
    fields: clean({
      release: st.details,
      notice: st.muscles?.length ? `Where you should feel it: ${st.muscles.join(', ')}.` : undefined,
    }),
    levels: (st.variants ?? []).map((v, i) => clean({ level: i + 1, name: v.level, note: v.note })),
  }));
}

/* ----------------------------- body work ----------------------------- */
// The generalising rewrites live in build-content.mjs and are imported rather
// than repeated, so the library and the shipped day can never disagree about
// what a card says.

const { GENERALISE, SECTION_NOTES } = await import(pathToFileURL(resolve(here, 'generalise.mjs')).href);

// The prototype's cards come in TWO shapes, and for the whole life of this
// port only one of them was read.
//
//   10 cards (the release section)  tool · release · load · notice · careful
//   23 cards (everything else)      tool · steps · dose · feels · notice · careful
//
// `steps`, `dose` and `feels` were read by nothing, so 22 of the 33 shipped
// cards told you what tool to pick up, what to notice and what to be careful
// of, and never what to do. Roughly 8,700 characters of instruction sat in
// this file's own source, unread, since the port. Fixed 28 Aug 2026.
//
// One card encodes a ladder inside its steps (`bl-prog`, five rungs). Those
// become real `levels`, which is the shape the rung chooser and `activeLevel`
// already understand — a ladder flattened into prose would lose the thing that
// makes it usable.
const LEVEL_RE = /^LEVEL\s+(\d+)\s*[—–-]\s*(.+)$/i;

/**
 * Split a `steps` array into a ladder and the prose around it.
 *
 * The rung's name is the source text up to a real sentence boundary, or the
 * whole thing when there isn't one. Deliberately not cleverer than that: a
 * tidier label would be one this file invented, and these are somebody's own
 * words about their own drill.
 */
function fromSteps(steps) {
  const list = (Array.isArray(steps) ? steps : []).map((x) => String(x).trim()).filter(Boolean);
  const levels = [];
  const prose = [];
  for (const step of list) {
    const m = step.match(LEVEL_RE);
    if (!m) { prose.push(step); continue; }
    const body = m[2].trim();
    const cut = body.indexOf('. ');
    levels.push(clean({
      level: Number(m[1]),
      name: cut === -1 ? body.replace(/\.$/, '') : body.slice(0, cut),
      note: cut === -1 ? undefined : body.slice(cut + 2).trim(),
    }));
  }
  return { levels, release: prose.join(' ') };
}

for (const section of SECTIONS) {
  for (const card of section.items) {
    const over = GENERALISE[card.id] ?? {};
    const take = (k) => (over[k] ?? card[k] ?? '').trim();
    const photos = (PHOTOS?.[card.id] ?? [])
      .filter((ph) => existsSync(resolve(OLD_PHOTOS, `${ph.set}_0.jpg`)))
      .map((ph) => clean({ set: ph.set, caption: ph.cap, approx: ph.approx || undefined }));
    // The two shapes are disjoint — no card has both `release` and `steps` —
    // so this reads whichever one the card actually uses.
    const stepped = fromSteps(over.steps ?? card.steps);
    // `feels` is "what it should feel like", which is what to notice. It sits
    // on the stepped cards, not the release ones, so it appends rather than
    // competes.
    const feels = String(over.feels ?? card.feels ?? '').trim();
    items.push(clean({
      id: `bw-${card.id}`,
      name: card.name,
      kind: 'bodywork',
      category: section.id,
      categoryName: section.name,
      equipment: take('tool') || 'bodyweight',
      tracking: 'check',
      // What the card asks for. Ported as written; its provenance gets tagged
      // at S1 rather than blocking the fix on a provenance pass (Kevin, 28 Aug).
      dose: String(over.dose ?? card.dose ?? '').trim(),
      why: SECTION_NOTES[section.id] ?? section.note,
      fields: clean({
        tool: take('tool'),
        release: take('release') || stepped.release,
        load: take('load'),
        notice: [take('notice'), feels].filter(Boolean).join(' '),
        careful: take('careful'),
      }),
      levels: stepped.levels,
      photos,
      everyNDays: Number.isInteger(EVERY?.[card.id]) && EVERY[card.id] > 1 ? EVERY[card.id] : undefined,
    }));
  }
}

/* ----------------------------- practices ----------------------------- */

for (const m of DEFAULT_MOVEMENTS ?? []) {
  items.push(clean({
    id: `sup-${m.id}`,
    name: m.n,
    kind: 'practice',
    category: m.category,
    tracking: 'check',
    why: m.w,
  }));
}

/* --------------------------- measured tests -------------------------- */
// Numbers a person can take on themselves, with how to take them the same way
// every time — which is the only thing that makes a second reading mean
// anything. Shipped as library items so they can be added to a day like
// anything else; the trend view they deserve is a later build.

for (const m of METRICS ?? []) {
  items.push(clean({
    id: `test-${m.key}`,
    name: m.label,
    kind: 'selftest',
    category: 'measure',
    tracking: 'check',
    why: m.cadence ? `Re-test: ${m.cadence}. ${m.better === 'up' ? 'Higher is better.' : 'Lower is better.'}` : undefined,
    fields: clean({
      release: m.how,
      notice: m.unit ? `Recorded in ${m.unit}.` : undefined,
    }),
    sides: m.sides || undefined,
  }));
}

/* ------------------------------- write ------------------------------- */

// The same movement can exist in two source files — "Downward Dog" is in both
// the stretch library and the exercise library, each knowing something the
// other does not. One shelf, one entry, and MERGED rather than picked: keeping
// the "winner" quietly threw away 28 stretches by relabelling them as
// exercises, which is how a filter comes to show three things.
//
// Kind is decided by how specifically the source describes the thing: a
// body-work card knows more about what it is than a general exercise library
// does.
const KIND_RANK = { bodywork: 5, selftest: 4, practice: 3, stretch: 2, exercise: 1 };

function merge(a, b) {
  const [strong, weak] = (KIND_RANK[a.kind] ?? 0) >= (KIND_RANK[b.kind] ?? 0) ? [a, b] : [b, a];
  const longer = (x, y) => (String(y ?? '').length > String(x ?? '').length ? y : x);
  const fields = { ...(weak.fields ?? {}) };
  for (const [k, v] of Object.entries(strong.fields ?? {})) fields[k] = longer(fields[k], v);
  return clean({
    ...weak,
    ...strong,
    fields,
    muscles: [...new Set([...(a.muscles ?? []), ...(b.muscles ?? [])])],
    photos: (a.photos?.length ?? 0) >= (b.photos?.length ?? 0) ? a.photos : b.photos,
    // Progression ladders and difficulty variants are different things; keep
    // whichever list is longer rather than interleaving two scales.
    levels: (a.levels?.length ?? 0) >= (b.levels?.length ?? 0) ? a.levels : b.levels,
    why: longer(a.why, b.why),
  });
}

const byName = new Map();
for (const it of items) {
  const key = it.name.trim().toLowerCase();
  byName.set(key, byName.has(key) ? merge(byName.get(key), it) : it);
}

const library = {
  format: 'protocol-app/library-v1',
  items: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
};
library.version = createHash('sha256').update(JSON.stringify(library.items)).digest('hex').slice(0, 12);

let sha = '(unknown — not a git checkout)';
try {
  sha = execSync('git rev-parse master', { cwd: resolve(here, '../..') }).toString().trim();
} catch { /* the stamp says so rather than inventing one */ }

const frozen = {
  format: library.format,
  _meta: {
    file: 'imported-legacy.json — the legacy catalogue, frozen.',
    generated: new Date().toISOString().slice(0, 10),
    generatedFrom: `master@${sha}${sha.length >= 7 ? ` (short ${sha.slice(0, 7)})` : ''}, via scripts/build-library.mjs --re-freeze`,
    sourceFiles: 'src/data/{exercises,stretching,bodywork,movements}.js on the master branch',
    ruling: "Frozen per Kevin's ruling of 28 Aug 2026: nothing is being written into the old app; the new app replaces it. Strategy v0.5 §4, Option 2.",
    doNotEdit: 'Do not hand-edit this file. New content is authored in src/content/authored/<category>.json and merged by scripts/build-catalog.mjs.',
    regenerate: 'Only if master changes, which it is not expected to. `npm run re-freeze`, then `npm run catalog` to rebuild the shelf.',
    itemCount: library.items.length,
    generatorVersionHash: library.version,
  },
  version: library.version,
  items: library.items,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, 'imported-legacy.json'), `${JSON.stringify(frozen, null, 2)}\n`);

const byKind = {};
for (const it of library.items) byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
console.log(`library: ${library.items.length} items (${items.length - library.items.length} duplicates merged) —`, Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', '));
console.log(`muscles: ${new Set(library.items.flatMap((i) => i.muscles ?? [])).size} · equipment: ${new Set(library.items.map((i) => i.equipment).filter(Boolean)).size}`);
console.log(`wrote src/content/imported-legacy.json (${(JSON.stringify(frozen).length / 1024).toFixed(0)} KB), version ${library.version}, from master@${sha.slice(0, 7)}`);
console.log('\nThe shelf the app reads is NOT updated yet. Run `npm run catalog`.');
