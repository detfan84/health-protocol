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

/* --------------------------------- pace ---------------------------------- */
// Kevin, 29 Aug: "allow for people to add the time it actually took them to do
// so they can know exactly what their pace is, and for some things, they might
// get quicker over time."

import { tookSeries, paceOf, paceText, lengthForYou, lengthTextForYou } from '../src/lib/durations.js';

const dayWith = (date, itemId, took) => [date, { log: { [itemId]: { took } } }];
const hist = (...rows) => Object.fromEntries(rows);

test('typical is the median, so one strange session does not move "usually"', () => {
  // The runner can measure four minutes and then forty, because somebody
  // answered the door. A mean would let that redefine what usually means.
  const h = hist(
    dayWith('2026-08-01', 'a', { seconds: 240, source: 'session' }),
    dayWith('2026-08-08', 'a', { seconds: 2400, source: 'session' }),
    dayWith('2026-08-15', 'a', { seconds: 260, source: 'session' }),
  );
  assert.equal(paceOf(h, 'a').typical, 260);
});

test('pace reports the change and attaches no verdict to it', () => {
  // Getting quicker is not obviously better — a release rushed is a release
  // wasted — so there is no direction here, unlike a measurement with a stated
  // `better` (readings.js §5.3).
  const h = hist(
    dayWith('2026-08-01', 'a', { seconds: 300, source: 'typed' }),
    dayWith('2026-08-15', 'a', { seconds: 180, source: 'typed' }),
  );
  const p = paceOf(h, 'a');
  assert.equal(p.change, -120);
  assert.equal(p.direction, undefined, 'no verdict');
  assert.match(paceText(p), /Usually about/);
  assert.doesNotMatch(paceText(p), /better|worse|improv|faster/i);
});

test('one timing says so rather than calling itself a habit', () => {
  const h = hist(dayWith('2026-08-01', 'a', { seconds: 240, source: 'typed' }));
  assert.match(paceText(paceOf(h, 'a')), /the one time you timed it/);
  assert.equal(paceText(paceOf({}, 'a')), null);
});

test('a block can be told in your own times, and says how many are yours', () => {
  // The payoff for recording pace: "about 8 min" is what the cards say, and
  // "about 11" is what it takes you. Different claims.
  const h = hist(dayWith('2026-08-01', 'a', { seconds: 600, source: 'typed' }));
  const items = [{ id: 'a', amount: { seconds: 60 } }, { id: 'b', amount: { seconds: 60 } }, { id: 'c' }];
  const theirs = lengthOf(items);
  const yours = lengthForYou(items, h);
  assert.equal(theirs.seconds, 120, 'what the cards say');
  assert.equal(yours.seconds, 660, 'what it takes you — your ten minutes, not the card’s one');
  assert.equal(yours.yours, 1);
  assert.equal(yours.untimed, 1, 'and the one nobody has timed is still counted, not filled in');
});

test('the series keeps where each number came from', () => {
  const h = hist(
    dayWith('2026-08-01', 'a', { seconds: 300, source: 'session' }),
    dayWith('2026-08-08', 'a', { seconds: 240, source: 'typed' }),
  );
  assert.deepEqual(tookSeries(h, 'a').map((r) => r.source), ['session', 'typed']);
});

test('an estimate says whose number it is', () => {
  // The screens now prefer a person's own recorded times, which means the same
  // sentence can be two different claims. It has to say which — an "about 11
  // min" that silently switched from the cards to your history is a number
  // that changed meaning without telling anybody.
  const h = hist(dayWith('2026-08-01', 'a', { seconds: 600, source: 'typed' }));
  const both = [{ id: 'a', amount: { seconds: 60 } }, { id: 'b', amount: { seconds: 60 } }];

  // Nothing of theirs: the sentence is exactly what it always was.
  assert.equal(lengthTextForYou(lengthForYou(both, {})), lengthText(lengthOf(both)));

  // Some of theirs: how much, so "your pace" never stands for a block that is
  // mostly still the cards' guess.
  assert.match(lengthTextForYou(lengthForYou(both, h)), /1 of 2 your own times$/);

  // All of theirs.
  assert.match(lengthTextForYou(lengthForYou([both[0]], h)), /· your own times$/);
});
