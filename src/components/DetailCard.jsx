export default function DetailCard({ item, onClose, theme }) {
  const { fg, sub, cardBg, cardBd, pa } = theme;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: cardBg, borderRadius: 16, padding: 20,
          maxWidth: 480, width: '100%', maxHeight: '70vh', overflowY: 'auto',
          border: `1px solid ${cardBd}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: fg }}>{item.n || item.name}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: sub, padding: 4 }}>×</button>
        </div>
        {(item.d || item.dose) && (
          <div style={{ fontSize: 13, color: pa, fontWeight: 600, marginBottom: 8 }}>
            {item.d || item.dose}
          </div>
        )}
        {(item.w || item.why) && (
          <div style={{ fontSize: 13, color: sub, fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 }}>
            {item.w || item.why}
          </div>
        )}
        {item.details && (
          <div style={{ fontSize: 13, color: fg, lineHeight: 1.6 }}>
            {item.details}
          </div>
        )}
        {item.formCue && (
          <div style={{ fontSize: 13, color: fg, lineHeight: 1.6 }}>
            <strong>Form: </strong>{item.formCue}
          </div>
        )}
        {item.progression && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 6 }}>Progression</div>
            {item.progression.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: fg, padding: '4px 0', borderBottom: `1px solid ${theme.faint}` }}>
                <span style={{ color: pa, fontWeight: 600 }}>Lv{p.level}</span>{' '}
                {p.name}{p.note ? ` — ${p.note}` : ''}
              </div>
            ))}
          </div>
        )}
        {item.shopUrl && (
          <a
            href={item.shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', marginTop: 12, padding: '8px 16px',
              borderRadius: 8, background: pa, color: '#fff', fontSize: 13,
              fontWeight: 600, textDecoration: 'none',
            }}
          >
            Shop this item
          </a>
        )}
      </div>
    </div>
  );
}
