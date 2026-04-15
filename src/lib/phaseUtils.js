import { SUBPHASES } from '../data/phases';

// Local date string YYYY-MM-DD (not UTC)
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getHour() {
  return new Date().getHours();
}

// Parse a YYYY-MM-DD string as local midnight (not UTC)
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Build an effective SUBPHASES array with user duration overrides applied.
// overrides is an object like { 0: 21, 1: 21 } mapping subphase index -> days.
export function getEffectiveSubphases(overrides = {}) {
  return SUBPHASES.map((sp, i) => {
    const v = overrides?.[i];
    const days = (v != null && Number(v) > 0) ? Number(v) : sp.days;
    return { ...sp, days };
  });
}

export function getPhaseInfo(startDate, asOfDate, offset = 0, overrides = {}) {
  if (!startDate) return { si: 0, dis: 1, td: 1, pid: 1 };
  const ref = asOfDate ? parseLocalDate(asOfDate) : parseLocalDate(today());
  const start = parseLocalDate(startDate);
  const rawDiff = Math.floor((ref.getTime() - start.getTime()) / 86400000);
  const diff = Math.max(0, rawDiff + (offset || 0));
  const subs = getEffectiveSubphases(overrides);
  let acc = 0;
  for (let i = 0; i < subs.length; i++) {
    if (diff < acc + subs[i].days) {
      return { si: i, dis: diff - acc + 1, td: diff + 1, pid: subs[i].pid };
    }
    acc += subs[i].days;
  }
  return { si: subs.length - 1, dis: 1, td: diff + 1, pid: 4 };
}

// Compute the offset needed so that today becomes day `dayInSubphase` of
// subphase `targetSi`. Defaults to day 1.
export function computeOffsetForSubphase(startDate, targetSi, overrides = {}, dayInSubphase = 1) {
  if (!startDate) return 0;
  const ref = parseLocalDate(today());
  const start = parseLocalDate(startDate);
  const rawDiff = Math.floor((ref.getTime() - start.getTime()) / 86400000);
  const subs = getEffectiveSubphases(overrides);
  let acc = 0;
  for (let i = 0; i < targetSi; i++) acc += subs[i].days;
  return acc + (dayInSubphase - 1) - rawDiff;
}
