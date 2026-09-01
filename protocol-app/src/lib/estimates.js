// estimates.js — roughly how long, for the 587 items that never said.
//
// Kevin, 1 Sep: "Can we get reasonable estimates on the rest of the things
// until we can figure it out?"
//
// This deliberately reverses the posture in durations.js, whose header says
// "parse, never guess" and was written because the home screen had been adding
// sixty invented seconds per untimed item and showing the total as a fact. That
// ruling was right about the failure and this does not undo it. What it changes
// is one thing: an estimate is allowed to EXIST as long as it can never be
// mistaken for a measurement.
//
// So the whole design is the separation:
//
//   · An authored time lives in `amount.seconds`, where it always has. Nothing
//     in this file ever writes there.
//   · An estimate lives in `estimate`, a different field, carrying the RULE
//     that produced it. Absent, authored and estimated stay three states (D24).
//   · `lengthOf` still ignores estimates unless asked. A screen has to opt in,
//     and when it does it is told how much of the total was guessed.
//
// The estimates are per CLASS, not per item. Writing 587 individual numbers
// would be inventing 587 facts; saying "a release hold is about ninety seconds"
// is one stated assumption applied consistently, and it is wrong in a way a
// reader can see and correct.
//
// The exit is already built. durations.js has `paceOf` and `lengthForYou`,
// which learn what an item actually takes THIS person from their own history.
// Every real rep replaces a guess. These numbers are scaffolding, and the
// scaffolding comes down on its own.

/**
 * The rules, in the order they are tried. Each says what it is looking at and
 * what it assumes, because an estimate with no stated basis is just a number.
 */
const RULES = [
  {
    id: 'sets-and-reps',
    basis: 'sets × reps, at about four seconds a rep plus forty-five seconds rest between sets',
    match: (i) => Number.isFinite(i.amount?.sets) && Number.isFinite(i.amount?.reps),
    seconds: (i) => i.amount.sets * i.amount.reps * 4 + Math.max(0, i.amount.sets - 1) * 45,
  },
  {
    id: 'breaths',
    basis: 'counted breaths, at about six seconds each — slow breathing is the point of these',
    match: (i) => /(\d+)\s*breath/i.test(i.dose ?? ''),
    seconds: (i) => Number(/(\d+)\s*breath/i.exec(i.dose)[1]) * 6,
  },
  {
    id: 'nerve-glide',
    basis: 'a nerve glide, typically ten unhurried passes a side',
    match: (i) => (i.effect ?? []).includes('mobilise') && (i.tissue ?? []).includes('nerve'),
    seconds: () => 60,
  },
  {
    id: 'release-hold',
    basis: 'a release hold — long enough for tissue to give, which is where ninety seconds comes from',
    match: (i) => (i.effect ?? []).includes('release'),
    seconds: () => 90,
  },
  {
    id: 'lengthen',
    basis: 'a held stretch, long enough to be worth holding',
    match: (i) => (i.effect ?? []).includes('lengthen'),
    seconds: () => 45,
  },
  {
    id: 'loaded-set',
    basis: 'a loaded movement with no dose written down — assumed one working set',
    match: (i) => (i.effect ?? []).some((e) => e === 'load' || e === 'activate'),
    seconds: () => 90,
  },
  {
    id: 'mobilise',
    basis: 'joints driven through their range',
    match: (i) => (i.effect ?? []).includes('mobilise'),
    seconds: () => 60,
  },
  {
    id: 'balance',
    basis: 'a balance or control drill, both sides',
    match: (i) => (i.effect ?? []).includes('control'),
    seconds: () => 60,
  },
  {
    id: 'downregulate',
    basis: 'a downregulating practice, which does not work when it is rushed',
    match: (i) => (i.effect ?? []).some((e) => e === 'calm' || e === 'circulate'),
    seconds: () => 120,
  },
  {
    id: 'condition',
    basis: 'conditioning work',
    match: (i) => (i.effect ?? []).includes('condition'),
    seconds: () => 180,
  },
];

/** The catch-all, named so it is visible in the data rather than implied. */
const FALLBACK = { id: 'unclassified', basis: 'nothing on the card says what kind of thing this is', seconds: 60 };

/**
 * An estimate for one item, or null when it already states a real time.
 *
 * Never returns something for an item with an authored `amount.seconds`: a
 * guess must never sit on top of a fact.
 */
export function estimateFor(item) {
  if (!item) return null;
  if (Number.isFinite(item.amount?.seconds)) return null;
  const rule = RULES.find((r) => {
    try { return r.match(item); } catch { return false; }
  });
  const seconds = rule ? rule.seconds(item) : FALLBACK.seconds;
  const basis = rule ? rule.basis : FALLBACK.basis;
  const id = rule ? rule.id : FALLBACK.id;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const perSide = item.sides === true || /per side|each side|a side/i.test(item.dose ?? '');
  return { seconds: Math.round(seconds), basis, rule: id, ...(perSide ? { perSide: true } : {}) };
}

/** Items with an `estimate` attached where — and only where — one was missing. */
export function applyEstimates(items = []) {
  return items.map((item) => {
    const estimate = estimateFor(item);
    return estimate ? { ...item, estimate } : item;
  });
}

/**
 * How long a list takes when estimates are allowed to count.
 *
 * Returns the estimated share alongside the total, because a screen that says
 * "about 14 minutes" without saying that twelve of them were guessed is doing
 * the thing durations.js was written to stop.
 */
export function lengthWithEstimates(items = []) {
  let seconds = 0;
  let authored = 0;
  let estimated = 0;
  let estimatedSeconds = 0;
  let unknown = 0;
  for (const it of items) {
    const mult = (it.amount?.perSide ?? it.estimate?.perSide) && it.sides !== false ? 2 : 1;
    if (Number.isFinite(it.amount?.seconds)) {
      seconds += it.amount.seconds * mult;
      authored += 1;
    } else if (Number.isFinite(it.estimate?.seconds)) {
      seconds += it.estimate.seconds * mult;
      estimatedSeconds += it.estimate.seconds * mult;
      estimated += 1;
    } else {
      unknown += 1;
    }
  }
  return { seconds, authored, estimated, estimatedSeconds, unknown, total: items.length };
}

/** The sentence, which always says how much of itself is a guess. */
export function estimateText(len) {
  if (!len.total) return 'nothing here yet';
  if (!len.seconds) return `${len.total} thing${len.total === 1 ? '' : 's'}, none of them timed`;
  const mins = Math.max(1, Math.round(len.seconds / 60));
  if (!len.estimated) return `about ${mins} min`;
  if (!len.authored) return `roughly ${mins} min — estimated`;
  const share = Math.round((len.estimatedSeconds / len.seconds) * 100);
  return `roughly ${mins} min — ${share}% of that estimated`;
}
