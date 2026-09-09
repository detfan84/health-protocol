// timeplan.js — the time somebody actually has, split across the blocks they
// will actually do.
//
// Kevin, 9 Sep, redirecting the preset draft: "those are just arbitrary
// numbers… it should be almost like a slide scale, or they can manually enter
// how much time they want to dedicate… how do you want to split it up? Here's
// our recommendation… I don't want to put things in the evening if they're not
// going to get done. So let them choose what they get. We can always make the
// recommendations."
//
// So there are no tiers. There is one number — the person's, entered or slid —
// and an election of blocks, and a recommended split over what they elected,
// every part of it adjustable. The composer fills each elected block to its
// minutes (dealer.js); this file only does the arithmetic of the split and the
// honesty of the guidance.
//
// The guidance posture, from the same conversation: ENCOURAGE, NEVER CLAMP.
// "If you get too sore or you suffer from PEM, that can get in the way of you
// continuing the day after. And when you disrupt a routine, that's what
// derails you." The earlier build capped the dial for careful pacing (D28
// reads "caps its ramp"); his 9 Sep words are "all of this should be
// adjustable for them" — so the cap becomes a recommendation with its reason
// attached, and the person's number always wins. The one-line note is not
// warning theatre: it fires only when their entry exceeds their own stated
// pacing, once, with the why.

/** The blocks a day can hold, in day order, with their fixed floors. */
export const BLOCKS = [
  { id: 'wake', name: 'In bed, on waking', fixedMinutes: 3, note: 'unwinds the night you just had' },
  { id: 'session', name: 'A main session', flexible: true, minMinutes: 5, share: 0.7, note: 'release and strengthen, dealt to what you need' },
  { id: 'snacks', name: 'Snacks through the day', fixedMinutes: 3, note: 'small doses in the gaps you already have' },
  { id: 'evening', name: 'Evening wind-down', flexible: true, minMinutes: 4, share: 0.3, note: 'deep release and downshift, where today landed' },
  { id: 'bed', name: 'In bed, at night', fixedMinutes: 2, note: 'the motions that carry you into sleep' },
];

export const DEFAULT_ELECTED = { wake: true, session: true, snacks: true, evening: true, bed: true };

/** The floor: electing everything and giving each block only its minimum. */
export function minimumFor(elected = DEFAULT_ELECTED) {
  return BLOCKS.reduce((total, b) => {
    if (!elected[b.id]) return total;
    return total + (b.flexible ? b.minMinutes : b.fixedMinutes);
  }, 0);
}

/**
 * Where a careful pacer is encouraged to start. Not a wall — a number with a
 * reason, shown next to whatever they choose instead.
 */
export const CAREFUL_START_MINUTES = 25;

/**
 * The recommended split of `total` minutes over the elected blocks.
 *
 * Fixed blocks take their floor; what remains divides over the flexible ones
 * by their share. The person's own overrides (splitOverrides) always win —
 * this only fills in what they have not said.
 */
export function recommendSplit({ total, elected = DEFAULT_ELECTED, overrides = {} } = {}) {
  const chosen = BLOCKS.filter((b) => elected[b.id]);
  const out = {};
  let spent = 0;

  for (const b of chosen.filter((x) => !x.flexible)) {
    out[b.id] = Number.isFinite(overrides[b.id]) ? overrides[b.id] : b.fixedMinutes;
    spent += out[b.id];
  }

  const flexible = chosen.filter((x) => x.flexible);
  const overridden = flexible.filter((b) => Number.isFinite(overrides[b.id]));
  for (const b of overridden) { out[b.id] = overrides[b.id]; spent += overrides[b.id]; }

  const free = flexible.filter((b) => !Number.isFinite(overrides[b.id]));
  const remaining = Math.max(0, (total ?? 0) - spent);
  const shareSum = free.reduce((n, b) => n + b.share, 0) || 1;
  for (const b of free) {
    out[b.id] = Math.max(b.minMinutes, Math.round(remaining * (b.share / shareSum)));
  }
  return out;
}

/**
 * The one-line notes that ride with a plan. Recommendations with reasons —
 * never blocks, never per-item warnings.
 */
export function planNotes({ total, elected = DEFAULT_ELECTED, pacing = null } = {}) {
  const notes = [];
  const floor = minimumFor(elected);
  if (Number.isFinite(total) && total < floor) {
    notes.push(`${total} minutes is under this selection's floor of ${floor} — blocks will run at their minimums, which still counts.`);
  }
  if (pacing === 'careful' && Number.isFinite(total) && total > CAREFUL_START_MINUTES) {
    notes.push(`You said doing too much costs you later. ${total} minutes is yours to choose — the recommended start is ${CAREFUL_START_MINUTES}, because a day that leaves tomorrow intact is what keeps the routine alive, and the routine is what does the work.`);
  }
  if (!elected.session && !elected.evening) {
    notes.push('With no session and no evening elected, the day is anchors only — real, and the smallest thing that still counts.');
  }
  if (!elected.evening) {
    notes.push('Morning and evening together are the ideal — the evening half is where the day\'s tension actually gets released. It is here whenever you want it.');
  }
  return notes;
}
