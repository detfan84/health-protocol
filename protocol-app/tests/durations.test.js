// How long a thing takes (docs/HANDOFF.md §Where the home screen stands).
//
// The home screen was inventing this: `it.amount?.seconds ?? 60`, a minute
// conjured for every untimed item, summed, and shown to a person as a figure.
// 369 of 383 items have no duration, so most of that number was fabricated.
// These pin the two halves of the fix — parse rather than guess, and say what
// is not known rather than filling it in.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { timeFrom, applyDurations, lengthOf, lengthText } from '../src/lib/durations.js';

test('a stated time is read; anything else is left alone', () => {
  assert.deepEqual(timeFrom('30–60 seconds, daily.'), { seconds: 30, secondsMax: 60 });
  assert.deepEqual(timeFrom('5 minutes, most days.'), { seconds: 300 });
  assert.deepEqual(timeFrom('60–90 sec a side'), { seconds: 60, secondsMax: 90, perSide: true });
});

test('a range stays a range, because the midpoint is a number nobody wrote', () => {
  const t = timeFrom('15–20 minutes, 3–4× a week.');
  assert.equal(t.seconds, 900);
  assert.equal(t.secondsMax, 1200);
});

test('what is not a duration is not read as one', () => {
  // A breath is not a unit of time, and slow breathing is the point of most
  // items that count in them. Sets and reps are a real dose and not a clock.
  assert.equal(timeFrom('5 breaths. Once a day.'), null);
  assert.equal(timeFrom('2 × 10, slow'), null);
  assert.equal(timeFrom('3 rounds per side, 3× a week.'), null);
  assert.equal(timeFrom('All day, imperfectly.'), null);
  assert.equal(timeFrom(''), null);
});

test('an explicit [undetermined] stays undetermined', () => {
  // Somebody looked at that dose and decided not to say. Parsing a number out
  // of the sentence around it would overrule them.
  assert.equal(timeFrom('[undetermined] — the right number depends on which problem you have.'), null);
  assert.equal(timeFrom('Holds of roughly 90 seconds. Positions per session: [undetermined].'), null);
});

test('an authored amount outranks a sentence parsed out of prose', () => {
  const [kept] = applyDurations([{ id: 'a', amount: { seconds: 45 }, dose: '30–60 seconds' }]);
  assert.deepEqual(kept.amount, { seconds: 45 });
  const [sets] = applyDurations([{ id: 'b', amount: { sets: 3, reps: 10 }, dose: '5 minutes' }]);
  assert.deepEqual(sets.amount, { sets: 3, reps: 10 }, 'and a sets dose is not overwritten by a stray minute');
});

test('a per-side time counts twice, because you have two sides', () => {
  const len = lengthOf([{ amount: { seconds: 60, perSide: true } }]);
  assert.equal(len.seconds, 120);
});

/* --------------------------- saying what is unknown ---------------------- */

test('an untimed block says so instead of adding up minutes it invented', () => {
  const len = lengthOf([{}, {}, {}]);
  assert.equal(len.seconds, 0);
  assert.equal(len.untimed, 3);
  assert.equal(lengthText(len), '3 things, none of them timed');
});

test('when most of a block has no clock, the count leads and the minutes follow', () => {
  // Full Body has six items and one duration. "about 1 min" was the first
  // wording of this and it is a new way of lying — a strength session described
  // as a minute long.
  const len = lengthOf([{ amount: { seconds: 60 } }, {}, {}, {}, {}, {}]);
  assert.equal(lengthText(len), '6 things, only 1 timed (about 1 min of it)');
});

test('when most of it is timed, the minutes lead and the rest is counted', () => {
  const len = lengthOf([{ amount: { seconds: 120 } }, { amount: { seconds: 180 } }, {}]);
  assert.equal(lengthText(len), 'about 5 min, plus 1 with no clock on it');
});

test('a fully timed block is just its length, and a range says so', () => {
  assert.equal(lengthText(lengthOf([{ amount: { seconds: 120 } }, { amount: { seconds: 180 } }])), 'about 5 min');
  assert.equal(lengthText(lengthOf([{ amount: { seconds: 120, secondsMax: 300 } }])), '2–5 min');
});

test('the shipped day is described honestly, block by block', async () => {
  const { readFile } = await import('node:fs/promises');
  const starter = JSON.parse(await readFile(new URL('../src/content/starter.json', import.meta.url), 'utf8'));
  const blocks = starter.data.protocols.flatMap((p) => p.blocks);

  // The arc and the flows were authored with durations; the body-work and
  // support content never was, and the screens now say that rather than
  // guessing at it. This is the number the next content pass has to move.
  const untimed = blocks.filter((b) => lengthOf(b.items).timed === 0);
  assert.ok(untimed.length >= 10, 'most of the day still carries no clock, and that is the finding');
  for (const b of untimed) {
    assert.match(lengthText(lengthOf(b.items)), /none of them timed/);
  }
  const arc = blocks.find((b) => b.id === 'arc-wake');
  assert.match(lengthText(lengthOf(arc.items)), /^about \d+ min$/, 'the arc is fully timed and reads as a length');
});
