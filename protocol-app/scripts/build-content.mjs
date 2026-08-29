// build-content.mjs — carries the body-work library into the app, as content
// the app SHIPS rather than content one person imports.
//
// Why this exists, stated plainly: the old app had 33 body-work cards — fascia
// release, pressure points, breathing, airway, nerve glides, balance, vagal
// work — with photographs and a per-card frequency. The rebuild converted them
// into a file that was gitignored, switched off, and never deployed. So the
// app people actually open had no movement content of any kind, while the
// content sat in the repo working perfectly.
//
// PLAN §6 already ruled this: generic starter content ships, and "the body
// work, breathing and mobility content is general enough to be useful to
// anyone". This script is that ruling, executed.
//
// What it does NOT carry: the supplement protocol (one person's regimen, and
// brand names — decision 3), and the personal laterality/surgical detail in a
// handful of cards. Those are rewritten by GENERALISE below, in the open, so
// anybody can read exactly what was changed and why.

import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
const OLD = resolve(here, '../../src/data');
const OLD_PHOTOS = resolve(here, '../../public/bodywork-images');
const OUT_DIR = resolve(appDir, 'src/content');
const OUT_PHOTOS = resolve(OUT_DIR, 'photos');

const load = (f) => import(pathToFileURL(resolve(OLD, f)).href);

import { dayArcProtocol } from './day-arc.mjs';
import { GENERALISE, SECTION_NOTES } from './generalise.mjs';

/* ------------------------------------------------------------------ *
 * Personal detail → general instruction.
 *
 * Each entry replaces one string on one card. The rule applied: keep every
 * instruction and every caution, drop the fact that it is about THIS body.
 * "The right hip clicks and subluxes" becomes "if a hip clicks or gives way"
 * — the person who has that hip still gets the warning; the person who does
 * not is not told they have it.
 * ------------------------------------------------------------------ */
/** Drop the personal "fix" tag ("right primary") and apply any rewrite. */
function generalise(cardId, card) {
  const over = GENERALISE[cardId] ?? {};
  const take = (k) => (over[k] ?? card[k] ?? '').trim();
  return {
    tool: take('tool'),
    release: take('release'),
    load: take('load'),
    notice: take('notice'),
    careful: take('careful'),
  };
}

/* ------------------------------------------------------------------ */

const { SECTIONS, PHOTOS, EVERY } = await load('bodywork.js');
const { STRETCHING_ROUTINES, STRETCH_LIBRARY } = await load('stretching.js');
const { DEFAULT_MOVEMENTS } = await load('movements.js');
const { ROUTINE_TEMPLATES } = await load('routines.js');
const { EXERCISES } = await load('exercises.js');

function photosFor(cardId) {
  const sets = PHOTOS?.[cardId] ?? [];
  return sets
    .filter((ph) => existsSync(resolve(OLD_PHOTOS, `${ph.set}_0.jpg`)))
    .map((ph) => ({ set: ph.set, caption: ph.cap, ...(ph.approx ? { approx: true } : {}) }));
}

/** "every N days" from the old library's own numbers — never invented here. */
function cadenceFor(cardId) {
  const n = EVERY?.[cardId];
  if (!Number.isInteger(n) || n <= 1) return undefined; // 1 = daily = the default
  return { kind: 'everyNDays', n };
}

/* ---------------------------- body work ---------------------------- */
// One block per section, untimed: this is work that belongs to the day rather
// than to a clock. The per-card frequency does the thinning, so Today deals a
// handful rather than all 33.

const bodyBlocks = SECTIONS.map((section, order) => ({
  id: `bw-${section.id}`,
  name: section.name,
  order,
  items: section.items.map((card) => {
    const fields = generalise(card.id, card);
    const photos = photosFor(card.id);
    const item = { id: `bw-${card.id}`, name: card.name };
    const note = SECTION_NOTES[section.id] ?? section.note;
    if (note) item.why = note;
    if (Object.values(fields).some(Boolean)) {
      item.fields = Object.fromEntries(Object.entries(fields).filter(([, v]) => v));
    }
    if (photos.length) item.photos = photos;
    const cadence = cadenceFor(card.id);
    if (cadence) item.cadence = cadence;
    return item;
  }),
}));

/* ---------------------------- stretching ---------------------------- */
// The morning and evening flows, as timed blocks — this is the routine a
// person is looking for when they open the app at 7am and at bedtime. The old
// app offered 5/10/15/20/25/30-minute versions; the 10-minute one ships,
// because a routine you actually do beats a longer one you skip. The others
// are one edit away in the same file.

function flowBlock(routine, { id, name, start, minutes }) {
  const list = routine?.durations?.[minutes] ?? [];
  return {
    id,
    name,
    start,
    order: 0,
    items: list.map((step, i) => {
      // The old helper hands over { key, name, duration, note, details… } —
      // read its own field names rather than guessing, or the steps arrive
      // nameless and the validator throws them away.
      const lib = STRETCH_LIBRARY?.[step.key] ?? {};
      const item = {
        id: `st-${id}-${step.key ?? i}`,
        name: step.name ?? lib.name ?? String(step.key ?? `Step ${i + 1}`),
        dose: Number.isFinite(step.duration) ? `${step.duration} sec` : undefined,
      };
      if (step.note) item.why = step.note;
      if (Number.isFinite(step.duration)) {
        item.tracking = 'duration';
        item.amount = { seconds: step.duration };
      }
      if (step.details && !lib.details) item.fields = { release: step.details };
      if (lib.details) item.fields = { release: lib.details };
      if (lib.muscles?.length) {
        item.fields = { ...(item.fields ?? {}), notice: `Where you should feel it: ${lib.muscles.join(', ')}.` };
      }
      return Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined));
    }),
  };
}

const morning = flowBlock(STRETCHING_ROUTINES.morning, {
  id: 'flow-morning', name: 'Morning flow', start: '07:00', minutes: 10,
});
const evening = flowBlock(STRETCHING_ROUTINES.evening, {
  id: 'flow-evening', name: 'Evening wind-down', start: '21:00', minutes: 10,
});
evening.order = 1;

/* ----------------------------- the file ----------------------------- */

const now = new Date().toISOString();

/* ------------------------ daily support & detox ---------------------- */
// Walking, lymphatic work, sweat, cold, breathing, sunlight, grounding — the
// practices that are not a routine and not a supplement, and that the rebuild
// carried across not at all. Dry brushing is in here: it is the lymphatic
// drainage work, and its absence was the first thing anybody noticed.
//
// The cadence is the honest part. A walk is daily. A coffee enema is not
// something an app should ask for every morning, so the occasional practices
// are "when needed" — present, never due, never late.

const SUPPORT_CADENCE = {
  walk: undefined, stretch: undefined, breath: undefined, meditate: undefined,
  journal: undefined, sunlight: undefined, grounding: undefined,
  drybrush: { kind: 'everyNDays', n: 2 },
  sweat: { kind: 'timesPerWeek', n: 3 },
  workout: { kind: 'timesPerWeek', n: 3 },
  cold: { kind: 'timesPerWeek', n: 3 },
};
const AS_NEEDED = new Set(['castor', 'enema', 'oilpull', 'cupping', 'acupressure']);

const SUPPORT_BLOCKS = [
  { key: 'movement', name: 'Movement' },
  { key: 'detox', name: 'Drainage & recovery' },
  { key: 'mind', name: 'Mind & nervous system' },
];

const supportBlocks = SUPPORT_BLOCKS.map((group, order) => ({
  id: `sup-${group.key}`,
  name: group.name,
  order,
  items: (DEFAULT_MOVEMENTS ?? [])
    .filter((m) => m.category === group.key)
    .map((m) => {
      const item = { id: `sup-${m.id}`, name: m.n };
      if (m.w) item.why = m.w;
      const cadence = AS_NEEDED.has(m.id) ? { kind: 'asNeeded' } : SUPPORT_CADENCE[m.id];
      if (cadence) item.cadence = cadence;
      return item;
    }),
})).filter((b) => b.items.length);

/* ----------------------------- strength ------------------------------ */
// Eight routines exist; two of them (Morning Stretch, Evening Wind-Down)
// duplicate the flows above and are skipped. Full Body ships switched ON at
// three sessions a week — a strength routine nobody can see is the whole
// mistake this file exists to fix — and the others ship as protocols you can
// switch on for the day you are doing them, which is how training actually
// works.

const SKIP_ROUTINES = new Set(['morning-stretch', 'evening-stretch']);
const LEVEL = 'medium'; // the middle variant; easy and hard are one edit away

function exerciseItem(entry, i) {
  const ex = (EXERCISES ?? []).find((e) => e.id === entry.exerciseId);
  if (!ex) return null;
  const step = ex.progression?.find((s) => s.level === entry.currentLevel);
  const item = {
    id: `ex-${entry.exerciseId}`,
    name: step?.name && step.name !== ex.name ? `${ex.name} — ${step.name}` : ex.name,
    cadence: { kind: 'timesPerWeek', n: 3 },
    // What the app should let you WRITE DOWN. The library already says whether
    // an exercise is counted in reps or held for time; carry that across, or
    // the training log has nothing to attach itself to.
    tracking: ex.trackingType === 'duration' || entry.targetDuration ? 'duration' : 'sets',
    amount: Object.fromEntries(Object.entries({
      sets: entry.sets,
      reps: entry.targetReps,
      seconds: entry.targetDuration,
    }).filter(([, v]) => Number.isFinite(v))),
  };
  if (!Object.keys(item.amount).length) delete item.amount;
  const dose = entry.targetReps
    ? `${entry.sets} × ${entry.targetReps}`
    : entry.targetDuration
      ? `${entry.sets} × ${entry.targetDuration} sec`
      : undefined;
  if (dose) item.dose = dose;
  if (ex.formCue) item.why = ex.formCue;
  const fields = {};
  if (ex.details) fields.release = ex.details;
  if (step?.note) fields.tool = step.note;
  if (ex.muscles?.length) fields.notice = `Where the work should land: ${ex.muscles.join(', ')}.`;
  if (Object.keys(fields).length) item.fields = fields;
  return item;
}

const routineProtocols = (ROUTINE_TEMPLATES ?? [])
  .filter((r) => !SKIP_ROUTINES.has(r.id))
  .map((r, i) => ({
    id: `seed-routine-${r.id}`,
    name: r.name,
    notes: `${r.description ?? ''} Switch this on for the days you are doing it.`.trim(),
    active: r.id === 'full-body',
    phases: [],
    blocks: [{
      id: `rt-${r.id}`,
      name: r.name,
      order: 0,
      items: (r.variants?.[LEVEL] ?? []).map(exerciseItem).filter(Boolean),
    }],
    createdAt: now,
    updatedAt: now,
  }))
  .filter((p) => p.blocks[0].items.length);


const starter = {
  format: 'protocol-app/v1',
  kind: 'backup',
  schemaVersion: 2,
  exportedAt: now,
  data: {
    protocols: [
      // The anchors first: this is the day the app is actually about.
      dayArcProtocol(now),
      {
        id: 'seed-daily-flow',
        name: 'Morning and evening flow',
        notes: 'Two short routines, ten minutes each. Edit anything — it is yours now.',
        active: true,
        phases: [],
        blocks: [morning, evening],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed-support',
        name: 'Daily support',
        notes: 'Movement, drainage and downregulation — the practices that are not a routine and not a supplement. The occasional ones are marked "when needed": present, never late.',
        active: true,
        phases: [],
        blocks: supportBlocks,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'seed-body-work',
        name: 'Body work',
        notes: 'Release paired with the loading that keeps it, plus breathing, airway, nerve glides, balance and downregulation. Each card says how often it comes round; nothing here is daily unless it says so.',
        active: true,
        phases: [],
        blocks: bodyBlocks,
        createdAt: now,
        updatedAt: now,
      },
      ...routineProtocols,
    ],
    days: [],
    labs: [],
    settings: [],
  },
};

await mkdir(OUT_PHOTOS, { recursive: true });

// Copy only the photos the shipped cards actually reference.
const wanted = new Set();
for (const b of bodyBlocks) {
  for (const it of b.items) for (const ph of it.photos ?? []) wanted.add(ph.set);
}
const available = existsSync(OLD_PHOTOS) ? await readdir(OLD_PHOTOS) : [];
let copied = 0;
for (const file of available) {
  const set = file.replace(/_[01]\.jpg$/, '');
  if (!wanted.has(set)) continue;
  await cp(resolve(OLD_PHOTOS, file), resolve(OUT_PHOTOS, file));
  copied += 1;
}

/* ------------------------- version and timestamps -------------------- *
 *
 * Two problems, one fix.
 *
 * 1. The app applies the shipped content ONCE and remembers it did, keyed on
 *    `seedVersion` (see seedContentOnce in ui/app.js). This file never carried
 *    one, so the key was permanently the fallback string and every launch
 *    after the first returned early: anything added to the shipped content
 *    would reach new installs only. The file shipped, and the app declined to
 *    read it — the four-day empty-app lesson wearing a different hat.
 *
 * 2. Every run restamped createdAt/updatedAt, so starter.json diffed on every
 *    build even when not one word of content had changed. `updatedAt` is the
 *    merge referee (decision 15); a field that moves for no reason is a
 *    referee that has stopped refereeing.
 *
 * So: fingerprint the content with the timestamps taken out. That hash IS the
 * seed version — it changes exactly when the content changes, and never
 * otherwise. And when it matches what is already on disk, keep the timestamps
 * that are already there rather than writing new ones over identical content.
 */
function withoutStamps(value) {
  if (Array.isArray(value)) return value.map(withoutStamps);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !['createdAt', 'updatedAt', 'exportedAt', 'seedVersion'].includes(k))
        .map(([k, v]) => [k, withoutStamps(v)]),
    );
  }
  return value;
}

const OUT_FILE = resolve(OUT_DIR, 'starter.json');
const fingerprint = createHash('sha256')
  .update(JSON.stringify(withoutStamps(starter)))
  .digest('hex')
  .slice(0, 12);

let previous = null;
if (existsSync(OUT_FILE)) {
  try {
    previous = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  } catch {
    previous = null; // unreadable or half-written: treat as absent and restamp
  }
}

let restamped = false;
if (previous?.seedVersion === fingerprint) {
  // Same content. Put the existing timestamps back, so the file is byte-stable
  // and the diff is empty.
  starter.exportedAt = previous.exportedAt ?? starter.exportedAt;
  const before = new Map((previous.data?.protocols ?? []).map((p) => [p.id, p]));
  for (const p of starter.data.protocols) {
    const was = before.get(p.id);
    if (!was) continue;
    if (was.createdAt) p.createdAt = was.createdAt;
    if (was.updatedAt) p.updatedAt = was.updatedAt;
  }
  restamped = true;
}
starter.seedVersion = fingerprint;

await writeFile(OUT_FILE, `${JSON.stringify(starter, null, 2)}\n`);

const cards = bodyBlocks.reduce((n, b) => n + b.items.length, 0);
console.log(`body work: ${bodyBlocks.length} sections, ${cards} cards`);
console.log(`flows: morning ${morning.items.length} steps, evening ${evening.items.length} steps`);
console.log('day arc: 4 anchor blocks, each with a 60-second floor');
console.log(`support: ${supportBlocks.reduce((n, b) => n + b.items.length, 0)} practices`);
console.log(`routines: ${routineProtocols.length} (${routineProtocols.filter((p) => p.active).map((p) => p.name).join(', ') || 'none'} switched on)`);
console.log(`photos: ${copied} files for ${wanted.size} sets`);
console.log(`seed version: ${fingerprint}${restamped ? ' (unchanged — timestamps kept)' : ' (new — content changed)'}`);
console.log(`wrote src/content/starter.json (${(JSON.stringify(starter).length / 1024).toFixed(0)} KB)`);
