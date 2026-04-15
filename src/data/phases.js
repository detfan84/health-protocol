export const SUBPHASES = [
  { name: 'Liver + Biofilm Prep', days: 21, pid: 1, label: 'Wks 1–3' },
  { name: 'Kidney + Biofilm Prep', days: 21, pid: 1, label: 'Wks 4–6' },
  { name: 'Parasite Kill', days: 30, pid: 1, label: 'Wks 7–10+' },
  { name: 'Heavy Metal Detox', days: 30, pid: 1, label: 'Wks 11–15' },
  { name: 'Cleanup Ramp-Up', days: 14, pid: 2, label: 'Wks 1–2' },
  { name: 'Full Cleanup + Probiotics', days: 42, pid: 2, label: 'Wks 3–8' },
  { name: 'Probiotic Diversification', days: 28, pid: 2, label: 'Wks 9–12' },
  { name: 'Gradual Rho Intro', days: 21, pid: 3, label: 'Wks 1–3' },
  { name: 'Full Stack + DIM+', days: 90, pid: 3, label: 'Wk 4+' },
  { name: 'Daily Maintenance', days: 365, pid: 4, label: 'Ongoing' },
];

export const PHASE_META = [
  { id: 1, name: 'Detox + Biofilm Assault', color: '#2D5016', accent: '#8BC34A', dk: '#4a7a2e', dka: '#a4d65e' },
  { id: 2, name: 'Gut Deep Clean + Rebuild', color: '#1A3A5C', accent: '#42A5F5', dk: '#3a6a9c', dka: '#64b5f6' },
  { id: 3, name: 'Cellular Optimization', color: '#5C1A5C', accent: '#CE93D8', dk: '#9c4a9c', dka: '#e1bee7' },
  { id: 4, name: 'Lifelong Maintenance', color: '#8B4513', accent: '#DEB887', dk: '#c4813a', dka: '#f0d0a0' },
];

export const TOTAL_DAYS = SUBPHASES.reduce((s, p) => s + p.days, 0);
