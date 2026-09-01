// Reasonable estimates, until the content says better.
//
// Kevin, 1 Sep: "Can we get reasonable estimates on the rest of the things
// until we can figure it out?"
//
// This reverses the posture in durations.js — "parse, never guess" — which was
// written because the home screen had been adding sixty invented seconds per
// untimed item and showing the total as a fact. That ruling was right about the
// failure, and the reversal is narrow: an estimate may EXIST as long as it can
// never be mistaken for a measurement. These tests are almost entirely about
// that separation holding.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { estimateFor, applyEstimates, lengthWithEstimates, estimateText } from '../src/lib/estimates.js';
import { lengthOf } from '../src/lib/durations.js';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const practices = lib.items.filter((i) => i.type === 'practice');

test('a guess never sits on top of a fact', () => {
  const authored = practices.find((i) => Number.isFinite(i.amount?.seconds));
  assert.ok(authored, 'no authored duration to test against');
  assert.equal(estimateFor(authored), null, 'an item that states its time was given an estimate anyway');
  const applied = applyEstimates([authored])[0];
  assert.equal(applied.estimate, undefined);
  assert.equal(applied.amount.seconds, authored.amount.seconds, 'the authored figure was touched');
});

test('an estimate lives in its own field, never in amount', () => {
  const untimed = practices.find((i) => !Number.isFinite(i.amount?.seconds));
  const applied = applyEstimates([untimed])[0];
  assert.ok(applied.estimate.seconds > 0);
  assert.equal(Number.isFinite(applied.amount?.seconds), false,
    'an estimate was written into amount, where it would read as authored');
});

test('every estimate says which rule made it', () => {
  for (const item of applyEstimates(practices)) {
    if (!item.estimate) continue;
    assert.ok(item.estimate.basis?.length > 15, `${item.id} has an estimate with no stated basis`);
    assert.ok(item.estimate.rule, `${item.id} does not name its rule`);
  }
});

test('the whole catalogue can be estimated, and nothing falls through', () => {
  const applied = applyEstimates(practices);
  const covered = applied.filter((i) => Number.isFinite(i.amount?.seconds) || i.estimate);
  assert.equal(covered.length, practices.length, 'some practice got neither a time nor an estimate');
  // Every one matched a real rule rather than the catch-all, which is the
  // difference between a classification and a shrug.
  const shrugs = applied.filter((i) => i.estimate?.rule === 'unclassified');
  assert.equal(shrugs.length, 0, `${shrugs.length} items fell through to the catch-all`);
});

test('the classes are the ones the rules describe', () => {
  const est = (item) => estimateFor(item);
  assert.equal(est({ amount: { sets: 3, reps: 10 } }).rule, 'sets-and-reps');
  assert.equal(est({ amount: { sets: 3, reps: 10 } }).seconds, 3 * 10 * 4 + 2 * 45);
  assert.equal(est({ dose: '5 breaths' }).rule, 'breaths');
  assert.equal(est({ dose: '5 breaths' }).seconds, 30);
  assert.equal(est({ effect: ['release'] }).rule, 'release-hold');
  assert.equal(est({ effect: ['lengthen'] }).rule, 'lengthen');
  assert.equal(est({ effect: ['load'] }).rule, 'loaded-set');
  assert.equal(est({ effect: ['calm'] }).rule, 'downregulate');
  assert.equal(est({ effect: ['mobilise'], tissue: ['nerve'] }).rule, 'nerve-glide');
  assert.equal(est({}).rule, 'unclassified');
});

test('per-side work counts both sides', () => {
  const one = lengthWithEstimates([{ effect: ['release'], dose: '90 sec per side' }]);
  const other = lengthWithEstimates([{ effect: ['release'], dose: '90 sec' }]);
  assert.equal(one.seconds, other.seconds * 2);
});

test('the old reading is unchanged — estimates are opt-in', () => {
  // durations.lengthOf must still ignore them, or every screen that used it
  // silently starts reporting guesses as fact.
  const items = applyEstimates(practices.filter((i) => !i.amount?.seconds).slice(0, 5));
  const strict = lengthOf(items);
  assert.equal(strict.timed, 0, 'lengthOf started counting estimates');
  assert.equal(strict.untimed, 5);
});

test('the sentence always admits how much of it was guessed', () => {
  assert.match(estimateText(lengthWithEstimates([{ amount: { seconds: 120 } }])), /^about 2 min$/);
  // lengthWithEstimates reads an estimate that is already attached — it does
  // not estimate on the fly, so applyEstimates has to have run first.
  const allGuessed = estimateText(lengthWithEstimates(
    applyEstimates([{ effect: ['release'] }, { effect: ['load'] }]),
  ));
  assert.match(allGuessed, /estimated/, 'a wholly estimated total did not say so');
  const mixed = estimateText(lengthWithEstimates(
    applyEstimates([{ amount: { seconds: 600 } }, { effect: ['release'] }]),
  ));
  assert.match(mixed, /% of that estimated/, 'a mixed total did not say how much was guessed');
  assert.equal(estimateText(lengthWithEstimates([])), 'nothing here yet');
});
