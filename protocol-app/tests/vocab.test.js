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

import { validateVocab, validateOpportunities, fits, coverage, readJson, VOCAB, LIBRARY, OPPORTUNITIES } from '../scripts/check-vocab.mjs';

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
  const byId = validateVocab(vocab([facet('effect', [val('release'), val('load')])]));
  assert.equal(byId.size, 1);
  assert.deepEqual(byId.get('effect').values.map((v) => v.id), ['release', 'load']);
});

test('a duplicated value id inside one facet is refused', () => {
  assert.throws(
    () => validateVocab(vocab([facet('effect', [val('release'), val('release')])])),
    /duplicated within its facet/,
  );
});

test('two facets cannot share an id', () => {
  assert.throws(
    () => validateVocab(vocab([facet('effect', [val('a')]), facet('effect', [val('b')])])),
    /two facets share this id/,
  );
});

test('a value with no display name is refused — the id is never shown to a person', () => {
  assert.throws(
    () => validateVocab(vocab([facet('effect', [{ id: 'release' }])])),
    /needs a display name/,
  );
});

test('required, multi and closed must each be stated, because absent is not false', () => {
  const f = facet('effect', [val('release')]);
  delete f.closed;
  assert.throws(() => validateVocab(vocab([f])), /"closed" must be true or false/);
});

test('a facet must say which single question it answers', () => {
  const f = facet('effect', [val('release')]);
  delete f.question;
  assert.throws(() => validateVocab(vocab([f])), /the one question it answers/);
});

test('every problem is reported at once, not one per run', () => {
  try {
    validateVocab(vocab([facet('effect', [{ id: 'a' }, { id: 'a', name: 'A' }])]));
    assert.fail('expected a throw');
  } catch (err) {
    assert.match(err.message, /2 problems/);
  }
});

/* ----------------------------- append-only ------------------------------ */

test('a supersession keeps both ends: the retired id stays in the file', () => {
  const v = vocab(
    [facet('effect', [val('mobilise'), val('mobilize')])],
    [{ facet: 'effect', from: 'mobilize', to: 'mobilise' }],
  );
  assert.doesNotThrow(() => validateVocab(v));
});

test('deleting a superseded value instead of keeping it is refused', () => {
  const v = vocab(
    [facet('effect', [val('mobilise')])],
    [{ facet: 'effect', from: 'mobilize', to: 'mobilise' }],
  );
  assert.throws(() => validateVocab(v), /it does not get deleted/);
});

test('a supersession pointing at a value that does not exist is refused', () => {
  const v = vocab(
    [facet('effect', [val('mobilize')])],
    [{ facet: 'effect', from: 'mobilize', to: 'mobilise' }],
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
  for (const required of ['type', 'effect']) {
    assert.equal(byId.get(required).required, true, `${required} is a required facet`);
  }
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
