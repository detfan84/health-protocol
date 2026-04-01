export default function Journal({ journal, onUpdate, theme }) {
  const { fg, sub, cardBg, cardBd, inputBg } = theme;

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: fg }}>How Do I Feel Today?</div>
      <textarea
        value={journal}
        onChange={e => onUpdate(e.target.value)}
        placeholder="Energy, digestion, mood, die-off symptoms, sleep, anything notable..."
        style={{
          width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${cardBd}`,
          fontSize: 13, resize: 'vertical', minHeight: 100, background: inputBg,
          color: fg, lineHeight: 1.5,
        }}
      />
      <div style={{ fontSize: 11, color: sub, marginTop: 6 }}>Saved automatically.</div>
    </div>
  );
}
