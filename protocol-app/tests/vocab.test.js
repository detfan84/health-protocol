// The facet vocabularies (docs/TAXONOMY.md §10).
//
// These pin the rules that make a data-defined vocabulary safe to change,
// which is the whole reason it is data: ids are append-only, a retired value is
// superseded rather than deleted, and a closed vocabulary cannot gain a value
// by accident. None of that is enforced by anything else — there is no type
// system between a JSON file and the composer that will one day read it.
//
// The last test is the one that matters most and looks least like a test: the
// shipped file must actually validate. A checker that only ever runs against
// fixtures is a checker nobody notices has stopped matching the content.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateVocab, validateOpportunities, validateAnatomy, validateFoldin, rollUp, expand, childIndex, fits, coverage, readJson, VOCAB, LIBRARY, OPPORTUNITIES, ANATOMY, FOLDIN } from '../scripts/check-vocab.mjs';

const facet = (id, values, extra = {}) => ({
  id,
  name: id,
  question: `what is ${id}?`,
  required: false,
  multi: false,
  closed: true,
  values,
  ...extra,
});
const vocab = (facets, supersessions = []) => ({
  format: 'protocol-app/vocab-v1',
  version: 1,
  facets,
  supersessions,
});
const val = (id) => ({ id, name: id });

/* ------------------------------- structure ------------------------------ */

test('a well-formed vocabulary validates and comes back keyed by facet id', () => {
  const byId = validateVocab(vocab([facet('demo', [val('release'), val('load')])]));
  assert.equal(byId.size, 1);
  assert.deepEqual(byId.get('demo').values.map((v) => v.id), ['release', 'load']);
});

test('a duplicated value id inside one facet is refused', () => {
  assert.throws(
    () => validateVocab(vocab([facet('demo', [val('release'), val('release')])])),
    /duplicated within its facet/,
  );
});

test('two facets cannot share an id', () => {
  assert.throws(
    () => validateVocab(vocab([facet('demo', [val('a')]), facet('demo', [val('b')])])),
    /two facets share this id/,
  );
});

test('a value with no display name is refused — the id is never shown to a person', () => {
  assert.throws(
    () => validateVocab(vocab([facet('demo', [{ id: 'release' }])])),
    /needs a display name/,
  );
});

test('required, multi and closed must each be stated, because absent is not false', () => {
  const f = facet('demo', [val('release')]);
  delete f.closed;
  assert.throws(() => validateVocab(vocab([f])), /"closed" must be true or false/);
});

test('a facet must say which single question it answers', () => {
  const f = facet('demo', [val('release')]);
  delete f.question;
  assert.throws(() => validateVocab(vocab([f])), /the one question it answers/);
});

test('every problem is reported at once, not one per run', () => {
  try {
    validateVocab(vocab([facet('demo', [{ id: 'a' }, { id: 'a', name: 'A' }])]));
    assert.fail('expected a throw');
  } catch (err) {
    assert.match(err.message, /2 problems/);
  }
});

/* ----------------------------- append-only ------------------------------ */

test('a supersession keeps both ends: the retired id stays in the file', () => {
  const v = vocab(
    [facet('demo', [val('mobilise'), val('mobilize')])],
    [{ facet: 'demo', from: 'mobilize', to: 'mobilise' }],
  );
  assert.doesNotThrow(() => validateVocab(v));
});

test('deleting a superseded value instead of keeping it is refused', () => {
  const v = vocab(
    [facet('demo', [val('mobilise')])],
    [{ facet: 'demo', from: 'mobilize', to: 'mobilise' }],
  );
  assert.throws(() => validateVocab(v), /it does not get deleted/);
});

test('a supersession pointing at a value that does not exist is refused', () => {
  const v = vocab(
    [facet('demo', [val('mobilize')])],
    [{ facet: 'demo', from: 'mobilize', to: 'mobilise' }],
  );
  assert.throws(() => validateVocab(v), /does not exist/);
});

/* ------------------------------- coverage ------------------------------- */

test('coverage counts what is tagged and names values the vocabulary does not have', () => {
  const byId = validateVocab(vocab([facet('technique', [val('tech-scrape')])]));
  const rows = coverage(byId, [
    { technique: 'tech-scrape' },
    { technique: 'tech-needling' },
    {},
  ]);
  assert.equal(rows[0].tagged, 2);
  assert.equal(rows[0].total, 3);
  assert.deepEqual(rows[0].unknown, [['tech-needling', 1]]);
});

test('a facet nothing is tagged with yet reads as untagged, not as zero coverage', () => {
  const byId = validateVocab(vocab([facet('tissue', [val('fascia')])]));
  const [row] = coverage(byId, [{ technique: 'tech-scrape' }]);
  assert.equal(row.untagged, true);
  assert.equal(row.tagged, undefined);
});

/* ---------------------------- the shipped file --------------------------- */

test('the vocabulary the app ships is valid', async () => {
  const byId = validateVocab(await readJson(VOCAB), 'src/content/vocab/facets.json');
  assert.ok(byId.size >= 9);
  assert.equal(byId.get('type').required, true, 'type is required on everything');
  // effect is required where it means something. A teaching card and a
  // self-test do nothing to the body, so an empty effect on them is the truth
  // rather than a gap.
  assert.deepEqual(byId.get('effect').requiredFor, ['practice']);
  assert.equal(byId.get('effect').required, false);
  for (const closed of ['type', 'effect', 'tissue']) {
    assert.equal(byId.get(closed).closed, true, `${closed} is a closed vocabulary`);
  }
});

test('every technique already used in the catalogue is in the vocabulary', async () => {
  const byId = validateVocab(await readJson(VOCAB));
  const library = await readJson(LIBRARY);
  const [row] = coverage(byId, library.items).filter((r) => r.id === 'technique');
  assert.deepEqual(row.unknown, [], 'the catalogue uses a technique the vocabulary has not got');
});

/* --------------------------- ordinary moments --------------------------- */
// TAXONOMY.md §6. Two files describing one mechanism: an item says what it
// needs available, a moment says what it makes unavailable, and a fit is the
// two sets not intersecting. Nothing but these tests notices if the halves
// stop spelling the values the same way.

const demandsFacet = {
  id: 'demands',
  name: 'demands',
  question: 'what does it need?',
  required: false,
  multi: true,
  closed: true,
  values: [{ id: 'hands', name: 'Both hands' }, { id: 'one-hand', name: 'One free hand' }, { id: 'eyes', name: 'Eyes' }],
};
const moments = (list) => ({ format: 'protocol-app/opportunities-v1', version: 1, opportunities: list });

test('a moment occupying a value the demands facet has not got is refused', () => {
  assert.throws(
    () => validateOpportunities(moments([{ id: 'dishes', name: 'Dishes', occupies: ['both-hands'] }]), demandsFacet),
    /not a value of the demands facet/,
  );
});

test('occupying one-hand without hands is refused — it would match everything', () => {
  assert.throws(
    () => validateOpportunities(moments([{ id: 'dishes', name: 'Dishes', occupies: ['one-hand'] }]), demandsFacet),
    /blocks two-handed work too/,
  );
});

test('a moment that occupies nothing is a real answer, not a missing one', () => {
  const [kettle] = validateOpportunities(moments([{ id: 'kettle', name: 'Kettle', occupies: [] }]), demandsFacet);
  assert.deepEqual(kettle.occupies, []);
  assert.equal(fits(['hands', 'eyes'], kettle), true);
});

test('"occupies" left off entirely is refused, because absent is not empty', () => {
  assert.throws(
    () => validateOpportunities(moments([{ id: 'kettle', name: 'Kettle' }]), demandsFacet),
    /must be a list/,
  );
});

test('a fit is the two sets not intersecting', () => {
  const teeth = { id: 'teeth', occupies: ['hands'] };
  assert.equal(fits(['one-hand'], teeth), true, 'one hand is still free while brushing');
  assert.equal(fits(['hands'], teeth), false, 'both hands are not');
  assert.equal(fits([], teeth), true, 'an item that needs nothing fits anything');
});

test('the shipped moments are valid, and the hand ordering holds across all of them', async () => {
  const facets = validateVocab(await readJson(VOCAB));
  const list = validateOpportunities(await readJson(OPPORTUNITIES), facets.get('demands'), 'opportunities.json');
  assert.ok(list.length >= 12);
  for (const o of list) {
    if (o.occupies.includes('one-hand')) assert.ok(o.occupies.includes('hands'), `${o.id} blocks one-handed work without blocking two-handed work`);
  }
});

/* ---------------------------- the anatomy graph -------------------------- */
// TAXONOMY.md §3. A graph, not a tree — the upper trapezius belongs to the
// neck, the shoulder girdle and the upper back at once — so these are a
// graph's invariants: parents resolve, nothing reaches itself, and roll-up
// terminates. Roll-up is the whole reason it exists: tag a glute, find it
// under "hip".

const graph = (nodes) => ({ format: 'protocol-app/anatomy-v1', version: 1, nodes });
const node = (id, parents = [], also = []) => ({ id, name: id, kind: 'structure', parents, also });

test('a parent that does not exist is refused', () => {
  assert.throws(() => validateAnatomy(graph([node('glute-max', ['hip'])])), /parent "hip" does not exist/);
});

test('a cycle is refused — roll-up would never terminate', () => {
  assert.throws(
    () => validateAnatomy(graph([node('a', ['b']), node('b', ['a'])])),
    /cycle in the graph/,
  );
});

test('two nodes cannot answer to the same alias', () => {
  assert.throws(
    () => validateAnatomy(graph([node('lower-leg', [], ['calf']), node('calves', [], ['calf'])])),
    /a search for it can only find one/,
  );
});

test('a node may have several parents, because the body does not branch tidily', () => {
  const nodes = validateAnatomy(graph([node('neck'), node('shoulder-girdle'), node('upper-back'),
    node('upper-trapezius', ['neck', 'shoulder-girdle', 'upper-back'])]));
  assert.deepEqual(rollUp('upper-trapezius', nodes).sort(), ['neck', 'shoulder-girdle', 'upper-back', 'upper-trapezius']);
});

test('roll-up is what makes tagging at honest precision safe', () => {
  const nodes = validateAnatomy(graph([node('hip-pelvis'), node('hip', ['hip-pelvis']), node('glute-med-min', ['hip'])]));
  assert.ok(rollUp('glute-med-min', nodes).includes('hip'), 'a search for hip must find a glute');
  assert.deepEqual(rollUp('hip-pelvis', nodes), ['hip-pelvis'], 'and must not drag the whole body along');
});

/* ----------------------------- the fold-in ------------------------------ */

test('the worklist cannot point at a node that does not exist', () => {
  const nodes = validateAnatomy(graph([node('hip')]));
  assert.throws(
    () => validateFoldin({ entries: [{ from: 'glutes', to: ['glute-max'] }] }, nodes, []),
    /is not a node/,
  );
});

test('a judgment call must say what the call was', () => {
  const nodes = validateAnatomy(graph([node('hip')]));
  assert.throws(
    () => validateFoldin({ entries: [{ from: 'glutes', to: ['hip'], review: true }] }, nodes, []),
    /a reviewer needs to know what the call was/,
  );
});

test('"not anatomy" must say why — the reason is the useful half', () => {
  const nodes = validateAnatomy(graph([node('hip')]));
  assert.throws(
    () => validateFoldin({ entries: [{ from: 'posture', notAnatomy: true }] }, nodes, []),
    /the reason is the useful half/,
  );
});

test('a string the catalogue uses and the worklist has never heard of is refused', () => {
  const nodes = validateAnatomy(graph([node('hip')]));
  assert.throws(
    () => validateFoldin({ entries: [{ from: 'hips', to: ['hip'] }] }, nodes, [{ muscles: ['knees'] }]),
    /the catalogue uses "knees" and the worklist does not mention it/,
  );
});

test('the shipped graph and worklist are valid, and the worklist still covers the catalogue', async () => {
  const nodes = validateAnatomy(await readJson(ANATOMY), 'anatomy.json');
  const library = await readJson(LIBRARY);
  const entries = validateFoldin(await readJson(FOLDIN), nodes, library.items, 'anatomy-foldin.json');
  assert.ok(nodes.size >= 100);
  assert.equal(entries.length, new Set(library.items.flatMap((i) => i.muscles ?? [])).size);
});

/* ------------------------- groups, actions, search ----------------------- */
// Kevin, 29 Aug: "searching for glutes pulls up all glutes, and searching glute
// medius or hip abductors will also fall under glutes." That is two walks, not
// one. Tagging goes UP so a specific tag is found under a general query;
// searching goes DOWN so a general query returns the specifics. A graph with
// only rollUp answers "hip" and loses "glute medius"; one with only expand
// answers "glutes" and loses the item tagged at the region.

const g = (nodes) => ({ format: 'protocol-app/anatomy-v1', version: 1, nodes });
const nd = (id, parents = [], extra = {}) => ({ id, name: id, kind: 'structure', parents, ...extra });
const action = (id, at, producedBy) => ({ id, name: id, kind: 'action', parents: [at], producedBy });

test('an action must say what produces it, or it cannot be searched for', () => {
  assert.throws(
    () => validateAnatomy(g([nd('hip'), { id: 'hip-abduction', name: 'x', kind: 'action', parents: ['hip'] }])),
    /an action with nothing producing it/,
  );
});

test('producedBy must resolve, like any other edge', () => {
  assert.throws(
    () => validateAnatomy(g([nd('hip'), action('hip-abduction', 'hip', ['glute-med-min'])])),
    /producedBy "glute-med-min" does not exist/,
  );
});

test('only an action carries producedBy — a muscle is not produced by anything', () => {
  assert.throws(
    () => validateAnatomy(g([nd('hip'), nd('glutes', ['hip'], { producedBy: ['hip'] })])),
    /only an action has producedBy/,
  );
});

test('searching a group returns the group and every specific under it', () => {
  const nodes = validateAnatomy(g([nd('hip'), nd('glutes', ['hip'], { kind: 'group' }),
    nd('glute-max', ['glutes']), nd('glute-med-min', ['glutes'])]));
  assert.deepEqual(expand('glutes', nodes).sort(), ['glute-max', 'glute-med-min', 'glutes']);
});

test('searching a specific stays specific — it does not drag its siblings in', () => {
  const nodes = validateAnatomy(g([nd('hip'), nd('glutes', ['hip'], { kind: 'group' }),
    nd('glute-max', ['glutes']), nd('glute-med-min', ['glutes'])]));
  assert.deepEqual(expand('glute-med-min', nodes), ['glute-med-min']);
});

test('searching an action reaches the muscles that perform it', () => {
  const nodes = validateAnatomy(g([nd('hip'), nd('glutes', ['hip'], { kind: 'group' }),
    nd('glute-med-min', ['glutes']), nd('tfl', ['hip']),
    action('hip-abduction', 'hip', ['glute-med-min', 'tfl'])]));
  assert.deepEqual(expand('hip-abduction', nodes).sort(), ['glute-med-min', 'hip-abduction', 'tfl']);
});

test('the two walks are opposites, and both are needed', () => {
  const nodes = validateAnatomy(g([nd('hip'), nd('glutes', ['hip'], { kind: 'group' }), nd('glute-med-min', ['glutes'])]));
  assert.ok(rollUp('glute-med-min', nodes).includes('hip'), 'a glute is found under a search for hip');
  assert.ok(expand('glutes', nodes).includes('glute-med-min'), 'a search for glutes returns the glute');
  assert.ok(!expand('glute-med-min', nodes).includes('hip'), 'and searching down never widens to the region');
});

test('the shipped graph answers Kevin\'s three queries', async () => {
  const nodes = validateAnatomy(await readJson(ANATOMY), 'anatomy.json');
  const kids = childIndex(nodes);
  const find = (q) => [...nodes.values()].find((n) => [n.name, ...(n.also ?? [])].some((x) => String(x).toLowerCase() === q));
  const of = (q) => expand(find(q).id, nodes, kids);

  assert.ok(of('glutes').includes('glute-max') && of('glutes').includes('glute-med-min'), 'glutes pulls up all glutes');
  assert.deepEqual(of('glute medius'), ['glute-med-min'], 'glute medius finds the specific');
  assert.ok(of('hip abductors').includes('glute-med-min'), 'hip abductors reaches what abducts');
  assert.ok(rollUp('glute-med-min', nodes).includes('glutes'), 'and both fall under glutes');
});

test('an action can be the honest reading of a word that looks anatomical', async () => {
  // "core" on a farmer's carry, a mace 360 or a boxing strike is trunk bracing,
  // not a muscle — and the catalogue proves it: the items that mean the
  // abdominal wall say `abs` or `obliques`, and the Pallof press says both
  // "core" and "anti-rotation". So the word belongs to the action, and reaching
  // the canister muscles is what expanding an action is for.
  const nodes = validateAnatomy(await readJson(ANATOMY), 'anatomy.json');
  const kids = childIndex(nodes);
  const find = (q) => [...nodes.values()].find((n) => [n.name, ...(n.also ?? [])].some((x) => String(x).toLowerCase() === q));

  assert.equal(find('core').id, 'trunk-bracing', '"core" resolves to the action');
  const reached = expand('trunk-bracing', nodes, kids);
  for (const m of ['transverse-abdominis', 'multifidus', 'diaphragm', 'pelvic-floor']) {
    assert.ok(reached.includes(m), `a search for core must still reach ${m}`);
  }
  assert.ok(rollUp('trunk-bracing', nodes).includes('trunk'), 'and it lives at the trunk');
});

test('the fold-in has no unreviewed row carrying real weight', async () => {
  // A judgment call on 36 item tags is a decision; a judgment call on one is a
  // note. This pins the difference, so a heavy row cannot sit in the worklist
  // unnoticed the way `core` and `glutes` did.
  const nodes = validateAnatomy(await readJson(ANATOMY));
  const library = await readJson(LIBRARY);
  const entries = validateFoldin(await readJson(FOLDIN), nodes, library.items);
  const heavy = entries.filter((e) => (e.review || e.notAnatomy) && (e.items ?? 0) > 4);
  assert.deepEqual(heavy.map((e) => e.from), [], 'an unresolved row with more than four item tags needs a decision, not a flag');
});

/* ------------------------ the effect vocabulary (§11.1) ------------------- */
// Settled 29 Aug against the tagged catalogue: nine values, no merges, no cuts.
// What needed deciding was not the list but whether the coverage ledger counts
// each value against an anatomy node — because a value that is systemic and
// counted per muscle lets the pairing law believe a debt was paid that was not.

test('every effect says whether the ledger counts it per target, and why', () => {
  const bad = vocab([{ ...facet('effect', [{ id: 'release', name: 'Release' }]), closed: true }]);
  assert.throws(() => validateVocab(bad), /needs "counts": perTarget or systemic/);
  const noReason = vocab([{ ...facet('effect', [{ id: 'release', name: 'Release', counts: 'perTarget' }]) }]);
  assert.throws(() => validateVocab(noReason), /needs a note saying what the evidence for it was/);
});

test('the shipped effect vocabulary is settled, and says which values are systemic', async () => {
  const byId = validateVocab(await readJson(VOCAB));
  const effect = byId.get('effect');
  assert.equal(effect.values.length, 9, 'nine values — no merges and no cuts');

  const by = Object.fromEntries(effect.values.map((v) => [v.id, v.counts]));
  // FRAMEWORK names four roles the ledger counts per muscle — released,
  // strengthened, stretched, balanced. The content demanded two more of the
  // same kind, and three that are not per-muscle at all.
  assert.deepEqual(
    effect.values.filter((v) => v.counts === 'perTarget').map((v) => v.id).sort(),
    ['activate', 'control', 'lengthen', 'load', 'mobilise', 'release'],
  );
  assert.deepEqual(
    effect.values.filter((v) => v.counts === 'systemic').map((v) => v.id).sort(),
    ['calm', 'circulate', 'condition'],
  );
  assert.equal(by.condition, 'systemic',
    'a rope session must not read as coverage of the calves');
  for (const v of effect.values) assert.match(v.note, /\d/, `${v.id} cites no count`);
});
