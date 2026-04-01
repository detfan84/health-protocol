import { SUBPHASES } from '../data/phases';

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getHour() {
  return new Date().getHours();
}

export function getPhaseInfo(startDate, asOfDate) {
  if (!startDate) return { si: 0, dis: 1, td: 1, pid: 1 };
  const refTime = asOfDate ? new Date(asOfDate + 'T12:00:00').getTime() : Date.now();
  const diff = Math.max(0, Math.floor((refTime - new Date(startDate).getTime()) / 86400000));
  let acc = 0;
  for (let i = 0; i < SUBPHASES.length; i++) {
    if (diff < acc + SUBPHASES[i].days) {
      return { si: i, dis: diff - acc + 1, td: diff + 1, pid: SUBPHASES[i].pid };
    }
    acc += SUBPHASES[i].days;
  }
  return { si: SUBPHASES.length - 1, dis: 1, td: diff + 1, pid: 4 };
}
