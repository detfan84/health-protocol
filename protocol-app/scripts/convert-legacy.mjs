// convert-legacy.mjs — carries the supplement protocol out of the old app
// and into this one's file format.
//
// The old app kept its content as hardcoded JavaScript (src/data/*.js). This
// app keeps content as data you own and can edit. The shapes line up almost
// field for field, so this is a translation, not a redesign.
//
// Two rules it follows:
//   1. Nothing is silently dropped. The old app had fields this app's schema
//      has no home for (requiresFood, fallback). Rather than lose them, they
//      are folded into the item's notes, where a person will actually read
//      them. A "never take without food" warning going missing is a safety
//      problem, not a formatting one.
//   2. IDs are preserved. The old item id 'tudca' stays 'tudca', so if this
//      is ever re-run it updates items rather than duplicating them.
//
// Run: npm run convert    (writes protocol-file.json in this folder)

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateFile } from '../src/lib/protocolFile.js';
import { FILE_FORMAT, SCHEMA_VERSION } from '../src/lib/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const OLD = resolve(here, '../../src/data');

const { BLOCKS } = await import(pathToFileURL(resolve(OLD, 'blocks.js')).href);
const { SUBPHASES, PHASE_META } = await import(pathToFileURL(resolve(OLD, 'phases.js')).href);

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/* ------------------------------- phases ------------------------------ *
 * The old app had four big phases, each split into sub-phases with real day
 * counts. This app's phases are one flat ordered list with a `days` each —
 * which is exactly the sub-phase shape. So the sub-phases become the phases,
 * and the parent phase name rides along in the label so the arc stays legible.
 * ------------------------------------------------------------------- */
const parentName = new Map(PHASE_META.map((p) => [p.id, p.name]));
const phases = SUBPHASES.map((sp, i) => ({
  id: `ph-${sp.pid}-${slug(sp.name)}`,
  name: `${sp.name} — ${parentName.get(sp.pid) ?? ''}`.replace(/ — $/, ''),
  days: sp.days,
  order: i,
}));
// An old item says "phases: [1, 2]", meaning the parent phases. Expand that to
// every sub-phase inside them.
const phaseIdsFor = (parentIds = []) =>
  phases.filter((ph) => parentIds.includes(Number(ph.id.split('-')[1]))).map((ph) => ph.id);

/* ------------------------------ time ------------------------------- */
// hr: [5, 7] means "roughly 5am to 7am". 24 is midnight-as-end-of-day, which
// is not a valid clock time — 23:59 is.
const hhmm = (h) => (h >= 24 ? '23:59' : `${String(h).padStart(2, '0')}:00`);

/* ------------------------------ notes ------------------------------ */
const FOOD = {
  strict: 'NEVER take this without food — it can cause harm on an empty stomach.',
  preferred: 'Better with food; tolerable with a small snack.',
};
function notesFor(it) {
  return [
    it.requiresFood ? FOOD[it.requiresFood] : null,
    it.details || null,
    it.fallback ? 'Currently using what is on hand — a stopgap, not the intended product.' : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const now = new Date().toISOString();

const protocol = {
  id: 'supplement-protocol',
  name: 'Supplement Protocol',
  notes:
    'Carried over from the previous app. Doses, reasoning and phase timing are ' +
    'as they were there — edit anything that has changed.',
  active: true,
  phases,
  blocks: BLOCKS.map((b, i) => ({
    id: b.id,
    name: b.label ? `${b.time} — ${b.label}` : b.time,
    start: hhmm(b.hr[0]),
    end: hhmm(b.hr[1]),
    order: i,
    items: b.items.map((it) => ({
      id: it.id,
      name: it.n,
      dose: it.d,
      why: it.w,
      notes: notesFor(it),
      phaseIds: phaseIdsFor(it.phases),
    })),
  })),
  createdAt: now,
  updatedAt: now,
};

// Emitted as a 'backup' rather than a 'protocol' on purpose. The app's Data
// screen only imports backups; it tells you to import a protocol "from the
// Protocols screen", which currently has no import button. Until that gap is
// closed, a one-protocol backup is the only door that actually opens. Imports
// merge and never delete, so bringing this in cannot lose anything already
// on the device.
const file = {
  format: FILE_FORMAT,
  kind: 'backup',
  schemaVersion: SCHEMA_VERSION,
  exportedAt: now,
  data: { protocols: [protocol], days: [], labs: [], settings: [] },
};

// Check it against the app's own importer before writing. If this app would
// reject the file, there is no point producing it.
const result = validateFile(file);
if (!result.ok) {
  console.error('The converted file failed this app\'s own validator:');
  for (const e of result.errors) console.error(' -', e.path ?? '', e.message ?? e);
  process.exit(1);
}

const out = resolve(here, '..', 'supplement-protocol.json');
await writeFile(out, JSON.stringify(file, null, 2) + '\n', 'utf8');

const items = protocol.blocks.reduce((n, b) => n + b.items.length, 0);
console.log(`ok: ${protocol.blocks.length} blocks, ${items} items, ${phases.length} phases`);
if (result.warnings.length) {
  console.log(`${result.warnings.length} warning(s) from the validator:`);
  for (const w of result.warnings.slice(0, 10)) console.log('  -', w.path ?? '', w.message ?? w);
}
console.log('wrote', out);
