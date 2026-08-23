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

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OLD = resolve(here, '../../src/data');
const OLD_PHOTOS = resolve(here, '../../public/bodywork-images');
const OUT_DIR = resolve(here, '..', 'src/content');
const load = (f) => import(pathToFileURL(resolve(OLD, f)).href);

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

for (const section of SECTIONS) {
  for (const card of section.items) {
    const over = GENERALISE[card.id] ?? {};
    const take = (k) => (over[k] ?? card[k] ?? '').trim();
    const photos = (PHOTOS?.[card.id] ?? [])
      .filter((ph) => existsSync(resolve(OLD_PHOTOS, `${ph.set}_0.jpg`)))
      .map((ph) => clean({ set: ph.set, caption: ph.cap, approx: ph.approx || undefined }));
    items.push(clean({
      id: `bw-${card.id}`,
      name: card.name,
      kind: 'bodywork',
      category: section.id,
      categoryName: section.name,
      equipment: take('tool') || 'bodyweight',
      tracking: 'check',
      why: SECTION_NOTES[section.id] ?? section.note,
      fields: clean({
        tool: take('tool'),
        release: take('release'),
        load: take('load'),
        notice: take('notice'),
        careful: take('careful'),
      }),
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

await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, 'library.json'), `${JSON.stringify(library)}\n`);

const byKind = {};
for (const it of library.items) byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
console.log(`library: ${library.items.length} items (${items.length - library.items.length} duplicates merged) —`, Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', '));
console.log(`muscles: ${new Set(library.items.flatMap((i) => i.muscles ?? [])).size} · equipment: ${new Set(library.items.map((i) => i.equipment).filter(Boolean)).size}`);
console.log(`wrote src/content/library.json (${(JSON.stringify(library).length / 1024).toFixed(0)} KB), version ${library.version}`);
