export default function FoodLog({ food, onUpdate, date, theme }) {
  const { fg, sub, cardBg, cardBd, inputBg } = theme;
  const fields = [['m1', 'First Meal'], ['m2', 'Second Meal'], ['sn', 'Snacks/Other']];

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: fg }}>Food Log — {date}</div>
      {fields.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: sub, marginBottom: 4 }}>{v}</div>
          <textarea
            value={food[k] || ''}
            onChange={e => onUpdate({ ...food, [k]: e.target.value })}
            placeholder="What did you eat?"
            style={{
              width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${cardBd}`,
              fontSize: 13, resize: 'vertical', minHeight: 50, background: inputBg, color: fg,
            }}
          />
        </div>
      ))}
    </div>
  );
}
