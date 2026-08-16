// Body work tracking logic.
//
// Ported from body-work-reference.html. Several of these functions are
// deliberately defensive in ways that look redundant — they are not.
// The notes on the prototype call these out as encoding bugs already
// found and fixed in testing, so the defensive version is the one to keep:
//
//   * Never sort-assume. Imported or hand-edited files arrive in any
//     order, so series() sorts and lastSession() takes a max rather than
//     trusting array position.
//   * Same-day writes overwrite rather than append, so correcting a typo
//     does not create a fake data point.
//   * Import merges, never replaces. Same-day duplicates are skipped;
//     a restore must never silently delete history.

// Extension included so this module runs under plain `node --test` as well
// as through Vite. The test suite imports it directly.
import { METRICS, M_BY_KEY, TRACK, EVERY, NAME_BY_ID } from '../data/bodywork.js';

export const today = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000);

export function ago(dateStr) {
  const d = daysBetween(dateStr, today());
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

export const blankLog = () => ({
  version: 1,
  started: today(),
  sessions: [],
  measures: {},
  checkins: [],
});

// --- sessions ---

export function logSession(log, id) {
  return {
    ...log,
    sessions: [
      ...log.sessions,
      { id, d: today(), t: new Date().toTimeString().slice(0, 5) },
    ],
  };
}

export function undoLast(log, id) {
  const sessions = [...log.sessions];
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].id === id) {
      sessions.splice(i, 1);
      break;
    }
  }
  return { ...log, sessions };
}

export const sessionsFor = (log, id) => log.sessions.filter(s => s.id === id);

/* Take the newest date rather than the last element — an imported or
   hand-edited file can arrive in any order. */
export function lastSession(log, id) {
  const s = sessionsFor(log, id);
  return s.length ? s.reduce((a, b) => (b.d > a ? b.d : a), s[0].d) : null;
}

export function countIn(log, id, days) {
  const cut = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return sessionsFor(log, id).filter(s => s.d >= cut).length;
}

/* Informational only. A card greys after roughly three times its own
   interval. No streaks, no badges, no guilt mechanics. */
export function isStale(log, id) {
  const last = lastSession(log, id);
  if (!last) return false;
  return daysBetween(last, today()) > (EVERY[id] || 3) * 3;
}

// --- measurements ---

export const mKey = (key, side) => (side ? `${key}.${side}` : key);

export function addMeasure(log, key, side, value) {
  const k = mKey(key, side);
  const arr = [...(log.measures[k] || [])];
  const d = today();
  const i = arr.findIndex(p => p.d === d);
  // Same-day writes overwrite, so fixing a typo does not create a fake point.
  if (i >= 0) arr[i] = { d, v: value };
  else arr.push({ d, v: value });
  return { ...log, measures: { ...log.measures, [k]: arr } };
}

/* Always date-sorted, so "first" really is the baseline and "last" really
   is the most recent, whatever order the stored array is in. */
export const series = (log, key, side) =>
  (log.measures[mKey(key, side)] || []).slice().sort((a, b) => a.d.localeCompare(b.d));

export function deltaText(m, arr) {
  if (!arr.length) return { txt: 'no baseline yet', cls: '' };
  if (arr.length === 1) return { txt: `baseline ${arr[0].v}`, cls: '' };
  const first = arr[0].v;
  const last = arr[arr.length - 1].v;
  const diff = +(last - first).toFixed(1);
  if (diff === 0) return { txt: `level since ${arr[0].d.slice(5)}`, cls: '' };
  const good = (m.better === 'up' && diff > 0) || (m.better === 'down' && diff < 0);
  return {
    txt: `${diff > 0 ? '+' : ''}${diff} from base`,
    cls: good ? 'up' : 'down',
  };
}

/* Sparkline points in a 100x24 box. `better: "down"` flips the vertical
   axis, so a falling forward-fold number still reads as a rising line. */
export function sparkPoints(arr, better) {
  if (arr.length < 3) return null;
  const vals = arr.map(p => p.v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const W = 100;
  const H = 24;
  return vals.map((v, i) => {
    const x = arr.length === 1 ? 0 : (i / (arr.length - 1)) * W;
    let y = H - ((v - lo) / span) * H;
    if (better === 'down') y = H - y;
    return [+x.toFixed(1), +Math.max(2, Math.min(H - 2, y)).toFixed(1)];
  });
}

export function sparkPath(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
}

// --- 48-hour look-back ---

/* Cards in FLARE prompt a look-back on days 1–2 after logging, because
   delayed soreness is the real risk with the eccentric and contract–relax
   work. This is a safety feature, not a nicety. */
export function flareText(log, id) {
  const last = lastSession(log, id);
  const generic =
    'Delayed soreness is the risk here — check back in 48 hours before adding volume.';
  if (!last) return { txt: generic, active: false };
  const d = daysBetween(last, today());
  if (d === 1 || d === 2) {
    return {
      txt: `Done ${ago(last)} — this is the window where delayed soreness shows. How did the next day go? Note it in the log.`,
      active: true,
    };
  }
  return { txt: generic, active: false };
}

// --- check-ins ---

export function saveCheckin(log, energy, note) {
  const entry = { d: today(), energy, note };
  const checkins = [...log.checkins];
  const i = checkins.findIndex(c => c.d === entry.d);
  if (i >= 0) checkins[i] = entry;
  else checkins.push(entry);
  return { ...log, checkins };
}

// --- import / export ---

/* Merges, never replaces. Same-day duplicates are skipped so a restore
   can never silently delete history. */
export function mergeLog(current, incoming) {
  if (!incoming || !incoming.version) throw new Error('not a body work log file');

  const sessions = [...current.sessions];
  const seen = new Set(sessions.map(s => s.id + s.d + (s.t || '')));
  (incoming.sessions || []).forEach(s => {
    if (!seen.has(s.id + s.d + (s.t || ''))) sessions.push(s);
  });
  sessions.sort((a, b) => a.d.localeCompare(b.d));

  const measures = { ...current.measures };
  Object.entries(incoming.measures || {}).forEach(([k, arr]) => {
    const existing = [...(measures[k] || [])];
    const dates = new Set(existing.map(p => p.d));
    arr.forEach(p => {
      if (!dates.has(p.d)) existing.push(p);
    });
    existing.sort((a, b) => a.d.localeCompare(b.d));
    measures[k] = existing;
  });

  const checkins = [...current.checkins];
  const cd = new Set(checkins.map(c => c.d));
  (incoming.checkins || []).forEach(c => {
    if (!cd.has(c.d)) checkins.push(c);
  });
  checkins.sort((a, b) => a.d.localeCompare(b.d));

  return { ...current, sessions, measures, checkins };
}

/* Plain text for a portal message or the top of a clinical brief.
   Given how much of this is appointment prep, this is the highest-value
   output in the whole view. */
export function summaryText(log) {
  const lines = [`Body work log — ${log.started} to ${today()}`, ''];

  lines.push('MEASUREMENTS');
  METRICS.forEach(m => {
    (m.sides ? ['L', 'R'] : [null]).forEach(side => {
      const arr = series(log, m.key, side);
      if (!arr.length) return;
      const first = arr[0];
      const last = arr[arr.length - 1];
      lines.push(
        `${m.label}${side ? ` (${side})` : ''}: ${first.v} ${m.unit} on ${first.d}` +
          (arr.length > 1 ? ` → ${last.v} on ${last.d}` : '') +
          `  [${arr.length} readings]`
      );
    });
  });

  lines.push('', 'ADHERENCE (last 30 days)');
  Object.keys(TRACK).forEach(id => {
    const n = countIn(log, id, 30);
    if (n) lines.push(`${NAME_BY_ID[id] || id}: ${n} sessions`);
  });

  const recent = log.checkins.slice(-14);
  if (recent.length) {
    lines.push('', 'DAILY CHECK-INS (most recent 14)');
    recent.forEach(c =>
      lines.push(`${c.d}  energy ${c.energy ?? '—'}/10${c.note ? `  ${c.note}` : ''}`)
    );
  }

  return lines.join('\n');
}

/* Newest-first feed of sessions and check-ins for the log panel. */
export function buildFeed(log, limit = 50) {
  const rows = [
    ...log.sessions.slice(-40).map(s => ({
      key: `s-${s.id}-${s.d}-${s.t || ''}`,
      label: NAME_BY_ID[s.id] || s.id,
      when: s.d,
    })),
    ...log.checkins.slice(-10).map(c => ({
      key: `c-${c.d}`,
      label: `Check-in — energy ${c.energy ?? '—'}/10${c.note ? ` · ${c.note}` : ''}`,
      when: c.d,
    })),
  ];
  rows.sort((a, b) => b.when.localeCompare(a.when));
  return rows.slice(0, limit);
}

export function logStats(log) {
  const days = new Set(log.sessions.map(s => s.d)).size;
  return { total: log.sessions.length, days, since: log.started };
}

export { M_BY_KEY };
