const SIGNALS = [
  ['Reflux/motility returns', 'Restart Reflux Pro + Motility 30\u201390 days'],
  ['Digestive issues after improvement', 'Nano Scrub + Cleanse 30 days'],
  ['Fatigue/brain fog returns', 'Parasite pulse + labs'],
  ['Autoimmune flare', 'Labs + stool test + food sensitivity panel'],
  ['Organisms in stool', 'Full parasite protocol repeat'],
];

export default function SymptomsGuide({ theme }) {
  const { fg, sub, cardBg, cardBd, faint } = theme;

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: fg }}>When Symptoms Return</div>
      {SIGNALS.map(([s, a], i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: i < SIGNALS.length - 1 ? `1px solid ${faint}` : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: fg }}>{s}</div>
          <div style={{ fontSize: 11, color: theme.dark ? '#64b5f6' : '#1565c0', marginTop: 2 }}>{'\u2192'} {a}</div>
        </div>
      ))}
    </div>
  );
}
