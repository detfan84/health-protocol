import { useState } from 'react';
import SupplementItem from './SupplementItem';

export default function TimeBlock({ block, items, checks, hidden, editing, hour, onToggle, onToggleHide, theme }) {
  const { fg, sub, cardBg, cardBd, faint } = theme;
  const pc = theme.pc;
  const pa = theme.pa;

  const displayItems = editing
    ? items // show all phase-active items in edit mode
    : items.filter(it => !hidden[it.id]);

  if (displayItems.length === 0 && !editing) return null;

  const done = displayItems.filter(it => checks[it.id]).length;
  const [lo, hi] = block.hr;
  const status = done === displayItems.length && !editing
    ? 'done'
    : hour >= lo && hour < hi ? 'now' : hour < lo ? 'upcoming' : 'past';

  const defaultOpen = status === 'now';
  const [expanded, setExpanded] = useState(defaultOpen);
  const isExp = expanded || status === 'now';

  return (
    <div style={{
      background: cardBg, borderRadius: 14, margin: '8px 16px', padding: '0 16px',
      border: `${status === 'now' ? 2 : 1}px solid ${status === 'now' ? pa : cardBd}`,
    }}>
      <div
        style={{
          padding: '12px 0', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer',
        }}
        onClick={() => setExpanded(status !== 'now' ? !isExp : true)}
      >
        <div>
          <div style={{
            fontWeight: 700, fontSize: 13,
            color: status === 'now' ? pc : status === 'done' ? '#4caf50' : fg,
          }}>
            {status === 'now' ? '\u25CF ' : ''}{block.time}
          </div>
          <div style={{ fontSize: 11, color: sub, marginTop: 1 }}>{block.label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: sub }}>{done}/{displayItems.length}</span>
          <span style={{
            fontSize: 12, color: sub,
            transform: isExp ? 'rotate(180deg)' : '', transition: 'transform 0.2s',
          }}>
            {'\u25BE'}
          </span>
        </div>
      </div>
      {isExp && (
        <div style={{ paddingBottom: 8 }}>
          {displayItems.map(it => (
            <SupplementItem
              key={it.id}
              item={it}
              checked={!!checks[it.id]}
              hidden={!!hidden[it.id]}
              editing={editing}
              onToggle={() => onToggle(it.id)}
              onToggleHide={() => onToggleHide(it.id)}
              color={pc}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
}
