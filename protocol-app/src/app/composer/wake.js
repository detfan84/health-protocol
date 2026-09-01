// wake.js — the wake block stops being the same three things every morning.
//
// Kevin, 1 Sep: "The wake block should not be fixed content and it should be
// adjusted based on someone's sleeping position. Because someone who sleeps on
// their side or stomach or back will all have different things that need to be
// addressed when they wake up. And then additionally, it doesn't necessarily
// need to be the same thing every day."
//
// That amends law 4 for this one block, on his ruling: the RHYTHM stays — there
// is a wake block every morning, and its sixty-second floor never moves (law
// 6) — but the content inside it rotates, biased by what the night just did.
// FRAMEWORK always wanted this ("the morning bias reverses whatever position
// the body held for hours"); it shipped as fixed content only because nothing
// asked the sleep question yet. Now something does.
//
// The pools are data with a stated basis each, and every id is tested against
// the shipped catalogue — a pool naming a card that does not exist is a morning
// that silently shrinks.

const DAY_MS = 86400000; // eslint-disable-line no-unused-vars -- documentation of the unit below

/**
 * What each sleeping position leaves behind, and what unwinds it.
 *
 * side    — curled: chest closed, hips folded, spine rotated toward one side
 *           all night → open the chest, extend, rotate the other way.
 * back    — long and flat: spine held in one line, hips extended and still
 *           → gentle flexion and rotation to move the lumbar segments.
 * stomach — head turned and low back arched for hours → flexion to unload the
 *           arch, and easy rotation for the neck's sake.
 */
export const WAKE_POOL = {
  side: ['pt-open-book', 'st-cobra', 'pt-snow-angel-roller', 'st-thread_needle'],
  back: ['pt-lower-trunk-rotation', 'pt-single-knee-to-chest', 'pt-figure4-press', 'st-cat_cow'],
  stomach: ['pt-single-knee-to-chest', 'st-cat_cow', 'pt-lower-trunk-rotation', 'pt-open-book'],
};

/** Mixed or unknown draws from everything — no position is guessed (D30). */
export function poolFor(position) {
  if (WAKE_POOL[position]) return [...WAKE_POOL[position]];
  return [...new Set(Object.values(WAKE_POOL).flat())];
}

/** Deterministic per date — the same morning is the same morning all morning. */
function jitter(date, id) {
  let h = 2166136261;
  for (const c of `${date}|${id}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Deal the wake block: two items for this morning, from this position's pool.
 *
 * `usable` is the same equipment test the main dealer applies — a roller item
 * is not dealt to somebody who has not said they own a roller. Rotation is by
 * date, so tomorrow leans on different rows of the same pool.
 */
export function dealWake({ position, date, itemsById = {}, usable = () => true } = {}) {
  if (!position) return []; // not asked is not asked — the static block stands
  const pool = poolFor(position)
    .map((id) => itemsById[id])
    .filter((item) => item && usable(item));
  return pool
    .sort((a, b) => jitter(date, a.id) - jitter(date, b.id))
    .slice(0, 2)
    .map((item) => ({
      id: item.id,
      why: position === 'mixed' || !WAKE_POOL[position]
        ? 'unwinding the night — drawn from every position until you refine yours'
        : `unwinding a ${position} sleeper's night`,
    }));
}
