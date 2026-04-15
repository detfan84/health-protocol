import { useSettings } from '../context/SettingsContext';

const TABS = [
  ['today', 'Today'],
  ['log', 'Log'],
  ['diet', 'Diet'],
  ['exercise', 'Exercise'],
  ['supply', 'Supply'],
  ['profile', 'Profile'],
  ['ref', 'Ref'],
];

export default function TabBar({ tab, setTab, theme }) {
  const { dark } = useSettings();
  const { fg, sub, cardBg } = theme;

  return (
    <div style={{ padding: '12px 16px 8px' }}>
      <div style={{
        display: 'flex', gap: 2, padding: 6,
        background: dark ? '#252525' : '#f0ece7', borderRadius: 12,
      }}>
        {TABS.map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 600,
              borderRadius: 10, textAlign: 'center',
              color: tab === k ? fg : sub,
              background: tab === k ? cardBg : 'transparent',
              boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
