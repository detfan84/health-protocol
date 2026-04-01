export default function AnnualLabs({ theme, startDate, onResetStart }) {
  const { fg, sub, cardBg, cardBd } = theme;

  return (
    <>
      <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: fg }}>Annual Labs</div>
        <div style={{ fontSize: 12, color: sub, lineHeight: 1.7 }}>
          GI-MAP · Metabolic panel · Liver enzymes · CBC w/ differential · CRP+ESR · Hormone panel · Vitamin D · Thyroid panel (TSH, fT3, fT4, antibodies)
        </div>
      </div>
      <div style={{
        margin: '8px 16px', padding: '12px 14px', borderRadius: 10,
        background: theme.dark ? '#2a1a1a' : '#fef3f3',
        border: `1px solid ${theme.dark ? '#4a2a2a' : '#f0d0d0'}`,
        fontSize: 11, color: theme.dark ? '#ff8a80' : '#8b4545', lineHeight: 1.5,
      }}>
        <strong>Not medical advice.</strong> Work with a practitioner for pharmaceutical dosing, lab interpretation, and autoimmune monitoring.
      </div>
      {startDate && (
        <div style={{ padding: '8px 16px' }}>
          <button
            onClick={onResetStart}
            style={{ fontSize: 11, color: '#e53935', textDecoration: 'underline', padding: '8px 0' }}
          >
            Reset start date
          </button>
        </div>
      )}
    </>
  );
}
