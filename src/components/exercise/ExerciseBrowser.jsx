import { useState } from 'react';
import { EXERCISES } from '../../data/exercises';
import { useSettings } from '../../context/SettingsContext';
import DetailCard from '../DetailCard';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'push', name: 'Push' },
  { id: 'pull', name: 'Pull' },
  { id: 'legs', name: 'Legs' },
  { id: 'core', name: 'Core' },
  { id: 'mobility', name: 'Mobility' },
  { id: 'athletic', name: 'Athletic' },
  { id: 'martial_arts', name: 'Martial Arts' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'mace', name: 'Mace' },
  { id: 'jump_rope', name: 'Jump Rope' },
  { id: 'recovery', name: 'Recovery' },
];

export default function ExerciseBrowser({ onAddToRoutine, theme }) {
  const { equipment } = useSettings();
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;

  const filtered = EXERCISES.filter(ex => {
    if (!equipment.includes(ex.equipment) && ex.equipment !== 'bodyweight') return false;
    if (cat !== 'all' && ex.category !== cat) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()) &&
        !ex.muscles.some(m => m.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search exercises or muscles..."
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg,
          marginBottom: 8,
        }}
      />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${cat === c.id ? pa : cardBd}`,
              background: cat === c.id ? (theme.dark ? '#2a2a3a' : '#e8eaf6') : 'transparent',
              color: cat === c.id ? pa : sub,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>{filtered.length} exercises</div>
      {filtered.map(ex => (
        <div
          key={ex.id}
          style={{
            padding: '10px 0', borderBottom: `1px solid ${faint}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setDetail(ex)}>
            <div style={{ fontWeight: 600, fontSize: 13, color: fg }}>{ex.name}</div>
            <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
              {ex.muscles.join(', ')} · {ex.equipment}
            </div>
          </div>
          {onAddToRoutine && (
            <button
              onClick={() => onAddToRoutine(ex)}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${pa}`, color: pa,
              }}
            >
              + Add
            </button>
          )}
        </div>
      ))}
      {detail && <DetailCard item={detail} onClose={() => setDetail(null)} theme={theme} />}
    </div>
  );
}
