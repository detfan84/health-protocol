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

export function getPhaseInfo(startDate, asOfDate) {
  if (!startDate) return { si: 0, dis: 1, td: 1, pid: 1 };
  const ref = asOfDate ? parseLocalDate(asOfDate) : parseLocalDate(today());
  const start = parseLocalDate(startDate);
  const diff = Math.max(0, Math.floor((ref.getTime() - start.getTime()) / 86400000));
  let acc = 0;
  for (let i = 0; i < SUBPHASES.length; i++) {
    if (diff < acc + SUBPHASES[i].days) {
      return { si: i, dis: diff - acc + 1, td: diff + 1, pid: SUBPHASES[i].pid };
    }
    acc += SUBPHASES[i].days;
  }
  return { si: SUBPHASES.length - 1, dis: 1, td: diff + 1, pid: 4 };
}
