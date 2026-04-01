import { useState } from 'react';
import { DEFAULT_MOVEMENTS, MOVEMENT_CATEGORIES } from '../../data/movements';
import StretchingRoutine from './StretchingRoutine';

export default function MovementChecklist({ moves, activeMovements, onToggle, onUpdateActivity, onUpdateActiveMovements, encouragement, theme }) {
  const { fg, sub, cardBg, cardBd, faint, pa, inputBg } = theme;
  const [showStretching, setShowStretching] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newItem, setNewItem] = useState({ n: '', w: '' });

  // Use activeMovements (user's chosen list) or fall back to first 5 defaults
  const allItems = [...DEFAULT_MOVEMENTS, ...(activeMovements?.custom || [])];
  const enabledIds = activeMovements?.enabled || DEFAULT_MOVEMENTS.slice(0, 5).map(m => m.id);
  const visibleItems = allItems.filter(m => enabledIds.includes(m.id));

  const toggleEnabled = (id) => {
    const current = activeMovements || { enabled: enabledIds, custom: [] };
    const newEnabled = current.enabled?.includes(id)
      ? current.enabled.filter(x => x !== id)
      : [...(current.enabled || enabledIds), id];
    onUpdateActiveMovements({ ...current, enabled: newEnabled });
  };

  const addCustomItem = () => {
    if (!newItem.n.trim()) return;
    const id = `custom-${Date.now()}`;
    const current = activeMovements || { enabled: enabledIds, custom: [] };
    const item = { id, n: newItem.n.trim(), w: newItem.w.trim(), category: 'custom' };
    onUpdateActiveMovements({
      ...current,
      custom: [...(current.custom || []), item],
      enabled: [...(current.enabled || enabledIds), id],
    });
    setNewItem({ n: '', w: '' });
  };

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: '12px 16px', border: `1px solid ${cardBd}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: fg }}>Movement & Support</div>
        <button
          onClick={() => setShowCustomize(!showCustomize)}
          style={{ fontSize: 10, fontWeight: 600, color: showCustomize ? '#e53935' : pa, padding: '2px 8px', borderRadius: 4, border: `1px solid ${showCustomize ? '#e53935' : pa}` }}
        >
          {showCustomize ? 'Done' : 'Customize'}
        </button>
      </div>

      {encouragement && !showCustomize && (
        <div style={{ fontSize: 11, color: pa, fontWeight: 500, fontStyle: 'italic', marginBottom: 8 }}>
          {encouragement}
        </div>
      )}

      {/* Customize mode */}
      {showCustomize && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: faint, border: `1px solid ${cardBd}` }}>
          <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>Tap to enable/disable items for your daily checklist:</div>
          {MOVEMENT_CATEGORIES.map(cat => {
            const catItems = allItems.filter(m => m.category === cat.id);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat.name}</div>
                {catItems.map(m => {
                  const on = enabledIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleEnabled(m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${on ? '#4caf50' : cardBd}`,
                        background: on ? '#4caf50' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: 'white', fontWeight: 700,
                      }}>
                        {on && '\u2713'}
                      </div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: fg }}>{m.n}</span>
                        <span style={{ fontSize: 10, color: sub, marginLeft: 6 }}>{m.w}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Add custom */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${cardBd}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 4 }}>ADD CUSTOM ITEM</div>
            <input
              type="text"
              value={newItem.n}
              onChange={e => setNewItem({ ...newItem, n: e.target.value })}
              placeholder="Activity name"
              style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 11, background: inputBg, color: fg, marginBottom: 4 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={newItem.w}
                onChange={e => setNewItem({ ...newItem, w: e.target.value })}
                placeholder="Why it matters (optional)"
                style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${cardBd}`, fontSize: 11, background: inputBg, color: fg }}
              />
              <button
                onClick={addCustomItem}
                style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: pa, color: '#fff', opacity: newItem.n.trim() ? 1 : 0.4 }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily checklist */}
      {visibleItems.map(m => {
        const activity = moves[m.id];
        const isDone = activity === true || (typeof activity === 'object' && activity.done);
        const actData = typeof activity === 'object' ? activity : {};

        return (
          <div key={m.id} style={{ padding: '8px 0', borderBottom: `1px solid ${faint}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                onClick={() => {
                  if (isDone) {
                    onUpdateActivity(m.id, false);
                  } else {
                    onUpdateActivity(m.id, { done: true, type: m.n, minutes: '', notes: '' });
                  }
                }}
                style={{
                  width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                  border: `2px solid ${isDone ? '#4caf50' : cardBd}`,
                  background: isDone ? '#4caf50' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: 'white', fontWeight: 700, flexShrink: 0,
                }}
              >
                {isDone && '\u2713'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: isDone ? sub : fg }}>{m.n}</div>
                <div style={{ fontSize: 11, color: sub, fontStyle: 'italic' }}>{m.w}</div>

                {m.id === 'stretch' && (
                  <button
                    onClick={() => setShowStretching(true)}
                    style={{ marginTop: 4, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, border: `1px solid ${pa}`, color: pa }}
                  >
                    Open Stretching Routine
                  </button>
                )}
              </div>
            </div>

            {isDone && (
              <div style={{ marginLeft: 32, marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={actData.type || m.n}
                  onChange={e => onUpdateActivity(m.id, { ...actData, done: true, type: e.target.value })}
                  placeholder="Activity type"
                  style={{ flex: 1, minWidth: 100, padding: '4px 8px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 11, background: inputBg, color: fg }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    value={actData.minutes || ''}
                    onChange={e => onUpdateActivity(m.id, { ...actData, done: true, minutes: e.target.value })}
                    placeholder="min"
                    style={{ width: 50, padding: '4px 6px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 11, textAlign: 'center', background: inputBg, color: fg }}
                  />
                  <span style={{ fontSize: 10, color: sub }}>min</span>
                </div>
                <input
                  type="text"
                  value={actData.notes || ''}
                  onChange={e => onUpdateActivity(m.id, { ...actData, done: true, notes: e.target.value })}
                  placeholder="Notes (optional)"
                  style={{ width: '100%', padding: '4px 8px', borderRadius: 6, marginTop: 4, border: `1px solid ${cardBd}`, fontSize: 11, background: inputBg, color: fg }}
                />
              </div>
            )}
          </div>
        );
      })}

      {showStretching && (
        <StretchingRoutine onClose={() => setShowStretching(false)} theme={theme} />
      )}
    </div>
  );
}
