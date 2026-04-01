import { ROUTINE_TEMPLATES } from '../../data/routines';

export default function RoutineList({ userRoutines, onSelect, onCreateFromTemplate, onCreateNew, theme }) {
  const { fg, sub, cardBg, cardBd, pa, faint } = theme;

  return (
    <div>
      {/* User's saved routines */}
      {userRoutines.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            My Routines
          </div>
          {userRoutines.map((r, i) => (
            <div
              key={i}
              onClick={() => onSelect(r)}
              style={{
                padding: 12, borderRadius: 10, border: `1px solid ${cardBd}`,
                background: cardBg, marginBottom: 8, cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: fg }}>{r.name}</div>
              <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                {r.exercises.length} exercises
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates */}
      <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Start from Template
      </div>
      {ROUTINE_TEMPLATES.map(t => (
        <div
          key={t.id}
          style={{
            padding: 12, borderRadius: 10, border: `1px solid ${cardBd}`,
            background: cardBg, marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: fg, marginBottom: 2 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>{t.description}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                onClick={() => onCreateFromTemplate(t, d)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${pa}`, color: pa, textTransform: 'capitalize',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Create custom */}
      <button
        onClick={onCreateNew}
        style={{
          width: '100%', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 600,
          border: `2px dashed ${cardBd}`, color: sub, marginTop: 8,
        }}
      >
        + Create Custom Routine
      </button>
    </div>
  );
}
