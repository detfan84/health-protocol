// cadence.js — "how often", as something the app understands.
//
// Everything used to be implicitly daily, and a real protocol is not: "3–5
// days a week", "every other day", "when I need it" lived as prose inside a
// dose string, where the app could not act on it. The cost was a screen that
// asked for everything every day, so a body-work protocol either sat there
// permanently unchecked or got switched on and off by hand.
//
// The shapes (PLAN §4.1):
//   { kind: 'daily' }                     — the default; absent means this
//   { kind: 'timesPerDay', n }            — n separate goes in ONE day (29 Aug)
//   { kind: 'timesPerWeek', n }           — any n days in the week count (K1)
//   { kind: 'everyNDays', n }             — every other day, weekly, …
//   { kind: 'asNeeded' }                  — present, never due, never overdue
//
// `timesPerDay` is the one the opportunity layer needed. Kevin, 29 Aug, on a
// block meant to ride along with whatever you are already doing: "that one
// will perpetually be front and center unless they have done 3 per day
// already so that's not right either." A thing you do several times a day has
// no window, so a schedule cannot switch it off and a single daily tick cannot
// count it — the only thing that stops it asking is having done it enough
// times today.
//
// Nothing here scores anybody. "Due" answers one question — should this be on
// today's screen — and a target that is already met simply stops asking.

export const CADENCE_KINDS = ['daily', 'timesPerDay', 'timesPerWeek', 'everyNDays', 'asNeeded'];

/**
 * How many times an item was done on a day.
 *
 * A check has always been one record, and `ats` is the list of moments behind
 * it. Absent means the record predates repeats — which is exactly one go, not
 * none, because a record that exists means somebody tapped it. Deriving the
 * count from the list rather than storing both keeps one source of truth.
 */
export function timesDone(check) {
  if (!check) return 0;
  return Array.isArray(check.ats) && check.ats.length ? check.ats.length : 1;
}

/** How many times this item was done on a given day record. */
export function timesOn(dayRecord, itemId) {
  return timesDone(dayRecord?.checks?.[itemId]);
}

/** The cadence an item actually has. Absent, junk or unknown → daily. */
export function cadenceOf(item) {
  const c = item?.cadence;
  if (!c || !CADENCE_KINDS.includes(c.kind)) return { kind: 'daily' };
  if (c.kind === 'timesPerDay' || c.kind === 'timesPerWeek' || c.kind === 'everyNDays') {
    const n = Number(c.n);
    if (!Number.isInteger(n) || n < 1) return { kind: 'daily' }; // a broken n is not a schedule
    const cap = c.kind === 'timesPerWeek' ? 7 : c.kind === 'timesPerDay' ? 24 : 365;
    return { kind: c.kind, n: Math.min(n, cap) };
  }
  return { kind: c.kind };
}

/** 'Every other day' · '3× a week' — for the row, and for the editor. */
export function cadenceLabel(cadence) {
  const c = cadence?.kind ? cadence : cadenceOf({ cadence });
  if (c.kind === 'daily') return 'Every day';
  if (c.kind === 'asNeeded') return 'When needed';
  if (c.kind === 'everyNDays') return c.n === 1 ? 'Every day' : c.n === 2 ? 'Every other day' : `Every ${c.n} days`;
  if (c.kind === 'timesPerDay') return c.n === 1 ? 'Once a day' : `${c.n}× a day`;
  return c.n === 7 ? 'Every day' : `${c.n}× a week`;
}

/* ------------------------------ the week ----------------------------- */
//
// Weeks run Monday to Sunday. A "3 days a week" item that resets on Sunday
// night is the convention almost everyone already keeps in their head, and
// picking a rolling window instead would mean the count changes meaning
// depending on which day you look at it.

/** 'YYYY-MM-DD' → the Monday of its week, same format. */
export function weekStart(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const shift = (dt.getDay() + 6) % 7; // Sunday(0) → 6, Monday(1) → 0
  dt.setDate(dt.getDate() - shift);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Whole days between two 'YYYY-MM-DD' keys (b − a). */
export function daysBetween(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number);
  const [by, bm, bd] = String(b).split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/* ------------------------------ due today ---------------------------- */

/**
 * Should this item be on today's screen?
 *
 * `history` is a map of date key → day record, for at least the last couple of
 * weeks. Missing history means "never logged", never "not done" — an item with
 * no record behind it is due, because the app has no evidence either way and
 * silence is not a reason to hide the work (ruling A).
 *
 * → { due: boolean, reason, doneThisWeek?, target?, lastDone? }
 *   `reason` is for the screen and the tests, not for commentary at the person.
 */
export function dueToday(item, today, history = {}) {
  const c = cadenceOf(item);
  const checkedOn = (dateKey) => Boolean(history[dateKey]?.checks?.[item.id]);

  if (c.kind === 'asNeeded') {
    return { due: false, reason: 'as-needed', cadence: c };
  }
  if (c.kind === 'daily') {
    return { due: true, reason: 'daily', cadence: c };
  }
  if (c.kind === 'timesPerDay') {
    // Unlike the weekly target, a met daily target is DONE rather than still
    // on screen: the whole point is that it stops asking once you have had
    // your three, and there is no later in the day for it to come back from.
    const done = timesOn(history[today], item.id);
    const due = done < c.n;
    return {
      due,
      reason: due ? 'day-target-open' : 'day-target-met',
      doneToday: done,
      target: c.n,
      cadence: c,
    };
  }
  if (c.kind === 'timesPerWeek') {
    const start = weekStart(today);
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const key = addDays(start, i);
      if (key > today) break;
      if (checkedOn(key)) done += 1;
    }
    // Today's own check counts toward the target, so an item you have just
    // done keeps its place on the screen for the rest of the day — it moves
    // to Done rather than vanishing mid-tap.
    const due = done < c.n || checkedOn(today);
    return { due, reason: due ? 'week-target-open' : 'week-target-met', doneThisWeek: done, target: c.n, cadence: c };
  }
  // everyNDays
  let lastDone = null;
  for (let back = 0; back <= 400; back++) {
    const key = addDays(today, -back);
    if (checkedOn(key)) { lastDone = key; break; }
  }
  if (!lastDone) return { due: true, reason: 'never-done', cadence: c };
  const since = daysBetween(lastDone, today);
  const due = since === 0 || since >= c.n;
  return { due, reason: due ? 'interval-open' : 'interval-waiting', lastDone, sinceDays: since, cadence: c };
}

/** 'YYYY-MM-DD' plus n days (n may be negative). */
export function addDays(dateKey, n) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
