import { useState } from 'react';
import { SYMPTOMS } from '../../data/symptoms';

export default function SymptomTracker({ symptoms, onUpdate, theme }) {
  const { fg, sub, cardBg, cardBd, faint, pa } = theme;
  const [expanded, setExpanded] = useState(false);

  const rated = SYMPTOMS.filter(s => symptoms[s.id] !== undefined);

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: fg }}>
          Symptom Tracker {rated.length > 0 && `(${rated.length} rated)`}
        </div>
        <span style={{ fontSize: 12, color: sub, transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
          {'\u25BE'}
        </span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>
            Rate each symptom 0–5 (tap a number to set, tap again to clear)
          </div>
          {SYMPTOMS.map(s => {
            const val = symptoms[s.id];
            return (
              <div key={s.id} style={{ padding: '8px 0', borderBottom: `1px solid ${faint}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: fg, marginBottom: 4 }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: sub, width: 50 }}>{s.low}</span>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        const next = val === n ? undefined : n;
                        const updated = { ...symptoms };
                        if (next === undefined) delete updated[s.id];
                        else updated[s.id] = next;
                        onUpdate(updated);
                      }}
                      style={{
                        width: 28, height: 28, borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: `1.5px solid ${val === n ? pa : cardBd}`,
                        background: val === n ? (theme.dark ? '#2a2a3a' : '#e8eaf6') : 'transparent',
                        color: val === n ? pa : sub,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <span style={{ fontSize: 10, color: sub, width: 50, textAlign: 'right' }}>{s.high}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
