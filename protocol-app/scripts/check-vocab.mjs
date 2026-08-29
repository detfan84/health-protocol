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
export const ANATOMY = resolve(APP, 'src/content/vocab/anatomy.json');
export const FOLDIN = resolve(APP, 'src/content/vocab/anatomy-foldin.json');

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

/**
 * The anatomy graph (TAXONOMY.md §3). Multi-parent by design, so the checks are
 * a graph's checks rather than a tree's: parents must resolve, and no node may
 * reach itself. A cycle would make roll-up loop forever, and roll-up is the
 * whole reason the graph exists — tag `glute-med-min`, find it under `hip`.
 *
 * Aliases are checked for collisions across the whole graph, not within a node.
 * Two structures answering to "calf" is not a tidiness problem: it is a search
 * that quietly returns one of them.
 */
export function validateAnatomy(file, label = 'anatomy.json') {
  const problems = [];
  if (!Array.isArray(file?.nodes) || file.nodes.length === 0) throw new Error(`${label}: no nodes.`);

  const byId = new Map();
  for (const node of file.nodes) {
    const at = `node "${node.id ?? '(no id)'}"`;
    if (!node.id) problems.push(`${at}: needs an id.`);
    if (!node.name) problems.push(`${at}: needs a display name.`);
    if (!node.kind) problems.push(`${at}: needs a kind (region, area, structure, joint, system).`);
    if (byId.has(node.id)) problems.push(`${at}: duplicated.`);
    byId.set(node.id, node);
  }
  for (const node of file.nodes) {
    for (const parent of node.parents ?? []) {
      if (!byId.has(parent)) problems.push(`node "${node.id}": parent "${parent}" does not exist.`);
    }
    // An action is produced by structures; it is not part of them. Two edge
    // kinds, because "hip abduction" sits AT the hip and is produced BY the
    // glutes, and collapsing that into one relation loses the half a search
    // needs — a query for the action has to reach the muscles, downward.
    for (const m of node.producedBy ?? []) {
      if (!byId.has(m)) problems.push(`node "${node.id}": producedBy "${m}" does not exist.`);
    }
    if (node.kind === 'action' && !(node.producedBy ?? []).length) {
      problems.push(`node "${node.id}": an action with nothing producing it cannot be searched for.`);
    }
    if (node.kind !== 'action' && (node.producedBy ?? []).length) {
      problems.push(`node "${node.id}": only an action has producedBy.`);
    }
  }

  // No node may reach itself through its parents.
  const seen = new Map();
  const walk = (id, trail) => {
    if (trail.includes(id)) { problems.push(`cycle in the graph: ${[...trail, id].join(' → ')}.`); return; }
    if (seen.get(id)) return;
    for (const p of byId.get(id)?.parents ?? []) walk(p, [...trail, id]);
    seen.set(id, true);
  };
  for (const node of file.nodes) walk(node.id, []);

  const aliases = new Map();
  for (const node of file.nodes) {
    for (const a of [node.name, ...(node.also ?? [])]) {
      const key = String(a).toLowerCase();
      if (aliases.has(key) && aliases.get(key) !== node.id) {
        problems.push(`"${a}" is a name or alias of both "${aliases.get(key)}" and "${node.id}" — a search for it can only find one.`);
      }
      aliases.set(key, node.id);
    }
  }

  if (problems.length) throw new Error(`${label} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ${problems.join('\n  - ')}`);
  return byId;
}

/** Children, keyed by parent — the index every downward walk needs. */
export function childIndex(nodes) {
  const kids = new Map();
  for (const n of nodes.values()) {
    for (const p of n.parents ?? []) {
      if (!kids.has(p)) kids.set(p, []);
      kids.get(p).push(n.id);
    }
  }
  return kids;
}

/**
 * What a SEARCH for a node should match: the node, everything under it, and —
 * when it is an action — everything that produces it, with their descendants
 * too.
 *
 * This is the other direction from rollUp, and both are needed. Tagging is
 * upward (tag a glute, be found under "hip"); searching is downward (ask for
 * "glutes", get maximus and medius; ask for "hip abductors", get what performs
 * the abducting). One walk without the other gives a search that finds the
 * general and misses every specific, which is the failure Kevin named.
 */
export function expand(id, nodes, kids = childIndex(nodes)) {
  const out = new Set();
  const walk = (n) => {
    if (!n || out.has(n) || !nodes.has(n)) return;
    out.add(n);
    for (const c of kids.get(n) ?? []) walk(c);
    for (const m of nodes.get(n).producedBy ?? []) walk(m);
  };
  walk(id);
  return [...out];
}

/** Every node a tag implies, itself included — what makes a query for "hip" find a glute. */
export function rollUp(id, nodes) {
  const out = new Set();
  const walk = (n) => {
    if (!n || out.has(n)) return;
    out.add(n);
    for (const p of nodes.get(n)?.parents ?? []) walk(p);
  };
  walk(id);
  return [...out];
}

/**
 * The fold-in worklist: the catalogue's free-text muscle strings mapped onto
 * the graph. Checked, not applied — nothing reads it yet. What it must not do
 * is point at a node that does not exist, or quietly stop covering the
 * catalogue when somebody authors a new string.
 */
export function validateFoldin(file, nodes, items, label = 'anatomy-foldin.json') {
  const problems = [];
  const entries = file?.entries;
  if (!Array.isArray(entries) || entries.length === 0) throw new Error(`${label}: no entries.`);

  const mapped = new Set();
  for (const e of entries) {
    if (!e.from) { problems.push('an entry has no "from" string.'); continue; }
    mapped.add(e.from);
    if (e.notAnatomy) {
      if (!e.why) problems.push(`"${e.from}" is marked notAnatomy with no reason — the reason is the useful half.`);
      continue;
    }
    if (!Array.isArray(e.to) || e.to.length === 0) { problems.push(`"${e.from}": needs a "to" list, or notAnatomy.`); continue; }
    for (const t of e.to) if (!nodes.has(t)) problems.push(`"${e.from}" maps to "${t}", which is not a node.`);
    if (e.review && !e.why) problems.push(`"${e.from}" is flagged for review with no reason — a reviewer needs to know what the call was.`);
  }

  const inUse = new Set(items.flatMap((i) => i.muscles ?? []));
  for (const s of inUse) if (!mapped.has(s)) problems.push(`the catalogue uses "${s}" and the worklist does not mention it.`);

  if (problems.length) throw new Error(`${label} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ${problems.join('\n  - ')}`);
  return entries;
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
  let anatomy;
  let foldin;
  try {
    const vocab = await readJson(VOCAB);
    facets = validateVocab(vocab, rel(VOCAB));
    moments = validateOpportunities(await readJson(OPPORTUNITIES), facets.get('demands'), rel(OPPORTUNITIES));
    library = await readJson(LIBRARY);
    anatomy = validateAnatomy(await readJson(ANATOMY), rel(ANATOMY));
    foldin = validateFoldin(await readJson(FOLDIN), anatomy, library.items, rel(FOLDIN));
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

  const kinds = {};
  for (const n of anatomy.values()) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
  console.log(`\nanatomy: ${anatomy.size} nodes — ${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(', ')}.`);
  const kids = childIndex(anatomy);
  const show = (q) => {
    const hit = [...anatomy.values()].find((n) => [n.name, ...(n.also ?? [])].some((x) => String(x).toLowerCase() === q));
    if (!hit) return console.log(`  "${q}" — no node answers to this.`);
    console.log(`  "${q}".padEnd`.slice(0, 0) + `  ${`"${q}"`.padEnd(18)} → ${expand(hit.id, anatomy, kids).join(', ')}`);
  };
  for (const q of ['glutes', 'glute medius', 'hip abductors', 'knee over toe']) show(q);

  const clean = foldin.filter((e) => e.to && !e.review).length;
  const review = foldin.filter((e) => e.review);
  const notAnatomy = foldin.filter((e) => e.notAnatomy);
  const tags = (e) => e.items ?? 0;
  console.log(`fold-in: ${foldin.length} catalogue strings — ${clean} map cleanly, ${review.length} need a human, ${notAnatomy.length} were never anatomy.`);
  for (const e of review) console.log(`  review   ${`"${e.from}"`.padEnd(40)} → ${e.to.join(', ')}  (${tags(e)} item tag${tags(e) === 1 ? '' : 's'})`);
  for (const e of notAnatomy) console.log(`  no home  ${`"${e.from}"`.padEnd(40)} ${tags(e)} item tag${tags(e) === 1 ? '' : 's'}`);
  console.log('  Nothing applies this yet — it is a worklist (TAXONOMY.md §9.4).');

  console.log('\nSpec: docs/TAXONOMY.md. The anatomy graph is seeded, not finished: a node earns its place when something can target it distinctly (§3).\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
