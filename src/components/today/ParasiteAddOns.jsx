import SupplementItem from './SupplementItem';
import { PARASITE_ADDS } from '../../data/blocks';

export default function ParasiteAddOns({ isPara, editing, checks, hidden, onToggle, onToggleHide, theme }) {
  if (!isPara && !editing) return null;

  const items = editing ? PARASITE_ADDS : PARASITE_ADDS.filter(it => !hidden[it.id]);
  if (items.length === 0) return null;

  return (
    <div style={{
      background: theme.dark ? '#2a1f0f' : '#fffaf0',
      borderRadius: 14, margin: '8px 16px', padding: '12px 16px',
      border: `2px solid ${theme.dark ? '#665522' : '#ff9800'}`,
    }}>
      <div style={{
        fontWeight: 700, fontSize: 13,
        color: theme.dark ? '#ffb74d' : '#e65100', marginBottom: 4,
      }}>
        Parasite Phase Add-Ons
      </div>
      {items.map(it => (
        <SupplementItem
          key={it.id}
          item={it}
          checked={!!checks[it.id]}
          hidden={!!hidden[it.id]}
          editing={editing}
          onToggle={() => onToggle(it.id)}
          onToggleHide={() => onToggleHide(it.id)}
          color={theme.dark ? '#ffb74d' : '#e65100'}
          theme={theme}
        />
      ))}
    </div>
  );
}
