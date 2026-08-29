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
import { tagAll } from './facet-tags.mjs';
import { applyMeasureSpecs } from './measure-specs.mjs';
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
export const ANATOMY_FILE = resolve(CONTENT, 'vocab/anatomy.json');
export const FOLDIN_FILE = resolve(CONTENT, 'vocab/anatomy-foldin.json');
export const OVERRIDES_FILE = resolve(CONTENT, 'vocab/facet-overrides.json');
export const TAGS_FILE = resolve(CONTENT, 'vocab/anatomy-tags.json');
export const REFERRAL_FILE = resolve(CONTENT, 'referral.json');

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
  catalog.version = versionOf(catalog.items);
  return catalog;
}

/**
 * The catalogue's version: a hash of the items as shipped.
 *
 * Exported and re-applied because anything that CHANGES the items after the
 * merge has to move it. The anatomy fold-in did not, for one build: the hash
 * was taken inside mergeCatalog, the fold-in ran afterwards in main(), and the
 * file went out with 289 newly tagged items under the version string of the
 * untagged catalogue. A version that does not move when the content does is a
 * cache key pointing at the wrong content — the same class of failure as the
 * seedVersion that never changed and stopped shipped content reaching anybody.
 */
export function versionOf(items) {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex').slice(0, 12);
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

/**
 * Apply the anatomy fold-in (docs/TAXONOMY.md §3.1): the catalogue's free-text
 * `muscles` and `regions` become `target`, a list of anatomy node ids.
 *
 * Three rules, and the middle one is the point.
 *
 *   - `muscles` and `regions` are KEPT. This is a translation, not a
 *     replacement: the strings are what the source actually said, the ids are
 *     what we think it meant, and until a person has read the rows we do not
 *     throw away the evidence. When the ids are trusted the strings can go, in
 *     a commit that says so.
 *   - A string with no worklist row STOPS THE BUILD. Authoring a new muscle
 *     name is easy and silent; a catalogue that quietly carried it untranslated
 *     would drift straight back to the 94-strings problem this replaces (D24).
 *   - `notAnatomy` rows contribute nothing, on purpose. `posture` and
 *     `full body` are not places, and inventing a node for them so the numbers
 *     look tidy is how a vocabulary starts lying.
 */
export function applyFoldin(items, foldin, nodes) {
  const map = new Map();
  for (const e of foldin.entries ?? []) map.set(e.from, e);
  const missing = new Set();
  const usedReview = new Map();

  // `target` is the anatomy facet. It meant sets/reps/seconds until schema 3,
  // and an authored file still using it that way would have its dose silently
  // replaced by a list of node ids — the fold-in eating the prescription. That
  // is a build failure, not a warning.
  const stale = items.filter((i) => i.target && !Array.isArray(i.target)).map((i) => i.id);
  if (stale.length) {
    throw new Error(
      `these items use "target" for a dose, which is now the anatomy facet:\n    ${stale.join('\n    ')}\n` +
      '  Rename it to "amount" ({ sets, reps, seconds }) in the authored file.',
    );
  }

  const out = items.map((item) => {
    const strings = [...(item.muscles ?? []), ...(item.regions ?? [])];
    if (!strings.length) return item;
    const ids = new Set();
    for (const s of strings) {
      if (nodes.has(s)) { ids.add(s); continue; } // a `regions` value is already a node id
      const e = map.get(s);
      if (!e) { missing.add(s); continue; }
      if (e.notAnatomy) continue;
      if (e.review) usedReview.set(s, (usedReview.get(s) ?? 0) + 1);
      for (const id of e.to ?? []) ids.add(id);
    }
    return ids.size ? { ...item, target: [...ids].sort() } : item;
  });

  if (missing.size) {
    throw new Error(
      `these muscle or region names have no row in anatomy-foldin.json:\n    ${[...missing].join('\n    ')}\n` +
      '  Add a row (with "to", or "notAnatomy" and a reason) before the catalogue can be built.',
    );
  }
  return { items: out, usedReview };
}

/**
 * Anatomy for items the fold-in cannot reach — the ones carrying no `muscles`
 * or `regions` to translate.
 *
 * Eighty-seven items had no anatomy after the fold-in, and eleven of them were
 * the body-work release cards: "Calves", "Hamstrings", "Front of hip" — named
 * after the very thing they work on, and invisible to a search for it. The
 * 28 Aug correction log recorded that gap; the fold-in could not close it,
 * because a translation needs something to translate.
 *
 * An entry may say `noTarget` with a reason. That is a real answer — a teaching
 * card, a whole-body conditioning piece, a practice whose site is not
 * anatomical — and recording it stops the next person re-deriving the silence.
 */
export function applyAnatomyTags(items, file, nodes) {
  const byId = new Map((file.entries ?? []).map((e) => [e.id, e]));
  const unknownNode = [];
  const out = items.map((item) => {
    const e = byId.get(item.id);
    if (!e || e.noTarget || item.target?.length) return item;
    for (const t of e.target ?? []) if (!nodes.has(t)) unknownNode.push(`${item.id} \u2192 ${t}`);
    return { ...item, target: [...(e.target ?? [])].sort() };
  });
  if (unknownNode.length) {
    throw new Error(`anatomy-tags.json points at nodes that do not exist:\n    ${unknownNode.join('\n    ')}`);
  }
  const present = new Set(items.map((i) => i.id));
  const orphans = [...byId.keys()].filter((id) => !present.has(id));
  if (orphans.length) {
    throw new Error(`anatomy-tags.json names items that are not in the catalogue:\n    ${orphans.join('\n    ')}`);
  }
  return out;
}

/**
 * The item-to-item relations, checked (TAXONOMY §6.6, §6.7).
 *
 * `variationOf` and `before` point at other items by id, and a pointer that
 * misses is worse than no pointer: the screen has a relation to draw and
 * nothing to draw it to. A variation whose parent was renamed would go on
 * looking like a variation of something.
 */
export function checkRelations(items, nodes = new Map()) {
  const ids = new Set(items.map((i) => i.id));
  const broken = [];
  const unconditional = [];
  for (const item of items) {
    if (item.variationOf && !ids.has(item.variationOf)) broken.push(`${item.id}: variationOf "${item.variationOf}"`);
    for (const b of item.before ?? []) {
      const id = typeof b === 'string' ? b : b.item;
      if (!ids.has(id)) broken.push(`${item.id}: before "${id}"`);
      if (b?.test && !ids.has(b.test)) broken.push(`${item.id}: before.test "${b.test}"`);
      // A prerequisite with no condition is shown to EVERY reader. Kevin,
      // 29 Aug: the psoas release is only a prerequisite if your psoas is
      // tight. Unconditional is sometimes right and usually not, so this is
      // reported rather than refused — a build that says nothing about it is
      // how "do this first" becomes an instruction to people it is not for.
      if (typeof b === 'string' || !b?.when) unconditional.push(`${item.id} → ${id}`);
    }
  }
  // A test's outcomes are the router (TAXONOMY §5): each reading names the
  // anatomy it implicates and what to do about it. A reading that points at a
  // node or an item that does not exist routes somebody nowhere, which is worse
  // than a test with no outcomes at all — that one at least does not promise.
  for (const item of items) {
    for (const [n, o] of (item.outcomes ?? []).entries()) {
      const at = `${item.id}: outcome ${n + 1}`;
      if (!o.tell) broken.push(`${at} has no "tell" — a reading nobody can recognise is not a reading.`);
      if (!o.means) broken.push(`${at} has no "means" — the reading without its meaning routes nothing.`);
      for (const pt of o.points ?? []) if (nodes.size && !nodes.has(pt)) broken.push(`${at} points at "${pt}", which is not an anatomy node`);
      for (const th of o.then ?? []) if (!ids.has(th)) broken.push(`${at} sends you to "${th}", which is not in the catalogue`);
    }
    if (item.outcomes && item.type && item.type !== 'measurement') {
      broken.push(`${item.id}: only a measurement has outcomes — this is a ${item.type}.`);
    }
  }

  if (broken.length) {
    throw new Error(`these items point at catalogue entries that do not exist:\n    ${broken.join('\n    ')}`);
  }
  return { items, unconditional };
}

/**
 * The referral map (TAXONOMY §4, D37): where else a complaint can come from.
 *
 * Checked for the three ways it could quietly become useless. A site or a
 * candidate pointing at an anatomy node that does not exist joins nothing to
 * anything. A candidate routing to an item that is not in the catalogue sends
 * somebody to a blank. And a candidate with no grade is a causal claim made
 * without saying how well supported it is, which is the one thing law 5 will
 * not have — the local patterns and the postural-chain guesses cannot look
 * alike on the page.
 *
 * Red flags are required per site, not optional. A person arriving at a symptom
 * list is arriving with a symptom.
 */
export function checkReferral(file, nodes, items) {
  const ids = new Set(items.map((i) => i.id));
  const problems = [];
  const seen = new Set();
  for (const site of file?.sites ?? []) {
    const at = `site "${site.id ?? '(no id)'}"`;
    if (!site.id) problems.push(`${at}: needs an id.`);
    if (!site.name) problems.push(`${at}: needs a display name.`);
    if (seen.has(site.id)) problems.push(`${at}: duplicated.`);
    seen.add(site.id);
    if (!site.redFlags) problems.push(`${at}: no red flags. Every symptom list owes the reader the short list of things that are not this app's business.`);
    for (const n of site.at ?? []) if (!nodes.has(n)) problems.push(`${at}: sits at "${n}", which is not an anatomy node.`);
    if (!site.candidates?.length) problems.push(`${at}: has no candidates.`);
    for (const [i, c] of (site.candidates ?? []).entries()) {
      const cat = `${at}, candidate ${i + 1}`;
      for (const n of c.source ?? []) if (!nodes.has(n)) problems.push(`${cat}: source "${n}" is not an anatomy node.`);
      if (!c.source?.length) problems.push(`${cat}: names no source.`);
      if (!c.tell) problems.push(`${cat}: no tell — a candidate nobody can check is a suggestion, not a lead.`);
      for (const t of c.then ?? []) if (!ids.has(t)) problems.push(`${cat}: routes to "${t}", which is not in the catalogue.`);
      if (!c.then?.length) problems.push(`${cat}: routes nowhere.`);
      if (!c.evidence?.grade || !c.evidence?.basis) problems.push(`${cat}: no graded evidence. A causal claim without one reads exactly like a well-supported one (law 5).`);
    }
  }
  if (problems.length) {
    throw new Error(`referral.json has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ${problems.join('\n  - ')}`);
  }
  return file.sites;
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

  // The fold-in runs over the merged shelf, so an authored file cannot invent
  // a muscle name without the build saying so.
  let usedReview;
  let unconditional = [];
  try {
    const nodes = new Map(JSON.parse(await readFile(ANATOMY_FILE, 'utf8')).nodes.map((n) => [n.id, n]));
    const applied = applyFoldin(catalog.items, JSON.parse(await readFile(FOLDIN_FILE, 'utf8')), nodes);
    const tagged = applyAnatomyTags(applied.items, JSON.parse(await readFile(TAGS_FILE, 'utf8')), nodes);
    const faceted = applyMeasureSpecs(tagAll(tagged, JSON.parse(await readFile(OVERRIDES_FILE, 'utf8'))));
    const related = checkRelations(faceted, nodes);
    catalog.items = related.items;
    unconditional = related.unconditional;
    // The graph ships WITH the catalogue, slimmed to what a browser needs to
    // walk it: id, display name, parents. Without it the library screen can
    // show a tag but cannot roll one up, so picking "Glutes" would miss every
    // item tagged `glute-max` — the same invisibility this build just fixed,
    // one layer further out.
    // The map ships with the catalogue, like the graph, because a door that
    // needs a second fetch is a door that fails differently.
    catalog.referral = checkReferral(JSON.parse(await readFile(REFERRAL_FILE, 'utf8')), nodes, catalog.items);
    catalog.anatomy = [...nodes.values()].map((n) => ({
      id: n.id,
      name: n.name,
      ...(n.parents?.length ? { parents: n.parents } : {}),
    }));
    catalog.version = versionOf(catalog.items);
    usedReview = applied.usedReview;
  } catch (err) {
    console.error(`\nbuild-catalog: ${err.message}`);
    console.error('\nNothing was written. src/content/library.json is unchanged.\n');
    process.exit(1);
  }

  await writeFile(OUT, `${JSON.stringify(catalog)}\n`);

  const byType = {};
  const byEffect = {};
  for (const it of catalog.items) {
    byType[it.type] = (byType[it.type] ?? 0) + 1;
    for (const e of it.effect ?? []) byEffect[e] = (byEffect[e] ?? 0) + 1;
  }
  console.log(
    `catalog: ${catalog.items.length} items from ${catalog.sources.length} source${catalog.sources.length === 1 ? '' : 's'} —`,
    Object.entries(byType).map(([k, n]) => `${n} ${k}`).join(', '),
  );
  console.log(`effect: ${Object.entries(byEffect).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  for (const s of catalog.sources) console.log(`  ${s.file}: ${s.items}`);
  console.log(`muscles: ${new Set(catalog.items.flatMap((i) => i.muscles ?? [])).size} · equipment: ${new Set(catalog.items.map((i) => i.equipment).filter(Boolean)).size}`);
  if (unconditional.length) {
    console.log(`prerequisites with no condition — shown to every reader: ${unconditional.join(', ')}`);
  }
  const cands = catalog.referral.reduce((n, s) => n + s.candidates.length, 0);
  const graded = catalog.referral.flatMap((s) => s.candidates).filter((c) => c.evidence.grade === 'established').length;
  console.log(`referral: ${catalog.referral.length} sites, ${cands} candidates — ${graded} established, ${cands - graded} exploratory.`);
  const routers = catalog.items.filter((i) => i.outcomes?.length);
  const measurements = catalog.items.filter((i) => i.type === 'measurement');
  const scheduled = measurements.filter((i) => i.cadence);
  console.log(`self-tests: ${measurements.length} — all recording a real reading; ${scheduled.length} with a re-test cadence; ${routers.length} that route (TAXONOMY §5).`);
  const withTarget = catalog.items.filter((i) => i.target?.length).length;
  const bare = catalog.items.filter((i) => !i.target?.length);
  console.log(`anatomy: ${withTarget}/${catalog.items.length} items carry node ids (muscles and regions kept alongside).`);
  console.log(`  ${bare.length} with none — ${bare.filter((i) => i.type !== 'practice').length} teaching or measurement, ${bare.filter((i) => i.type === 'practice').length} practices.`);
  if (usedReview.size) {
    console.log('  applied from rows still flagged for review — each is a proposal, not a decision:');
    for (const [s, n] of [...usedReview].sort((a, b) => b[1] - a[1])) console.log(`    "${s}" on ${n} item${n === 1 ? '' : 's'}`);
  }
  console.log(`wrote src/content/library.json (${(JSON.stringify(catalog).length / 1024).toFixed(0)} KB), version ${catalog.version}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
