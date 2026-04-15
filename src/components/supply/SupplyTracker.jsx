import { useState } from 'react';
import {
  SUPPLY_ITEMS, SUPPLY_OPTIONS, SUPPLY_COLORS, SUPPLY_TIER_LABELS,
  defaultSupplyEntry, sortBySupplyLevel, getSupplyTier,
} from '../../data/supply';

export default function SupplyTracker({ supply, onUpdate, phaseId, theme }) {
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;
  const [expandedId, setExpandedId] = useState(null);
  const [showOffRoster, setShowOffRoster] = useState(false);

  const getEntry = (id) => supply[id] || defaultSupplyEntry();
  const updateEntry = (id, changes) => {
    const current = getEntry(id);
    onUpdate({ ...supply, [id]: { ...current, ...changes } });
  };

  const [showOtherPhases, setShowOtherPhases] = useState(false);

  // Filter: active items for current phase, not manually off-roster
  const activeItems = SUPPLY_ITEMS.filter(item => {
    const entry = getEntry(item.id);
    if (entry.offRoster) return false;
    if (phaseId && item.phases.length > 0 && !item.phases.includes(phaseId)) return false;
    return true;
  });

  // Items from other phases (auto-hidden by phase, not manually off-roster)
  const otherPhaseItems = SUPPLY_ITEMS.filter(item => {
    const entry = getEntry(item.id);
    if (entry.offRoster) return false;
    return phaseId && item.phases.length > 0 && !item.phases.includes(phaseId);
  });

  const offRosterItems = SUPPLY_ITEMS.filter(item => getEntry(item.id).offRoster);
  const sorted = sortBySupplyLevel(activeItems, supply);

  // Group by tier
  const tiers = { critical: [], low: [], good: [] };
  for (const item of sorted) {
    const entry = getEntry(item.id);
    if (entry.subscription && (entry.status === 'Full' || entry.status === 'Half')) {
      tiers.good.push(item);
    } else {
      tiers[getSupplyTier(entry.status)].push(item);
    }
  }

  const renderItem = (item) => {
    const entry = getEntry(item.id);
    const expanded = expandedId === item.id;
    const statusColor = SUPPLY_COLORS[entry.status] || '#999';

    return (
      <div key={item.id} style={{ borderBottom: `1px solid ${faint}` }}>
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', cursor: 'pointer',
          }}
          onClick={() => setExpandedId(expanded ? null : item.id)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: fg, display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.name}
              {entry.subscription && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#42a5f530', color: '#42a5f5', fontWeight: 700 }}>
                  SUB
                </span>
              )}
              {item.parasiteOnly && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#ff980030', color: '#ff9800', fontWeight: 700 }}>
                  PARASITE
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: sub, marginTop: 1 }}>
              {item.phases.length > 0
                ? `Phases: ${item.phases.join(', ')}`
                : (item.parasiteOnly ? 'Parasite phase only' : 'Unscheduled · all phases')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={entry.status}
              onClick={e => e.stopPropagation()}
              onChange={e => updateEntry(item.id, { status: e.target.value })}
              style={{
                fontSize: 11, padding: '4px 6px', borderRadius: 6,
                border: `2px solid ${statusColor}`,
                color: statusColor, fontWeight: 700, background: cardBg,
              }}
            >
              {SUPPLY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <span style={{ fontSize: 12, color: sub, transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
              ▼
            </span>
          </div>
        </div>

        {expanded && (
          <div style={{
            padding: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Purchase Source */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: sub, marginBottom: 3 }}>Where I buy this</div>
              <input
                type="text"
                value={entry.purchaseSource || ''}
                placeholder="e.g. Amazon, iHerb, practitioner"
                onChange={e => updateEntry(item.id, { purchaseSource: e.target.value })}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: `1px solid ${cardBd}`, fontSize: 12, background: inputBg, color: fg,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Reorder URL */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: sub, marginBottom: 3 }}>Reorder link</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="url"
                  value={entry.purchaseUrl || ''}
                  placeholder="https://..."
                  onChange={e => updateEntry(item.id, { purchaseUrl: e.target.value })}
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8,
                    border: `1px solid ${cardBd}`, fontSize: 12, background: inputBg, color: fg,
                  }}
                />
                {entry.purchaseUrl && (
                  <a
                    href={entry.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${pa}`, color: pa, textDecoration: 'none',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    Open ↗
                  </a>
                )}
              </div>
            </div>

            {/* Toggles row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateEntry(item.id, { subscription: !entry.subscription })}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: `2px solid ${entry.subscription ? '#42a5f5' : cardBd}`,
                  background: entry.subscription ? (theme.dark ? '#1a2a3a' : '#e3f2fd') : 'transparent',
                  color: entry.subscription ? '#42a5f5' : sub,
                }}
              >
                {entry.subscription ? 'On Subscription' : 'Not Subscribed'}
              </button>
              <button
                onClick={() => updateEntry(item.id, { offRoster: true })}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: `2px solid #e53935`,
                  color: '#e53935', background: 'transparent',
                }}
              >
                Remove from Roster
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTier = (key) => {
    const items = tiers[key];
    if (items.length === 0) return null;
    const tier = SUPPLY_TIER_LABELS[key];

    return (
      <div key={key} style={{
        background: cardBg, borderRadius: 14, padding: '12px 16px',
        border: `1px solid ${cardBd}`, marginBottom: 12,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: tier.color,
          paddingBottom: 6, borderBottom: `2px solid ${tier.color}30`,
          marginBottom: 4, display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{tier.label}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: sub }}>{items.length} items</span>
        </div>
        {items.map(renderItem)}
      </div>
    );
  };

  return (
    <div style={{ padding: '8px 16px 24px' }}>
      <div style={{ fontSize: 12, color: sub, marginBottom: 12, lineHeight: 1.4 }}>
        Auto-sorted by urgency. Tap any item to add purchase info, subscription status, or remove from roster.
      </div>

      {renderTier('critical')}
      {renderTier('low')}
      {renderTier('good')}

      {activeItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: sub, fontSize: 13 }}>
          All items are off roster. Tap below to manage.
        </div>
      )}

      {/* Other Phases Section */}
      {otherPhaseItems.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <button
            onClick={() => setShowOtherPhases(!showOtherPhases)}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: `1px solid ${cardBd}`, background: cardBg, color: sub,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>Other Phases ({otherPhaseItems.length})</span>
            <span style={{ transform: showOtherPhases ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
          </button>

          {showOtherPhases && (
            <div style={{
              background: cardBg, borderRadius: '0 0 14px 14px', padding: '4px 16px 8px',
              border: `1px solid ${cardBd}`, borderTop: 'none',
            }}>
              <div style={{ fontSize: 11, color: sub, padding: '6px 0 8px', lineHeight: 1.4 }}>
                These items are used in other phases. They'll automatically appear when you reach those phases.
              </div>
              {otherPhaseItems.map(item => {
                const entry = getEntry(item.id);
                const statusColor = SUPPLY_COLORS[entry.status] || '#999';
                return (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: `1px solid ${faint}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: sub }}>{item.name}</div>
                      <div style={{ fontSize: 10, color: faint }}>Phases: {item.phases.join(', ')}</div>
                    </div>
                    <select
                      value={entry.status}
                      onChange={e => updateEntry(item.id, { status: e.target.value })}
                      style={{
                        fontSize: 11, padding: '3px 6px', borderRadius: 4,
                        border: `1px solid ${statusColor}`,
                        color: statusColor, fontWeight: 600, background: cardBg,
                      }}
                    >
                      {SUPPLY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Off-Roster Section */}
      {offRosterItems.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowOffRoster(!showOffRoster)}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: `1px solid ${cardBd}`, background: cardBg, color: sub,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>Off Roster ({offRosterItems.length})</span>
            <span style={{ transform: showOffRoster ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
          </button>

          {showOffRoster && (
            <div style={{
              background: cardBg, borderRadius: '0 0 14px 14px', padding: '4px 16px 8px',
              border: `1px solid ${cardBd}`, borderTop: 'none',
            }}>
              <div style={{ fontSize: 11, color: sub, padding: '6px 0 8px', lineHeight: 1.4 }}>
                These items are not in your active protocol. They won't appear in your daily checklist or count toward streaks.
              </div>
              {offRosterItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: `1px solid ${faint}`,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: sub }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: faint }}>Phases: {item.phases.join(', ')}</div>
                  </div>
                  <button
                    onClick={() => updateEntry(item.id, { offRoster: false })}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${pa}`, color: pa, background: 'transparent',
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
