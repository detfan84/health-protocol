import SupplementItem from './SupplementItem';

const GROUPS = [
  {
    key: 'normal',
    title: 'Take As Normal',
    description: 'These don\u2019t require food \u2014 safe on an empty stomach.',
    color: '#4caf50',
    bgLight: '#e8f5e9',
    bgDark: '#1a2e1a',
  },
  {
    key: 'snack',
    title: 'Take With Minimal Food',
    description: 'These prefer food but tolerate a small snack \u2014 a handful of nuts, half an avocado, or a spoonful of coconut oil is enough.',
    color: '#ff9800',
    bgLight: '#fff3e0',
    bgDark: '#2a1f0f',
  },
  {
    key: 'skip',
    title: 'Skip Today',
    description: 'These strictly require a meal. Taking them on an empty stomach can cause nausea, GI distress, or reduced effectiveness. Skip if you\u2019re not eating.',
    color: '#e53935',
    bgLight: '#fce4e4',
    bgDark: '#2a1a1a',
  },
];

export default function FastingMode({ allItems, checks, hidden, onToggle, theme }) {
  const { fg, sub, cardBg, cardBd, faint } = theme;

  // Group items by their food requirement
  const grouped = { normal: [], snack: [], skip: [] };
  for (const item of allItems) {
    if (hidden[item.id]) continue;
    if (item.requiresFood === 'strict') {
      grouped.skip.push(item);
    } else if (item.requiresFood === 'preferred') {
      grouped.snack.push(item);
    } else {
      grouped.normal.push(item);
    }
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      {GROUPS.map(g => {
        const items = grouped[g.key];
        if (items.length === 0) return null;

        return (
          <div
            key={g.key}
            style={{
              background: theme.dark ? g.bgDark : g.bgLight,
              borderRadius: 14, margin: '8px 16px', padding: '12px 16px',
              border: `2px solid ${g.color}40`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: g.color, marginBottom: 2 }}>
              {g.title} ({items.length})
            </div>
            <div style={{ fontSize: 11, color: sub, marginBottom: 8, lineHeight: 1.4 }}>
              {g.description}
            </div>
            {items.map(item => (
              <SupplementItem
                key={item.id}
                item={item}
                checked={!!checks[item.id]}
                hidden={false}
                editing={false}
                onToggle={() => onToggle(item.id)}
                onToggleHide={() => {}}
                color={g.color}
                theme={theme}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
