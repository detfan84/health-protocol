// build-catalog.mjs — the catalogue the browser reads.
//
// Two kinds of source, one shelf:
//
//   src/content/imported-legacy.json   the 258 items generated once from the
//                                      old app and frozen (Kevin, 28 Aug 2026:
//                                      "nothing is being written into the old
//                                      app; the new app replaces it").
//   src/content/authored/*.json        everything written from here on, one
//                                      file per category, shipped as authored.
//
// This replaces build-library.mjs in the routine build. The generator is not
// deleted and still runs, but it reads a branch nobody will merge, and its
// product is now the frozen import rather than the live catalogue.
//
// The rule this file exists to enforce (D24, fail loudly): content must never
// disappear quietly. Two files claiming the same id is a mistake somebody made,
// and last-writer-wins would hide it behind a catalogue that looks fine and is
// missing an item. So a collision stops the build and names both files. A file
// that will not parse stops the build too — it does not get skipped so the app
// "still works", because an app that still works while silently holding less
// content is the exact failure this project keeps re-learning.
//
// The reading and the merging are exported separately from the command, so the
// failure paths can be tested rather than demonstrated once and trusted.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, '..');
const CONTENT = resolve(APP, 'src/content');

export const LEGACY = resolve(CONTENT, 'imported-legacy.json');
export const AUTHORED = resolve(CONTENT, 'authored');
export const OUT = resolve(CONTENT, 'library.json');

const rel = (p) => relative(APP, p).replace(/\\/g, '/');

/**
 * Read one catalogue source. Throws with a message that says which file, what
 * is wrong, and what to do — never returns a partial or an empty list, because
 * "carried on with less" is the failure being designed against.
 */
export async function readSource(path, label = rel(path)) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    throw new Error(`could not read ${label}.\n  ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `${label} is not valid JSON.\n  ${err.message}\n`
      + '  Fix the file. It is not skipped — a catalogue that quietly drops a category '
      + 'is worse than a build that stops.',
    );
  }
  if (!Array.isArray(parsed?.items)) {
    throw new Error(
      `${label} has no "items" list.\n`
      + '  Every catalogue source is { "items": [ ... ] }, with anything else alongside it as metadata.',
    );
  }
  return { file: label, items: parsed.items };
}

/**
 * Put every source on one shelf. `sources` is [{ file, items }] in precedence
 * order — though precedence never actually applies, because a collision is an
 * error rather than a contest.
 *
 * No field is filtered. A source file is authored deliberately, and this step's
 * job is to merge files — not to decide which of an author's fields deserve to
 * survive. Where a field has no render path yet, that is reported at review,
 * not silently resolved by deletion.
 */
export function mergeCatalog(sources) {
  const items = [];
  const byId = new Map();
  const byName = new Map();

  for (const source of sources) {
    for (const item of source.items) {
      const id = typeof item?.id === 'string' ? item.id.trim() : '';
      const name = typeof item?.name === 'string' ? item.name.trim() : '';

      if (!id) {
        throw new Error(
          `an item in ${source.file} has no id.\n`
          + `  Its name is ${name ? `"${name}"` : '(also missing)'}.\n`
          + '  Ids are permanent and names are labels — every item needs one.',
        );
      }
      if (!name) {
        throw new Error(
          `item "${id}" in ${source.file} has no name.\n`
          + '  A person has to be able to read it on a shelf.',
        );
      }

      const clashId = byId.get(id);
      if (clashId) {
        throw new Error(
          `two files claim the id "${id}".\n`
          + `  ${clashId.file}  — "${clashId.name}"\n`
          + `  ${source.file}  — "${name}"\n`
          + '  Ids are permanent, so one of these is wrong. Rename the newer one; do not let the build pick.',
        );
      }

      const clashName = byName.get(name.toLowerCase());
      if (clashName) {
        throw new Error(
          `two items share the name "${name}".\n`
          + `  ${clashName.file}  — id "${clashName.id}"\n`
          + `  ${source.file}  — id "${id}"\n`
          + '  The library lists by name, so these two are indistinguishable on the shelf.',
        );
      }

      // The audience tag moved out of `fields` on 28 Aug so it survives into a
      // person's day. Left inside, it validates, ships, renders nowhere and
      // gates nothing — a field that silently does nothing is the failure this
      // build is here to stop, so it is an error rather than a warning.
      if (item?.fields && item.fields.carefulAudience != null) {
        throw new Error(
          `item "${id}" in ${source.file} has carefulAudience inside "fields".\n`
          + '  It moved: it is now a sibling of fields, on the item itself.\n'
          + '  Inside fields it is filtered out by the validator and gates nothing.',
        );
      }

      byId.set(id, { file: source.file, name });
      byName.set(name.toLowerCase(), { file: source.file, id });
      items.push(item);
    }
  }

  // Family-inherited evidence, dereferenced.
  //
  // The release library grades evidence once per technique family and has its
  // items point at the family with `evidence.inheritsFrom`. That is the right
  // shape — one auditable grade instead of forty invented ones — but a pointer
  // is not a grade until something follows it, and nothing did: 48 items were
  // about to render "Evidence: not graded" while a resolvable grade sat one hop
  // away. Law 5 inverted by a dangling reference is worse than law 5 unenforced.
  //
  // So the pointer is followed here, at build time, and the shipped catalogue is
  // self-describing. `inheritsFrom` stays on the item so the provenance of the
  // grade is still visible and still auditable in one place.
  const gradeSources = new Map(
    items.filter((i) => i?.evidence?.grade && i.id).map((i) => [i.id, i.evidence]),
  );
  for (const item of items) {
    const from = item?.evidence?.inheritsFrom;
    if (!from) continue;
    const source = gradeSources.get(from);
    if (!source) {
      throw new Error(
        `item "${item.id}" inherits its evidence from "${from}", which has no grade to give.\n`
        + '  Either the id is wrong or that item is missing an evidence.grade.\n'
        + '  An unresolved grade renders as "not graded", which is a claim about the evidence rather than a gap in it.',
      );
    }
    item.evidence = {
      ...item.evidence,
      grade: source.grade,
      basis: source.basis,
      ...(source.family ? { family: source.family } : {}),
    };
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  const catalog = {
    format: 'protocol-app/library-v1',
    sources: sources.map((s) => ({ file: s.file, items: s.items.length })),
    items,
  };
  catalog.version = createHash('sha256').update(JSON.stringify(catalog.items)).digest('hex').slice(0, 12);
  return catalog;
}

/** Every source that makes up the shipped catalogue, in order. */
export async function collectSources({ legacy = LEGACY, authored = AUTHORED } = {}) {
  if (!existsSync(legacy)) {
    throw new Error(
      `${rel(legacy)} is missing.\n`
      + '  It is the frozen legacy import and the base of the catalogue.\n'
      + '  Regenerate it with `npm run re-freeze` only if master has changed — see its _meta block.',
    );
  }
  const sources = [await readSource(legacy)];
  if (existsSync(authored)) {
    const names = (await readdir(authored)).filter((f) => f.endsWith('.json')).sort();
    for (const name of names) {
      sources.push(await readSource(resolve(authored, name), `authored/${name}`));
    }
  }
  return sources;
}

/* ------------------------------ the command ------------------------------ */

async function main() {
  let catalog;
  try {
    catalog = mergeCatalog(await collectSources());
  } catch (err) {
    console.error(`\nbuild-catalog: ${err.message}`);
    console.error('\nNothing was written. src/content/library.json is unchanged.\n');
    process.exit(1);
  }

  await writeFile(OUT, `${JSON.stringify(catalog)}\n`);

  const byKind = {};
  for (const it of catalog.items) byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
  console.log(
    `catalog: ${catalog.items.length} items from ${catalog.sources.length} source${catalog.sources.length === 1 ? '' : 's'} —`,
    Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', '),
  );
  for (const s of catalog.sources) console.log(`  ${s.file}: ${s.items}`);
  console.log(`muscles: ${new Set(catalog.items.flatMap((i) => i.muscles ?? [])).size} · equipment: ${new Set(catalog.items.map((i) => i.equipment).filter(Boolean)).size}`);
  console.log(`wrote src/content/library.json (${(JSON.stringify(catalog).length / 1024).toFixed(0)} KB), version ${catalog.version}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
