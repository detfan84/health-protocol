// readings.js — a person's own measurements over time, as pure data.
//
// GAPS §3 names three things a self-test needs: a recorded reading, a re-test
// cadence, and the change between readings. The first two shipped; this is the
// third, and it is the reason to take a reading twice. A number recorded and
// never shown back is a number nobody has any reason to record again.
//
// Three rules the maths obeys, all of them about not overstating:
//
//   One reading is not a trend. It is a starting point, and the app says so
//   rather than drawing a flat line through a single dot.
//
//   `better` decides direction, and it is per item. Knee-to-wall going up is
//   progress; fingertips-to-floor going up is not. Without a stated direction
//   the change is reported and not judged.
//
//   Gaps are gaps. A fortnight with no reading is missing, never zero — and
//   the dates are kept so a run of three readings across six months cannot
//   present itself as steady progress.
//
// Nothing here compares one person to anybody else, and nothing here scores.
// It is your own number, read back to you.

/**
 * Every reading for one item and one side, oldest first.
 * `history` is the date → day-record map the screens already load.
 */
export function seriesFor(history, itemId, side = 'both', extra = null) {
  const rows = [];
  const take = (date, rec) => {
    const r = rec?.log?.[itemId]?.readings?.[side];
    if (!r) return;
    if (!Number.isFinite(r.value) && !r.outcomeId) return;
    rows.push({ date, ...r });
  };
  for (const [date, rec] of Object.entries(history ?? {})) take(date, rec);
  if (extra) take(extra.date, extra);

  const seen = new Set();
  return rows
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .filter((r) => (seen.has(r.date) ? false : seen.add(r.date)));
}

/** Whole days between two local date keys. */
function daysBetween(from, to) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : null;
}

/**
 * What changed, and whether that counts as progress.
 *
 * → { points, first, last, change?, direction?, days? }
 *   direction is 'better' | 'worse' | 'same', and is absent when the item does
 *   not say which way is which — reporting a change is honest, calling an
 *   unlabelled one an improvement is not.
 */
export function summarise(series, measure = {}) {
  if (!series.length) return { points: 0 };
  const first = series[0];
  const last = series[series.length - 1];
  const out = { points: series.length, first, last };
  if (series.length > 1) out.days = daysBetween(first.date, last.date);

  // A choice does not subtract. What changed is which reading you got.
  if (measure.kind === 'choice') {
    if (series.length > 1) out.moved = last.outcomeId !== series[series.length - 2].outcomeId;
    return out;
  }

  if (series.length < 2 || !Number.isFinite(first.value) || !Number.isFinite(last.value)) return out;
  const change = Math.round((last.value - first.value) * 100) / 100;
  out.change = change;
  if (change === 0) out.direction = 'same';
  else if (measure.better === 'higher') out.direction = change > 0 ? 'better' : 'worse';
  else if (measure.better === 'lower') out.direction = change < 0 ? 'better' : 'worse';
  return out;
}

/**
 * An SVG path through the readings, in a box of `width` × `height`.
 *
 * Plotted by VALUE against position, not against date — the dates are carried
 * in the summary text instead. Spacing three readings six months apart evenly
 * along an axis would be a lie told by a picture, so the picture does not claim
 * to be a timeline and the words say when.
 *
 * Returns null below two points, because a line needs somewhere to go.
 */
export function sparkPath(series, { width = 120, height = 28, pad = 3 } = {}) {
  const values = series.map((r) => r.value).filter((v) => Number.isFinite(v));
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  const x = (i) => pad + (i * (width - pad * 2)) / (values.length - 1);
  // A flat run sits in the middle rather than pinned to an edge, where a
  // straight line along the floor reads as zero.
  const y = (v) => (span === 0 ? height / 2 : height - pad - ((v - lo) / span) * (height - pad * 2));
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
}

/** The sentence under the line. Plain, dated, and never congratulatory. */
export function summaryText(summary, measure = {}) {
  if (!summary.points) return null;
  const unit = measure.unit ? ` ${measure.unit}` : '';
  if (summary.points === 1) {
    const v = Number.isFinite(summary.last.value) ? `${summary.last.value}${unit}` : summary.last.tell;
    return `First reading, ${summary.last.date}: ${v}. Nothing to compare it to yet.`;
  }
  const when = summary.days === 1 ? 'a day' : `${summary.days} days`;
  if (measure.kind === 'choice') {
    return summary.moved
      ? `Last time: ${summary.first.tell} — ${when} later: ${summary.last.tell}`
      : `Same reading as ${when} ago.`;
  }
  if (!Number.isFinite(summary.change)) return null;
  if (summary.change === 0) return `${summary.last.value}${unit} — the same as ${when} ago.`;
  const size = Math.abs(summary.change);
  return `${summary.first.value}${unit} → ${summary.last.value}${unit} over ${when}: ${size}${unit} ${summary.change > 0 ? 'more' : 'less'}.`;
}
