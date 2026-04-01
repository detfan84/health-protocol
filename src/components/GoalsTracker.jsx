import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getSetting, setSetting } from '../lib/db';
import { displayWeight } from '../lib/units';

const GOAL_TYPES = [
  { id: 'weight', name: 'Weight Goal', icon: '\u2696\uFE0F', unit: 'weight', placeholder: 'Target weight' },
  { id: 'body_fat', name: 'Body Fat %', icon: '\uD83D\uDCCA', unit: '%', placeholder: 'Target body fat %' },
  { id: 'exercise', name: 'Exercise Goal', icon: '\uD83D\uDCAA', unit: 'custom', placeholder: 'e.g. 100 push-ups without stopping' },
  { id: 'hydration', name: 'Hydration Streak', icon: '\uD83D\uDCA7', unit: 'days', placeholder: 'Days hitting target' },
  { id: 'supplement', name: 'Supplement Streak', icon: '\uD83D\uDC8A', unit: 'days', placeholder: 'Days at 80%+ completion' },
  { id: 'custom', name: 'Custom Goal', icon: '\uD83C\uDFAF', unit: 'custom', placeholder: 'Describe your goal' },
];

export default function GoalsTracker({ theme }) {
  const { unitSystem, bodyWeight } = useSettings();
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;

  const [goals, setGoals] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ type: 'weight', target: '', targetDate: '', description: '' });

  useEffect(() => {
    getSetting('goals').then(g => setGoals(g || []));
  }, []);

  const saveGoals = (updated) => {
    setGoals(updated);
    setSetting('goals', updated);
  };

  const addGoal = () => {
    if (!newGoal.target && !newGoal.description) return;
    const goalType = GOAL_TYPES.find(t => t.id === newGoal.type);
    const goal = {
      id: `goal-${Date.now()}`,
      type: newGoal.type,
      typeName: goalType.name,
      icon: goalType.icon,
      target: newGoal.target,
      targetDate: newGoal.targetDate || null,
      description: newGoal.description || `Reach ${newGoal.target}${goalType.unit === 'weight' ? (unitSystem === 'metric' ? ' kg' : ' lb') : goalType.unit === '%' ? '%' : goalType.unit === 'days' ? ' days' : ''}`,
      createdAt: new Date().toISOString().slice(0, 10),
      completed: false,
    };
    saveGoals([...goals, goal]);
    setNewGoal({ type: 'weight', target: '', targetDate: '', description: '' });
    setShowAdd(false);
  };

  const toggleComplete = (goalId) => {
    saveGoals(goals.map(g =>
      g.id === goalId ? { ...g, completed: !g.completed, completedAt: !g.completed ? new Date().toISOString().slice(0, 10) : null } : g
    ));
  };

  const removeGoal = (goalId) => {
    saveGoals(goals.filter(g => g.id !== goalId));
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const getProgress = (goal) => {
    if (goal.type === 'weight' && bodyWeight && goal.target) {
      const targetLb = unitSystem === 'metric' ? Math.round(parseFloat(goal.target) / 0.453592) : parseFloat(goal.target);
      const startDiff = Math.abs(bodyWeight - targetLb);
      if (startDiff === 0) return 1;
      // Simple progress — how close are we?
      const currentDiff = Math.abs(bodyWeight - targetLb);
      return Math.max(0, Math.min(1, 1 - currentDiff / Math.max(startDiff, 1)));
    }
    return null;
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${cardBd}`, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: fg }}>Goals</div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ fontSize: 11, fontWeight: 600, color: showAdd ? '#e53935' : pa, padding: '2px 8px', borderRadius: 4, border: `1px solid ${showAdd ? '#e53935' : pa}` }}
        >
          {showAdd ? 'Cancel' : '+ Add Goal'}
        </button>
      </div>

      {/* Add goal form */}
      {showAdd && (
        <div style={{ padding: 10, borderRadius: 8, background: faint, border: `1px solid ${cardBd}`, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: sub, marginBottom: 6 }}>Goal Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {GOAL_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setNewGoal({ ...newGoal, type: t.id })}
                style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                  border: `1.5px solid ${newGoal.type === t.id ? pa : cardBd}`,
                  background: newGoal.type === t.id ? (theme.dark ? '#2a2a3a' : '#e8eaf6') : 'transparent',
                  color: newGoal.type === t.id ? pa : sub,
                }}
              >
                {t.icon} {t.name}
              </button>
            ))}
          </div>

          {/* Target value */}
          {newGoal.type !== 'custom' && newGoal.type !== 'exercise' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: sub, marginBottom: 4 }}>
                Target {newGoal.type === 'weight' ? `(${unitSystem === 'metric' ? 'kg' : 'lb'})` : newGoal.type === 'body_fat' ? '(%)' : '(days)'}
              </div>
              <input
                type="number"
                value={newGoal.target}
                onChange={e => setNewGoal({ ...newGoal, target: e.target.value })}
                placeholder={GOAL_TYPES.find(t => t.id === newGoal.type)?.placeholder}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg }}
              />
            </div>
          )}

          {/* Description for exercise/custom goals */}
          {(newGoal.type === 'exercise' || newGoal.type === 'custom') && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: sub, marginBottom: 4 }}>Describe your goal</div>
              <input
                type="text"
                value={newGoal.description}
                onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder={GOAL_TYPES.find(t => t.id === newGoal.type)?.placeholder}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg }}
              />
            </div>
          )}

          {/* Target date */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: sub, marginBottom: 4 }}>Target date (optional)</div>
            <input
              type="date"
              value={newGoal.targetDate}
              onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg }}
            />
          </div>

          <button
            onClick={addGoal}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: pa, color: '#fff', opacity: (newGoal.target || newGoal.description) ? 1 : 0.4 }}
          >
            Add Goal
          </button>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length === 0 && !showAdd && (
        <div style={{ fontSize: 12, color: sub, textAlign: 'center', padding: 12 }}>
          No active goals. Set a target to work toward.
        </div>
      )}

      {activeGoals.map(goal => {
        const progress = getProgress(goal);
        const days = daysUntil(goal.targetDate);

        return (
          <div key={goal.id} style={{ padding: '10px 0', borderBottom: `1px solid ${faint}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: fg }}>
                  {goal.icon} {goal.description}
                </div>
                <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                  {goal.typeName}
                  {goal.targetDate && days !== null && (
                    <span> · {days > 0 ? `${days} days left` : days === 0 ? 'Due today' : `${Math.abs(days)} days overdue`}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => toggleComplete(goal.id)} style={{ fontSize: 14, color: '#4caf50', padding: 4 }}>{'\u2713'}</button>
                <button onClick={() => removeGoal(goal.id)} style={{ fontSize: 12, color: '#e53935', padding: 4 }}>{'\u2715'}</button>
              </div>
            </div>
            {progress !== null && (
              <div style={{ marginTop: 6, height: 4, background: faint, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: pa, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Completed ({completedGoals.length})
          </div>
          {completedGoals.map(goal => (
            <div key={goal.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${faint}` }}>
              <div style={{ fontSize: 11, color: sub, textDecoration: 'line-through' }}>
                {goal.icon} {goal.description}
              </div>
              <div style={{ fontSize: 10, color: '#4caf50' }}>{goal.completedAt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
