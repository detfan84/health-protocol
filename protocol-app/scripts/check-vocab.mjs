// check-vocab.mjs — the facet vocabularies, validated, and the catalogue
// measured against them.
//
// The vocabularies are data (D40) precisely so they can change without a code
// edit. The cost of that freedom is that nothing in the type system catches a
// duplicate id, a superseded value pointing at nothing, or a closed vocabulary
// quietly gaining a value. This does.
//
// It also reports coverage, which is the honest half: TAXONOMY.md claims the
// facets fit the 376 items already in the catalogue, and a claim like that
// decays the moment somebody authors a file. Run it and find out rather than
// trusting a number in a document — the same reason `viewLibrary.js` stopped
// writing its own item count in a comment.
//
// Reading, validating and reporting are exported separately from the command
// so the failure paths can be tested rather than demonstrated once and trusted.

import { readFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, '..');

export const VOCAB = resolve(APP, 'src/content/vocab/facets.json');
export const LIBRARY = resolve(APP, 'src/content/library.json');
export const OPPORTUNITIES = resolve(APP, 'src/content/vocab/opportunities.json');

const rel = (p) => relative(APP, p).replace(/\\/g, '/');

/** Read one JSON file, or throw saying which file and what to do about it. */
export async function readJson(path, label = rel(path)) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    throw new Error(`could not read ${label}.\n  ${err.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${label} is not valid JSON.\n  ${err.message}`);
  }
}

/**
 * Validate a vocabulary file. Returns the facets keyed by id; throws listing
 * every problem at once, because fixing one typo per run is how a person stops
 * running the check.
 */
export function validateVocab(vocab, label = 'facets.json') {
  const problems = [];
  const say = (msg) => problems.push(msg);

  if (vocab?.format !== 'protocol-app/vocab-v1') {
    say(`format is "${vocab?.format}" — expected "protocol-app/vocab-v1".`);
  }
  if (!Array.isArray(vocab?.facets) || vocab.facets.length === 0) {
    throw new Error(`${label}: no facets. ${problems.join(' ')}`.trim());
  }

  const byId = new Map();
  const everyValueId = new Map(); // "facet.value" → true, for supersession checks

  for (const facet of vocab.facets) {
    const at = `facet "${facet.id ?? '(no id)'}"`;
    if (!facet.id) say(`${at}: every facet needs an id.`);
    if (!facet.name) say(`${at}: needs a display name.`);
    if (!facet.question) say(`${at}: needs the one question it answers — see TAXONOMY.md §2.`);
    for (const flag of ['required', 'multi', 'closed']) {
      if (typeof facet[flag] !== 'boolean') say(`${at}: "${flag}" must be true or false, not ${JSON.stringify(facet[flag])}.`);
    }
    if (byId.has(facet.id)) say(`${at}: two facets share this id.`);
    byId.set(facet.id, facet);

    if (!Array.isArray(facet.values) || facet.values.length === 0) {
      say(`${at}: has no values.`);
      continue;
    }
    const seen = new Set();
    for (const v of facet.values) {
      const vat = `${at}, value "${v.id ?? '(no id)'}"`;
      if (!v.id) say(`${vat}: every value needs an id.`);
      if (!v.name) say(`${vat}: needs a display name — the id is never shown to a person.`);
      if (seen.has(v.id)) say(`${vat}: duplicated within its facet.`);
      seen.add(v.id);
      everyValueId.set(`${facet.id}.${v.id}`, true);
      if (v.also && !Array.isArray(v.also)) say(`${vat}: "also" must be a list of plain-language aliases.`);
    }
  }

  // Ids are append-only: a retired value is superseded, never deleted. Both
  // ends of every supersession must still exist, or the pointer is a dead end
  // and the old id has been lost after all.
  for (const s of vocab.supersessions ?? []) {
    const from = `${s.facet}.${s.from}`;
    const to = `${s.facet}.${s.to}`;
    if (!everyValueId.has(from)) say(`supersession ${from} → ${to}: "${s.from}" is not in the file. A superseded value stays, it does not get deleted.`);
    if (!everyValueId.has(to)) say(`supersession ${from} → ${to}: "${s.to}" does not exist.`);
  }

  if (problems.length) {
    throw new Error(`${label} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ${problems.join('\n  - ')}`);
  }
  return byId;
}

/**
 * The ordinary moments (TAXONOMY.md §6), checked against the `demands` facet.
 *
 * The two files are one mechanism split across two documents: an item says what
 * it needs available, a moment says what it takes, and a fit is the two sets
 * not intersecting. That only holds while both sides spell the values the same
 * way, and nothing else would notice if they stopped — a moment occupying
 * "both-hands" instead of "hands" would silently match everything.
 */
export function validateOpportunities(file, demands, label = 'opportunities.json') {
  const problems = [];
  if (!demands) problems.push('facets.json has no "demands" facet, so nothing can be checked against it.');
  const known = new Set(demands?.values.map((v) => v.id) ?? []);

  if (!Array.isArray(file?.opportunities) || file.opportunities.length === 0) {
    throw new Error(`${label}: no opportunities.`);
  }
  const seen = new Set();
  for (const o of file.opportunities) {
    const at = `opportunity "${o.id ?? '(no id)'}"`;
    if (!o.id) problems.push(`${at}: needs an id.`);
    if (!o.name) problems.push(`${at}: needs a display name.`);
    if (seen.has(o.id)) problems.push(`${at}: duplicated.`);
    seen.add(o.id);
    if (!Array.isArray(o.occupies)) {
      problems.push(`${at}: "occupies" must be a list — an empty one means the moment takes nothing, which is a real answer and not a missing one.`);
      continue;
    }
    for (const d of o.occupies) {
      if (!known.has(d)) problems.push(`${at}: occupies "${d}", which is not a value of the demands facet.`);
    }
    // `occupies` is what the moment makes UNAVAILABLE, and the two hand values
    // are ordered: anything that blocks one-handed work has already blocked
    // two-handed work. Authored the other way round it reads plausibly and
    // matches everything, which is the failure that is impossible to see.
    if (o.occupies.includes('one-hand') && !o.occupies.includes('hands')) {
      problems.push(`${at}: occupies "one-hand" but not "hands". A moment with no free hand blocks two-handed work too — see the note on the demands facet.`);
    }
  }
  if (problems.length) {
    throw new Error(`${label} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ${problems.join('\n  - ')}`);
  }
  return file.opportunities;
}

/** What an opportunity leaves free — the complement used to match items. */
export function fits(itemDemands = [], opportunity) {
  const taken = new Set(opportunity.occupies ?? []);
  return !itemDemands.some((d) => taken.has(d));
}

/**
 * How much of the catalogue each facet can already account for.
 *
 * Only the facets whose values exist in today's data are measured; `type`,
 * `effect`, `tissue` and `performedBy` are new vocabulary that nothing has been
 * tagged with yet, and reporting 0% for those would read as a failure rather
 * than as work not started. They are listed as untagged instead.
 */
export function coverage(facets, items) {
  const readers = {
    technique: (it) => (it.technique ? [it.technique] : []),
    context: (it) => it.context ?? [],
    tier: (it) => (it.tier ? [it.tier] : []),
    tradition: (it) => (it.category === 'martial_arts' ? ['martial-arts'] : it.category === 'athletic' ? ['athletic'] : []),
  };

  const rows = [];
  for (const [id, facet] of facets) {
    const read = readers[id];
    if (!read) { rows.push({ id, untagged: true, total: items.length }); continue; }
    const known = new Set(facet.values.map((v) => v.id));
    let tagged = 0;
    const unknown = new Map();
    for (const it of items) {
      const values = read(it);
      if (!values.length) continue;
      tagged += 1;
      for (const v of values) if (!known.has(v)) unknown.set(v, (unknown.get(v) ?? 0) + 1);
    }
    rows.push({ id, tagged, total: items.length, unknown: [...unknown.entries()].sort((a, b) => b[1] - a[1]) });
  }
  return rows;
}

/* ------------------------------ the command ------------------------------ */

async function main() {
  let facets;
  let library;
  let moments;
  try {
    const vocab = await readJson(VOCAB);
    facets = validateVocab(vocab, rel(VOCAB));
    moments = validateOpportunities(await readJson(OPPORTUNITIES), facets.get('demands'), rel(OPPORTUNITIES));
    library = await readJson(LIBRARY);
  } catch (err) {
    console.error(`\ncheck-vocab: ${err.message}\n`);
    process.exit(1);
  }

  const values = [...facets.values()].reduce((n, f) => n + f.values.length, 0);
  console.log(`vocab: ${facets.size} facets, ${values} values — valid.`);
  for (const [id, f] of facets) {
    const shape = [f.required ? 'required' : 'optional', f.multi ? 'multi' : 'single', f.closed ? 'closed' : 'open'].join(' · ');
    console.log(`  ${id.padEnd(12)} ${String(f.values.length).padStart(2)} values  (${shape})`);
  }

  console.log(`\ncatalogue: ${library.items.length} items`);
  for (const row of coverage(facets, library.items)) {
    if (row.untagged) { console.log(`  ${row.id.padEnd(12)} — not yet tagged on any item`); continue; }
    const pct = Math.round((row.tagged / row.total) * 100);
    let line = `  ${row.id.padEnd(12)} ${String(row.tagged).padStart(3)}/${row.total} tagged (${pct}%)`;
    if (row.unknown.length) line += ` — ${row.unknown.length} value${row.unknown.length === 1 ? '' : 's'} not in the vocabulary: ${row.unknown.map(([v, n]) => `${v} (${n})`).join(', ')}`;
    console.log(line);
  }
  const free = [...facets.get('demands').values.map((v) => v.id)];
  console.log(`\nordinary moments: ${moments.length} — valid against the demands facet.`);
  for (const o of moments) {
    const open = free.filter((d) => !(o.occupies ?? []).includes(d));
    console.log(`  ${o.id.padEnd(12)} leaves free: ${open.join(', ') || 'nothing'}`);
  }
  console.log('  (no item declares `demands` yet — TAXONOMY.md §9.3 has to land first.)');

  console.log('\nSpec: docs/TAXONOMY.md. Anatomy (facet "target") is a separate file and is not built yet — §9.4.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
