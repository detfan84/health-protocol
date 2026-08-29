// durations.mjs — how long a thing takes, read out of what the card says.
//
// The home screen has been inventing this. `viewHome` computed a block's length
// as `it.amount?.seconds ?? 60` — sixty seconds for every untimed item — and
// showed the total to a person as a number. 374 of 383 catalogue items have no
// duration, so most of that figure was fabricated. It is the same failure the
// 28 Aug log records for the add flow inventing `3 × 10` and forty-five
// seconds, still live on the busiest screen in the app.
//
// So: parse, never guess. A dose that states a time gives one; a dose that does
// not gives nothing, and nothing is the honest answer. The screens are being
// changed to say "and six things with no clock on them" rather than to quietly
// add a minute each.
//
// What is deliberately NOT parsed:
//
//   "5 breaths" — a breath is not a unit of time. Six seconds each is a number
//   somebody would have to invent, and slow breathing is the entire point of
//   most items that count in breaths.
//
//   "3 × 10, slow" — sets and reps are a real dose and not a duration. How long
//   ten slow reps take depends on the person.
//
//   "3 rounds per side" · "twice a week" · "all day" — frequency and structure,
//   which are other fields' business.

const SECONDS = { sec: 1, secs: 1, second: 1, seconds: 1, min: 60, mins: 60, minute: 60, minutes: 60 };

/**
 * A stated time out of a dose string, or null.
 *
 * → { seconds, secondsMax?, perSide? }
 *
 * A range is kept as a range. "30–60 seconds" is not forty-five: the midpoint
 * is a number nobody wrote, and the screens can say "30–60 sec" perfectly well.
 */
export function timeFrom(dose = '') {
  // A bracketed [undetermined] means somebody looked and decided not to say.
  if (/\[undetermined\]/i.test(dose)) return null;
  const unit = Object.keys(SECONDS).join('|');
  const range = new RegExp(`(\\d+)\\s*(?:[–—-]|\\s+to\\s+)\\s*(\\d+)\\s*(${unit})\\b`, 'i').exec(dose);
  const single = new RegExp(`(\\d+)\\s*(${unit})\\b`, 'i').exec(dose);

  let out = null;
  if (range) {
    const mult = SECONDS[range[3].toLowerCase()];
    out = { seconds: Number(range[1]) * mult, secondsMax: Number(range[2]) * mult };
  } else if (single) {
    out = { seconds: Number(single[1]) * SECONDS[single[2].toLowerCase()] };
  }
  if (!out) return null;
  if (/\b(each side|a side|per side|each leg|per leg)\b/i.test(dose)) out.perSide = true;
  return out;
}

/**
 * Fill `amount` from the dose where the dose says a time and the item has no
 * amount already. An authored amount always wins — a card that states its own
 * shape outranks a sentence parsed out of prose, the same rule the measurement
 * specs follow.
 */
export function applyDurations(items) {
  return items.map((item) => {
    if (item.amount?.seconds || item.amount?.sets) return item;
    const t = timeFrom(item.dose ?? '');
    if (!t) return item;
    const amount = { seconds: t.seconds };
    if (t.secondsMax) amount.secondsMax = t.secondsMax;
    if (t.perSide) amount.perSide = true;
    return { ...item, amount };
  });
}

/**
 * How long a list of items takes, and how much of that is unknown.
 *
 * → { seconds, secondsMax, timed, untimed }
 *
 * `untimed` is the honest half and the reason this returns an object rather
 * than a number. A block of nine things where four have a clock on them is not
 * "about nine minutes"; it is "about four minutes, plus five things".
 */
export function lengthOf(items = []) {
  let seconds = 0;
  let secondsMax = 0;
  let timed = 0;
  for (const it of items) {
    const a = it.amount;
    if (!Number.isFinite(a?.seconds)) continue;
    const mult = a.perSide && it.sides !== false ? 2 : 1;
    seconds += a.seconds * mult;
    secondsMax += (a.secondsMax ?? a.seconds) * mult;
    timed += 1;
  }
  return { seconds, secondsMax, timed, untimed: items.length - timed };
}

/**
 * How long this reads as, in words.
 *
 * The proportion decides the sentence, which is the whole point. Full Body has
 * six items and one of them carries a duration; "about 1 min" was the first
 * wording of this and it is a new way of lying — a strength session described
 * as a minute long. When most of a block has no clock, the count leads and the
 * minutes follow in brackets, so the number never stands for the block.
 */
export function lengthText(len) {
  const things = (n) => `${n} thing${n === 1 ? '' : 's'}`;
  if (!len.timed) return len.untimed ? `${things(len.untimed)}, none of them timed` : 'nothing here yet';

  const m = (s) => Math.max(1, Math.round(s / 60));
  const lo = m(len.seconds);
  const hi = m(len.secondsMax);
  const span = lo === hi ? `about ${lo} min` : `${lo}–${hi} min`;
  if (!len.untimed) return span;

  const total = len.timed + len.untimed;
  if (len.timed <= len.untimed) {
    return `${things(total)}, only ${len.timed} timed (${span} of it)`;
  }
  return `${span}, plus ${len.untimed} with no clock on ${len.untimed === 1 ? 'it' : 'them'}`;
}

/* ------------------------------- your pace ------------------------------- */

/**
 * Every time this item has actually taken, oldest first.
 *
 * Kevin, 29 Aug: "for some things, they might get quicker over time." So the
 * dates come along, and so does where each number came from — a session
 * measurement and a typed one are not the same claim.
 */
export function tookSeries(history, itemId, extra = null) {
  const rows = [];
  const take = (date, rec) => {
    const t = rec?.log?.[itemId]?.took;
    if (Number.isFinite(t?.seconds)) rows.push({ date, ...t });
  };
  for (const [date, rec] of Object.entries(history ?? {})) take(date, rec);
  if (extra) take(extra.date, extra);
  const seen = new Set();
  return rows
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .filter((r) => (seen.has(r.date) ? false : seen.add(r.date)));
}

/**
 * What this usually takes you.
 *
 * → { times, typical, last, change? }
 *
 * `typical` is the MEDIAN, not the mean. One session where the app was left
 * open, or one day of doing it properly for the first time, should not move
 * what "usually" means.
 *
 * There is **no direction**. Getting quicker is not obviously better — rushing
 * a release is worse, and getting faster at a flow may only be efficiency — so
 * this reports the change and attaches no verdict to it, the same rule an
 * unlabelled measurement follows (§5.3).
 */
export function paceOf(history, itemId, extra = null) {
  const series = tookSeries(history, itemId, extra);
  if (!series.length) return { times: 0 };
  const values = series.map((r) => r.seconds).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const typical = values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
  const out = { times: series.length, typical, last: series[series.length - 1] };
  if (series.length > 1) out.change = series[series.length - 1].seconds - series[0].seconds;
  return out;
}

/** "usually about 4 min · last time 3 min" — a report, never a verdict. */
export function paceText(pace) {
  if (!pace.times) return null;
  const m = (s) => (s < 90 ? `${Math.round(s)} sec` : `${Math.max(1, Math.round(s / 60))} min`);
  if (pace.times === 1) return `Took you ${m(pace.last.seconds)} the one time you timed it.`;
  const same = pace.typical === pace.last.seconds;
  return same
    ? `Usually about ${m(pace.typical)}, over ${pace.times} times.`
    : `Usually about ${m(pace.typical)} · last time ${m(pace.last.seconds)}. ${pace.times} timed.`;
}

/**
 * The same length, told with a person's own times where they have them.
 *
 * This is the payoff for recording pace at all: "about 8 min" is what the cards
 * say, and "about 11 min" is what it takes YOU. The estimate says which it is,
 * because those are different claims.
 */
export function lengthForYou(items, history) {
  let seconds = 0;
  let secondsMax = 0;
  let timed = 0;
  let yours = 0;
  for (const it of items) {
    const pace = paceOf(history, it.id);
    if (pace.times) {
      seconds += pace.typical;
      secondsMax += pace.typical;
      timed += 1;
      yours += 1;
      continue;
    }
    const a = it.amount;
    if (!Number.isFinite(a?.seconds)) continue;
    const mult = a.perSide && it.sides !== false ? 2 : 1;
    seconds += a.seconds * mult;
    secondsMax += (a.secondsMax ?? a.seconds) * mult;
    timed += 1;
  }
  return { seconds, secondsMax, timed, untimed: items.length - timed, yours };
}
