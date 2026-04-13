import { useState } from 'react';
import DetailCard from '../DetailCard';

export default function SupplementItem({ item, checked, hidden, editing, onToggle, onToggleHide, color, theme }) {
  const [showDetail, setShowDetail] = useState(false);
  const { fg, sub, faint } = theme;

  if (!editing && hidden) return null;

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 0', borderBottom: `1px solid ${faint}`,
        opacity: editing && hidden ? 0.4 : 1,
      }}>
        {editing ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleHide(); }}
            style={{
              width: 44, height: 44, borderRadius: 6,
              border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, margin: '-10px -10px -10px 0', padding: 0,
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: 6,
              border: `2px solid ${hidden ? '#e53935' : '#4caf50'}`,
              background: hidden ? '#fce4e4' : '#e8f5e9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: hidden ? '#e53935' : '#4caf50', fontWeight: 700,
            }}>
              {hidden ? '\u2715' : '\u2713'}
            </span>
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              width: 44, height: 44, borderRadius: 6,
              border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, margin: '-10px -10px -10px 0', padding: 0,
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: 6,
              border: `2px solid ${checked ? '#4caf50' : color}`,
              background: checked ? '#4caf50' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'white', fontWeight: 700,
            }}>
              {checked && '\u2713'}
            </span>
          </button>
        )}
        <div style={{ flex: 1, cursor: item.details ? 'pointer' : 'default' }} onClick={() => item.details && setShowDetail(true)}>
          <div style={{
            fontWeight: 600, fontSize: 13,
            color: checked && !editing ? sub : fg,
            textDecoration: checked && !editing ? 'line-through' : 'none',
          }}>
            {item.parasiteOnly && (
              <span style={{ fontSize: 9, fontWeight: 700, color: theme.dark ? '#ffb74d' : '#e65100', background: theme.dark ? '#2a1f0f' : '#fff3e0', padding: '1px 5px', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }}>
                PARA
              </span>
            )}
            {item.n}
            {item.shopUrl && (
              <a
                href={item.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ marginLeft: 6, fontSize: 11, textDecoration: 'none' }}
              >
                {'\uD83D\uDED2'}
              </a>
            )}
          </div>
          <div style={{ fontSize: 11, color: color, fontWeight: 500, marginTop: 2 }}>{item.d}</div>
          <div style={{ fontSize: 11, color: sub, fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>{item.w}</div>
        </div>
      </div>
      {showDetail && <DetailCard item={item} onClose={() => setShowDetail(false)} theme={theme} />}
    </>
  );
}
