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
