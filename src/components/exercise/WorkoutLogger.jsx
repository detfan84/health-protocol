import { useState } from 'react';
import { EXERCISES } from '../../data/exercises';
import { useSettings } from '../../context/SettingsContext';
import { formatWeight } from '../../lib/units';
import DetailCard from '../DetailCard';

export default function WorkoutLogger({ routine, workout, onSave, onBack, theme }) {
  const { unitSystem } = useSettings();
  const [log, setLog] = useState(workout || {});
  const [detailEx, setDetailEx] = useState(null);
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;

  const getExercise = (id) => EXERCISES.find(e => e.id === id);

  const getSetLog = (exId) => log[exId] || [];

  const updateSet = (exId, setIdx, field, value) => {
    const sets = [...getSetLog(exId)];
    sets[setIdx] = { ...sets[setIdx], [field]: value };
    const next = { ...log, [exId]: sets };
    setLog(next);
    onSave(next);
  };

  const addSet = (exId) => {
    const sets = [...getSetLog(exId)];
    const prev = sets[sets.length - 1];
    sets.push(prev ? { ...prev } : { reps: 0 });
    const next = { ...log, [exId]: sets };
    setLog(next);
    onSave(next);
  };

  const removeSet = (exId, setIdx) => {
    const sets = getSetLog(exId).filter((_, i) => i !== setIdx);
    const next = { ...log, [exId]: sets };
    setLog(next);
    onSave(next);
  };

  return (
    <div>
      <button onClick={onBack} style={{ fontSize: 12, color: pa, padding: '8px 0', marginBottom: 8, fontWeight: 600 }}>
        {'\u2190'} Back
      </button>
      <div style={{ fontWeight: 700, fontSize: 16, color: fg, marginBottom: 12 }}>
        {routine.name} — Log Workout
      </div>

      {routine.exercises.map((item, idx) => {
        const ex = getExercise(item.exerciseId);
        if (!ex) return null;
        const prog = ex.progression.find(p => p.level === item.currentLevel) || ex.progression[0];
        const sets = getSetLog(item.exerciseId);
        const isWeighted = ex.trackingType === 'reps_weight';
        const isDuration = ex.trackingType === 'duration';

        // Pre-fill sets if empty
        if (sets.length === 0) {
          const prefilled = [];
          for (let i = 0; i < item.sets; i++) {
            prefilled.push(isDuration ? { duration: item.targetDuration || 30 } : { reps: item.targetReps || 10, weight: 0 });
          }
          const next = { ...log, [item.exerciseId]: prefilled };
          setLog(next);
        }

        return (
          <div key={idx} style={{
            padding: 12, borderRadius: 10, border: `1px solid ${cardBd}`,
            background: cardBg, marginBottom: 8,
          }}>
            <div style={{ cursor: 'pointer' }} onClick={() => setDetailEx(ex)}>
              <div style={{ fontWeight: 600, fontSize: 13, color: fg }}>
                {ex.name} <span style={{ fontSize: 10, color: pa }}>{'\u2139\uFE0F'}</span>
              </div>
              <div style={{ fontSize: 11, color: pa, marginTop: 1, marginBottom: 8 }}>
                Lv{item.currentLevel}: {prog.name}
              </div>
            </div>

            {(sets.length > 0 ? sets : [isDuration ? { duration: 30 } : { reps: 10, weight: 0 }]).map((s, si) => (
              <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: sub, width: 30 }}>Set {si + 1}</span>
                {isDuration ? (
                  <>
                    <input
                      type="number"
                      value={s.duration || 0}
                      onChange={e => updateSet(item.exerciseId, si, 'duration', parseInt(e.target.value) || 0)}
                      style={{ width: 60, padding: 4, borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 12, textAlign: 'center', background: inputBg, color: fg }}
                    />
                    <span style={{ fontSize: 11, color: sub }}>sec</span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={s.reps || 0}
                      onChange={e => updateSet(item.exerciseId, si, 'reps', parseInt(e.target.value) || 0)}
                      style={{ width: 50, padding: 4, borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 12, textAlign: 'center', background: inputBg, color: fg }}
                    />
                    <span style={{ fontSize: 11, color: sub }}>reps</span>
                    {isWeighted && (
                      <>
                        <span style={{ fontSize: 11, color: sub }}>×</span>
                        <input
                          type="number"
                          value={s.weight || 0}
                          onChange={e => updateSet(item.exerciseId, si, 'weight', parseFloat(e.target.value) || 0)}
                          style={{ width: 60, padding: 4, borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 12, textAlign: 'center', background: inputBg, color: fg }}
                        />
                        <span style={{ fontSize: 11, color: sub }}>{unitSystem === 'metric' ? 'kg' : 'lb'}</span>
                      </>
                    )}
                  </>
                )}
                <button onClick={() => removeSet(item.exerciseId, si)} style={{ fontSize: 12, color: '#e53935', padding: 2 }}>{'\u2715'}</button>
              </div>
            ))}
            <button
              onClick={() => addSet(item.exerciseId)}
              style={{ fontSize: 11, color: pa, padding: '4px 0', fontWeight: 600, marginTop: 4 }}
            >
              + Add Set
            </button>
          </div>
        );
      })}
      {detailEx && <DetailCard item={detailEx} onClose={() => setDetailEx(null)} theme={theme} />}
    </div>
  );
}
