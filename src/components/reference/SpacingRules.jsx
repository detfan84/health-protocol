import { SPACING } from '../../data/spacing';

export default function SpacingRules({ theme }) {
  const { fg, sub, cardBg, cardBd, faint } = theme;

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: fg }}>Spacing Rules</div>
      {SPACING.map((r, i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: i < SPACING.length - 1 ? `1px solid ${faint}` : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: r.p === 2 ? '#e53935' : fg }}>
            {r.p === 2 ? '\u26A0\uFE0F ' : ''}{r.r}
          </div>
          <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{r.d}</div>
        </div>
      ))}
    </div>
  );
}
