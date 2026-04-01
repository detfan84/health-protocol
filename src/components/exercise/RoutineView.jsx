import { useState } from 'react';
import { EXERCISES } from '../../data/exercises';
import ExerciseBrowser from './ExerciseBrowser';
import DetailCard from '../DetailCard';

export default function RoutineView({ routine, onSave, onDelete, onBack, theme }) {
  const [edited, setEdited] = useState({ ...routine });
  const [showBrowser, setShowBrowser] = useState(false);
  const [detailEx, setDetailEx] = useState(null);
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;

  const getExercise = (id) => EXERCISES.find(e => e.id === id);

  const updateExercise = (idx, field, value) => {
    const exs = [...edited.exercises];
    exs[idx] = { ...exs[idx], [field]: value };
    setEdited({ ...edited, exercises: exs });
  };

  const removeExercise = (idx) => {
    const exs = edited.exercises.filter((_, i) => i !== idx);
    setEdited({ ...edited, exercises: exs });
  };

  const moveExercise = (idx, dir) => {
    const exs = [...edited.exercises];
    const target = idx + dir;
    if (target < 0 || target >= exs.length) return;
    [exs[idx], exs[target]] = [exs[target], exs[idx]];
    setEdited({ ...edited, exercises: exs });
  };

  const addExercise = (ex) => {
    setEdited({
      ...edited,
      exercises: [...edited.exercises, {
        exerciseId: ex.id,
        currentLevel: 1,
        sets: 3,
        targetReps: ex.trackingType === 'duration' ? undefined : 10,
        targetDuration: ex.trackingType === 'duration' ? 30 : undefined,
      }],
    });
    setShowBrowser(false);
  };

  const progressExercise = (idx, dir) => {
    const item = edited.exercises[idx];
    const ex = getExercise(item.exerciseId);
    if (!ex) return;
    const newLevel = Math.max(1, Math.min(ex.progression.length, item.currentLevel + dir));
    updateExercise(idx, 'currentLevel', newLevel);
  };

  if (showBrowser) {
    return (
      <div>
        <button onClick={() => setShowBrowser(false)} style={{ fontSize: 12, color: pa, padding: '8px 0', marginBottom: 8, fontWeight: 600 }}>
          {'\u2190'} Back to Routine
        </button>
        <ExerciseBrowser onAddToRoutine={addExercise} theme={theme} />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ fontSize: 12, color: pa, padding: '8px 0', marginBottom: 8, fontWeight: 600 }}>
        {'\u2190'} All Routines
      </button>

      <input
        value={edited.name}
        onChange={e => setEdited({ ...edited, name: e.target.value })}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8, marginBottom: 12,
          border: `1px solid ${cardBd}`, fontSize: 16, fontWeight: 700,
          background: inputBg, color: fg,
        }}
      />

      {edited.exercises.map((item, idx) => {
        const ex = getExercise(item.exerciseId);
        if (!ex) return null;
        const prog = ex.progression.find(p => p.level === item.currentLevel) || ex.progression[0];

        return (
          <div key={idx} style={{
            padding: 12, borderRadius: 10, border: `1px solid ${cardBd}`,
            background: cardBg, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ cursor: 'pointer' }} onClick={() => setDetailEx(ex)}>
                <div style={{ fontWeight: 600, fontSize: 13, color: fg }}>
                  {ex.name} <span style={{ fontSize: 10, color: pa }}>{'\u2139\uFE0F'}</span>
                </div>
                <div style={{ fontSize: 11, color: pa, marginTop: 2 }}>
                  Lv{item.currentLevel}: {prog.name}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => moveExercise(idx, -1)} style={{ fontSize: 14, color: sub, padding: 4 }}>{'\u25B2'}</button>
                <button onClick={() => moveExercise(idx, 1)} style={{ fontSize: 14, color: sub, padding: 4 }}>{'\u25BC'}</button>
                <button onClick={() => removeExercise(idx)} style={{ fontSize: 14, color: '#e53935', padding: 4 }}>{'\u2715'}</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <button onClick={() => progressExercise(idx, -1)} style={{ fontSize: 11, color: sub, padding: '2px 6px', border: `1px solid ${cardBd}`, borderRadius: 4 }}>
                Regress
              </button>
              <button onClick={() => progressExercise(idx, 1)} style={{ fontSize: 11, color: pa, padding: '2px 6px', border: `1px solid ${pa}`, borderRadius: 4 }}>
                Progress
              </button>
              <span style={{ fontSize: 11, color: sub }}>·</span>
              <label style={{ fontSize: 11, color: sub }}>Sets:</label>
              <input
                type="number"
                value={item.sets}
                onChange={e => updateExercise(idx, 'sets', parseInt(e.target.value) || 1)}
                style={{ width: 40, padding: 2, borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 12, textAlign: 'center', background: inputBg, color: fg }}
              />
              {ex.trackingType === 'duration' ? (
                <>
                  <label style={{ fontSize: 11, color: sub }}>Sec:</label>
                  <input
                    type="number"
                    value={item.targetDuration || 30}
                    onChange={e => updateExercise(idx, 'targetDuration', parseInt(e.target.value) || 10)}
                    style={{ width: 50, padding: 2, borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 12, textAlign: 'center', background: inputBg, color: fg }}
                  />
                </>
              ) : (
                <>
                  <label style={{ fontSize: 11, color: sub }}>Reps:</label>
                  <input
                    type="number"
                    value={item.targetReps || 10}
                    onChange={e => updateExercise(idx, 'targetReps', parseInt(e.target.value) || 1)}
                    style={{ width: 50, padding: 2, borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 12, textAlign: 'center', background: inputBg, color: fg }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setShowBrowser(true)}
        style={{
          width: '100%', padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 600,
          border: `2px dashed ${cardBd}`, color: sub, marginBottom: 12,
        }}
      >
        + Add Exercise
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onSave(edited)}
          style={{
            flex: 1, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: pa, color: '#fff',
          }}
        >
          Save Routine
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(edited)}
            style={{
              padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: '1px solid #e53935', color: '#e53935',
            }}
          >
            Delete
          </button>
        )}
      </div>
      {detailEx && <DetailCard item={detailEx} onClose={() => setDetailEx(null)} theme={theme} />}
    </div>
  );
}
