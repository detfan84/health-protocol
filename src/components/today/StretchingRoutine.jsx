import { useState } from 'react';
import { STRETCHING_ROUTINES } from '../../data/stretching';

export default function StretchingRoutine({ onClose, theme }) {
  const [routineType, setRoutineType] = useState('morning');
  const [duration, setDuration] = useState(10);
  const [completed, setCompleted] = useState({});
  const [detailIdx, setDetailIdx] = useState(null);
  const { fg, sub, cardBg, cardBd, faint, pa, inputBg } = theme;

  const routine = STRETCHING_ROUTINES[routineType];
  const stretches = routine.durations[duration] || [];
  const totalSec = stretches.reduce((s, x) => s + x.duration, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;

  const toggleStretch = (idx) => {
    setCompleted({ ...completed, [idx]: !completed[idx] });
  };

  const detailStretch = detailIdx !== null ? stretches[detailIdx] : null;

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
          maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto',
          border: `1px solid ${cardBd}`,
        }}
      >
        {/* Detail view */}
        {detailStretch ? (
          <div>
            <button
              onClick={() => setDetailIdx(null)}
              style={{ fontSize: 12, color: pa, padding: '4px 0', marginBottom: 8, fontWeight: 600 }}
            >
              {'\u2190'} Back to routine
            </button>
            <div style={{ fontWeight: 700, fontSize: 18, color: fg, marginBottom: 4 }}>{detailStretch.name}</div>
            <div style={{ fontSize: 11, color: pa, marginBottom: 8 }}>
              {detailStretch.muscles.join(', ')} · {detailStretch.duration}s
            </div>
            <div style={{ fontSize: 13, color: fg, lineHeight: 1.7, marginBottom: 16 }}>
              {detailStretch.details}
            </div>

            {/* Difficulty variants */}
            {detailStretch.variants && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Difficulty Variations
                </div>
                {detailStretch.variants.map((v, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', borderRadius: 8, marginBottom: 6,
                    background: faint, border: `1px solid ${cardBd}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: v.level === 'easy' ? '#4caf50' : v.level === 'advanced' ? '#ff9800' : pa, textTransform: 'capitalize' }}>
                      {v.level}
                    </div>
                    <div style={{ fontSize: 12, color: fg, marginTop: 2 }}>{v.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Routine list view */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: fg }}>Stretching Routine</div>
              <button onClick={onClose} style={{ fontSize: 20, color: sub, padding: 4 }}>×</button>
            </div>

            {/* Routine type toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {Object.entries(STRETCHING_ROUTINES).map(([key, r]) => (
                <button
                  key={key}
                  onClick={() => { setRoutineType(key); setCompleted({}); setDetailIdx(null); }}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${routineType === key ? pa : cardBd}`,
                    background: routineType === key ? (theme.dark ? '#2a2a3a' : '#e8eaf6') : 'transparent',
                    color: routineType === key ? pa : sub,
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>

            {/* Duration selector */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
              {[5, 10, 15, 20, 25, 30].map(d => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); setCompleted({}); }}
                  style={{
                    flex: 1, minWidth: 40, padding: '6px 4px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${duration === d ? '#4caf50' : cardBd}`,
                    background: duration === d ? (theme.dark ? '#1a2e1a' : '#e8f5e9') : 'transparent',
                    color: duration === d ? '#4caf50' : sub,
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: sub, marginBottom: 10 }}>
              {routine.description} · {stretches.length} stretches · ~{Math.round(totalSec / 60)} min
              {completedCount > 0 && ` · ${completedCount}/${stretches.length} done`}
            </div>

            {/* Stretch list */}
            {stretches.map((st, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 0', borderBottom: `1px solid ${faint}`,
                }}
              >
                <div
                  onClick={() => toggleStretch(idx)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    border: `2px solid ${completed[idx] ? '#4caf50' : cardBd}`,
                    background: completed[idx] ? '#4caf50' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'white', fontWeight: 700, marginTop: 1,
                  }}
                >
                  {completed[idx] && '\u2713'}
                </div>
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => setDetailIdx(idx)}
                >
                  <div style={{
                    fontWeight: 600, fontSize: 13,
                    color: completed[idx] ? sub : fg,
                    textDecoration: completed[idx] ? 'line-through' : 'none',
                  }}>
                    {st.name}
                    <span style={{ fontSize: 10, color: pa, marginLeft: 6 }}>{'\u2139\uFE0F'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: pa, marginTop: 1 }}>{st.duration}s · {st.muscles.join(', ')}</div>
                  <div style={{ fontSize: 11, color: sub, fontStyle: 'italic', marginTop: 1 }}>{st.note}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
