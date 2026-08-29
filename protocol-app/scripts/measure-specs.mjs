// measure-specs.mjs — what a self-test actually records, read out of what the
// card already says.
//
// The thirteen imported tests all carry two sentences of structured data
// written as prose: `notice` says "Recorded in cm." and `why` says
// "Re-test: Every 2 weeks. Higher is better." Every unit, every direction and
// every re-test interval in the catalogue is already there, in a field nothing
// can read.
//
// So this parses rather than invents. A measurement whose card does not say
// what it records stops the build, because a unit guessed here would look
// exactly like a unit somebody chose (canon 3.7).
//
// The prose is then REMOVED from `why`, because a fact in two places drifts,
// and because "Re-test: Every 2 weeks. Higher is better." was never a why —
// it is a cadence and a direction wearing the reason field's clothes.

const UNITS = {
  cm: { unit: 'cm', name: 'centimetres' },
  sec: { unit: 'sec', name: 'seconds' },
  min: { unit: 'min', name: 'minutes' },
  '/day': { unit: '/day', name: 'times a day' },
};

/** "Recorded in cm." · "Recorded in 0–3." → a measure spec, or null. */
export function unitFrom(notice = '') {
  const m = /Recorded in ([^.]+)\./.exec(notice);
  if (!m) return null;
  const raw = m[1].trim();
  if (UNITS[raw]) return { kind: 'number', ...UNITS[raw] };
  const scale = /^(\d+)\s*[–-]\s*(\d+)$/.exec(raw);
  if (scale) return { kind: 'scale', min: Number(scale[1]), max: Number(scale[2]) };
  return null;
}

/** "Higher is better." → which direction counts as progress. */
export function directionFrom(why = '') {
  if (/Higher is better/i.test(why)) return 'higher';
  if (/Lower is better/i.test(why)) return 'lower';
  return null;
}

/** "Re-test: Every 2 weeks." / "Weekly" / "Monthly" → a cadence, or null. */
export function cadenceFrom(why = '') {
  const m = /Re-test:\s*([^.]+)\./i.exec(why);
  if (!m) return null;
  const t = m[1].trim().toLowerCase();
  if (/^weekly/.test(t)) return { kind: 'everyNDays', n: 7 };
  if (/^monthly/.test(t)) return { kind: 'everyNDays', n: 30 };
  const weeks = /every (\d+) weeks?/.exec(t);
  if (weeks) return { kind: 'everyNDays', n: Number(weeks[1]) * 7 };
  const days = /every (\d+) days?/.exec(t);
  if (days) return { kind: 'everyNDays', n: Number(days[1]) };
  if (/monthly/.test(t)) return { kind: 'everyNDays', n: 30 };
  return null;
}

/** Strip the parsed sentences out of `why`; what is left is a real why or nothing. */
export function whyWithout(why = '') {
  return why
    .replace(/Re-test:\s*[^.]+\./i, '')
    .replace(/(Higher|Lower) is better\./i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Give every measurement a `measure` and, where the card says one, a re-test
 * cadence. Anything already carrying `measure` (authored that way) is left
 * alone — a card that states its own shape outranks a sentence parsed out of
 * prose.
 */
export function applyMeasureSpecs(items) {
  const missing = [];
  const out = items.map((item) => {
    if (item.type !== 'measurement') return item;
    if (item.measure) return item;

    const spec = unitFrom(item.fields?.notice ?? '');
    if (!spec) { missing.push(`${item.id} "${item.name}"`); return item; }

    const better = directionFrom(item.why ?? '');
    const measure = { ...spec, ...(better ? { better } : {}) };
    const next = { ...item, measure, tracking: 'measure' };

    const cadence = item.cadence ?? cadenceFrom(item.why ?? '');
    if (cadence) next.cadence = cadence;

    const why = whyWithout(item.why ?? '');
    if (why) next.why = why; else delete next.why;

    const notice = (item.fields.notice ?? '').replace(/Recorded in [^.]+\./, '').trim();
    next.fields = { ...item.fields };
    if (notice) next.fields.notice = notice; else delete next.fields.notice;

    return next;
  });

  if (missing.length) {
    throw new Error(
      `these measurements do not say what they record:\n    ${missing.join('\n    ')}\n` +
      '  Add a `measure` to the item, or a "Recorded in <unit>." line to fields.notice. A unit invented here would look exactly like one somebody chose.',
    );
  }
  return out;
}
