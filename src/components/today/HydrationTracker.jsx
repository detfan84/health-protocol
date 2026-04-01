import { useSettings } from '../../context/SettingsContext';
import { displayVolume, volumeIncrement } from '../../lib/units';

export default function HydrationTracker({ water, onAdd, onSub, encouragement, theme }) {
  const { unitSystem, hydrationTarget } = useSettings();
  const { fg, sub, cardBg, cardBd, faint } = theme;

  const display = displayVolume(water, unitSystem);
  const targetDisplay = displayVolume(hydrationTarget, unitSystem);
  const pct = hydrationTarget > 0 ? Math.min(100, Math.round((water / hydrationTarget) * 100)) : 0;
  const inc = volumeIncrement(unitSystem);
  const hitTarget = water >= hydrationTarget;

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: fg }}>Hydration</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <button
          onClick={onSub}
          style={{
            width: 40, height: 40, borderRadius: '50%', fontSize: 18, fontWeight: 700,
            background: faint, color: sub,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\u2212'}
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: hitTarget ? '#1565c0' : fg }}>
            {display.value}
          </div>
          <div style={{ fontSize: 11, color: sub }}>
            {display.unit} (target: {targetDisplay.value}{targetDisplay.unit})
          </div>
        </div>
        <button
          onClick={onAdd}
          style={{
            width: 40, height: 40, borderRadius: '50%', fontSize: 18, fontWeight: 700,
            background: theme.dark ? '#1a2a3a' : '#e3f2fd', color: '#1565c0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>
      <div style={{ fontSize: 10, color: sub, textAlign: 'center', marginTop: 4 }}>
        +{inc} {display.unit} per tap
      </div>
      <div style={{ marginTop: 8, height: 6, background: faint, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: '#42a5f5',
          borderRadius: 3, transition: 'width 0.3s',
        }} />
      </div>
      {encouragement && (
        <div style={{ fontSize: 11, color: '#42a5f5', fontWeight: 500, fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>
          {encouragement}
        </div>
      )}
    </div>
  );
}
