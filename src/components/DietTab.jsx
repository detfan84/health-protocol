import { useEffect, useState } from 'react';
import { DIET_PHASES, shoppingListToText, groupToText, itemName, itemSubs } from '../data/diet';
import { PHASE_META } from '../data/phases';
import { getSetting, setSetting } from '../lib/db';

export default function DietTab({ currentPhaseId, theme }) {
  const [phaseIdx, setPhaseIdx] = useState(() => Math.max(0, (currentPhaseId || 1) - 1));
  const [view, setView] = useState('guide');
  const [expCat, setExpCat] = useState(null);
  const [expMod, setExpMod] = useState(false);
  const [expAvoid, setExpAvoid] = useState(false);
  const [expMeals, setExpMeals] = useState(false);
  const [shoppingChecked, setShoppingCheckedState] = useState({});
  const [customItems, setCustomItemsState] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const p = DIET_PHASES[phaseIdx];
  const pm = PHASE_META[phaseIdx];
  const pc = theme.dark ? pm.dk : pm.color;
  const pa = theme.dark ? pm.dka : pm.accent;
  const { fg, sub, cardBg, cardBd, faint, dark } = theme;

  const reset = () => {
    setExpCat(null);
    setExpMod(false);
    setExpAvoid(false);
    setExpMeals(false);
  };

  // Load persisted shopping checks and custom items once
  useEffect(() => {
    getSetting('shoppingChecked').then((v) => setShoppingCheckedState(v || {}));
    getSetting('customShoppingItems').then((v) => setCustomItemsState(v || []));
  }, []);

  const persistCustomItems = (items) => {
    setCustomItemsState(items);
    setSetting('customShoppingItems', items);
  };

  const addCustomItem = () => {
    const t = newItemText.trim();
    if (!t) return;
    if (!customItems.includes(t)) {
      persistCustomItems([...customItems, t]);
    }
    setNewItemText('');
  };

  const removeCustomItem = (name) => {
    persistCustomItems(customItems.filter((x) => x !== name));
    // Also clear its check state
    const key = `custom:${name}`;
    if (shoppingChecked[key]) {
      const next = { ...shoppingChecked };
      delete next[key];
      setShoppingCheckedState(next);
      setSetting('shoppingChecked', next);
    }
  };

  const toggleCheck = (key) => {
    const next = { ...shoppingChecked, [key]: !shoppingChecked[key] };
    if (!next[key]) delete next[key];
    setShoppingCheckedState(next);
    setSetting('shoppingChecked', next);
  };

  const clearChecksForPhase = () => {
    const next = { ...shoppingChecked };
    p.shopping.forEach((g) =>
      g.items.forEach((item) => { delete next[`${p.id}:${itemName(item)}`]; })
    );
    setShoppingCheckedState(next);
    setSetting('shoppingChecked', next);
  };

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1400);
    } catch (e) {
      // Fallback: use a temp textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopiedId(id); setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1400); } catch {}
      document.body.removeChild(ta);
    }
  };

  // Bubble backgrounds honoring dark mode
  const goodBg = dark ? '#1a2a1a' : '#f1f8e9';
  const modBg = dark ? '#2a2418' : '#fff8e1';
  const avoidBg = dark ? '#2a1a1a' : '#fef3f3';
  const phaseBg = dark ? '#1a1f2a' : '#f5f2ed';

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* View toggle: Guide / Shopping */}
      <div style={{ padding: '8px 16px 6px' }}>
        <div style={{ display: 'flex', gap: 2, padding: 5, background: faint, borderRadius: 12 }}>
          {[['guide', 'Phase Guide'], ['shop', 'Shopping List']].map(([k, v]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              style={{
                flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 600, borderRadius: 10,
                textAlign: 'center',
                color: view === k ? fg : sub,
                background: view === k ? cardBg : 'transparent',
                boxShadow: view === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Phase selector chips */}
      <div style={{ padding: '4px 16px', display: 'flex', gap: 5, overflowX: 'auto' }}>
        {PHASE_META.map((m, i) => {
          const isActive = phaseIdx === i;
          const isCurrent = m.id === currentPhaseId;
          const bg = isActive ? (dark ? m.dk : m.color) : faint;
          const col = isActive ? '#fff' : sub;
          return (
            <button
              key={m.id}
              onClick={() => { setPhaseIdx(i); reset(); }}
              style={{
                padding: '7px 10px', fontSize: 11, fontWeight: 600, borderRadius: 8,
                whiteSpace: 'nowrap', background: bg, color: col,
                border: isCurrent && !isActive ? `1.5px solid ${dark ? m.dka : m.accent}` : '1.5px solid transparent',
              }}
            >
              {m.id}. {m.name.split(' ')[0]}
              {isCurrent && <span style={{ marginLeft: 4, fontSize: 9 }}>{'\u2605'}</span>}
            </button>
          );
        })}
      </div>

      {view === 'guide' && (
        <div style={{ padding: '12px 16px 8px' }}>
          {/* Phase strategy */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: pc }}>{pm.name}</h2>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '2px 8px', borderRadius: 4, background: pa + '33', color: pc,
              }}>{p.duration}</span>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: phaseBg, border: `1px solid ${cardBd}`,
              fontSize: 12, color: fg, lineHeight: 1.6, fontStyle: 'italic',
            }}>
              <strong style={{ fontStyle: 'normal', color: pc }}>Strategy:</strong> {p.strategy}
            </div>
          </div>

          {/* GOOD FOODS */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: dark ? '#9ccc65' : '#2e7d32',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                background: goodBg, alignItems: 'center', justifyContent: 'center', fontSize: 12,
              }}>{'\u2713'}</span>
              Eat Freely
            </div>
            {p.good.map((cat, ci) => {
              const isExp = expCat === ci;
              return (
                <div key={ci} style={{
                  borderRadius: 12, border: `1px solid ${dark ? '#3a4a2f' : '#c8e6c9'}`,
                  marginBottom: 6, overflow: 'hidden', background: cardBg,
                }}>
                  <div
                    onClick={() => setExpCat(isExp ? null : ci)}
                    style={{
                      padding: '11px 14px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', cursor: 'pointer',
                      background: isExp ? goodBg : cardBg,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13, color: isExp ? (dark ? '#9ccc65' : '#2e7d32') : fg }}>{cat.cat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: sub }}>{cat.items.length}</span>
                      <span style={{ fontSize: 12, color: sub, transform: isExp ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>{'\u25be'}</span>
                    </div>
                  </div>
                  {isExp && (
                    <div style={{ padding: '0 14px 8px' }}>
                      {cat.items.map((item, i) => (
                        <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${faint}` }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: dark ? '#9ccc65' : '#2e7d32' }}>{item.n}</div>
                          <div style={{ fontSize: 11, color: sub, marginTop: 3, lineHeight: 1.5, fontStyle: 'italic' }}>{item.w}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* MODERATE */}
          {p.moderate && p.moderate.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                borderRadius: 12, border: `1px solid ${dark ? '#4a3a1a' : '#ffe0b2'}`,
                overflow: 'hidden', background: cardBg,
              }}>
                <div
                  onClick={() => setExpMod(!expMod)}
                  style={{
                    padding: '11px 14px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer',
                    background: expMod ? modBg : cardBg,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                      background: modBg, alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}>~</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: expMod ? (dark ? '#ffb74d' : '#e65100') : fg }}>OK in Moderation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: sub }}>{p.moderate.length}</span>
                    <span style={{ fontSize: 12, color: sub, transform: expMod ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>{'\u25be'}</span>
                  </div>
                </div>
                {expMod && (
                  <div style={{ padding: '0 14px 8px' }}>
                    {p.moderate.map((item, i) => (
                      <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${faint}` }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: dark ? '#ffb74d' : '#e65100' }}>{item.n}</div>
                        <div style={{ fontSize: 11, color: sub, marginTop: 3, lineHeight: 1.5, fontStyle: 'italic' }}>{item.w}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AVOID */}
          {p.avoid && p.avoid.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                borderRadius: 12, border: `1px solid ${dark ? '#4a2a2a' : '#ffcdd2'}`,
                overflow: 'hidden', background: cardBg,
              }}>
                <div
                  onClick={() => setExpAvoid(!expAvoid)}
                  style={{
                    padding: '11px 14px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer',
                    background: expAvoid ? avoidBg : cardBg,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                      background: avoidBg, alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}>{'\u2715'}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: expAvoid ? (dark ? '#ef5350' : '#c62828') : fg }}>Avoid</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: sub }}>{p.avoid.length}</span>
                    <span style={{ fontSize: 12, color: sub, transform: expAvoid ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>{'\u25be'}</span>
                  </div>
                </div>
                {expAvoid && (
                  <div style={{ padding: '0 14px 8px' }}>
                    {p.avoid.map((item, i) => (
                      <div key={i} style={{ padding: '8px 0', borderTop: `1px solid ${faint}` }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: dark ? '#ef5350' : '#c62828' }}>{item.n}</div>
                        <div style={{ fontSize: 11, color: sub, marginTop: 3, lineHeight: 1.5, fontStyle: 'italic' }}>{item.w}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEAL IDEAS */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              borderRadius: 12, border: `1px solid ${pa}66`,
              overflow: 'hidden', background: cardBg,
            }}>
              <div
                onClick={() => setExpMeals(!expMeals)}
                style={{
                  padding: '11px 14px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer',
                  background: expMeals ? pc + '14' : cardBg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                    background: pa + '22', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  }}>{'\uD83C\uDF73'}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: expMeals ? pc : fg }}>Meal Combos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: sub }}>{p.meals.length}</span>
                  <span style={{ fontSize: 12, color: sub, transform: expMeals ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>{'\u25be'}</span>
                </div>
              </div>
              {expMeals && (
                <div style={{ padding: '0 14px 8px' }}>
                  {p.meals.map((meal, i) => (
                    <div key={i} style={{ padding: '10px 0', borderTop: `1px solid ${faint}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: pc }}>{meal.name}</div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '2px 8px', borderRadius: 4, background: pa + '22', color: pc,
                        }}>{meal.tag}</span>
                      </div>
                      <div style={{ fontSize: 12, color: fg, lineHeight: 1.5 }}>{meal.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meal sequencing tip */}
          <div style={{
            padding: '12px 14px', borderRadius: 10, background: phaseBg,
            border: `1px solid ${cardBd}`, fontSize: 11, color: sub, lineHeight: 1.6,
          }}>
            <strong style={{ color: fg }}>Meal sequencing tip:</strong> When breaking your fast at noon, eat in this order {'\u2014'} protein & fat first {'\u2192'} vegetables {'\u2192'} carbs (rice, sweet potato) {'\u2192'} fruit last. This reduces blood sugar spikes and works with your berberine's glucose-lowering effect.
          </div>
        </div>
      )}

      {view === 'shop' && (
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: pc }}>
              Phase {p.id} Shopping List
            </div>
            <button
              onClick={() => {
                const shopping = customItems.length > 0
                  ? [...p.shopping, { cat: 'My Items', items: customItems }]
                  : p.shopping;
                copy(shoppingListToText(shopping, `Phase ${p.id} Shopping List (${pm.name})`), 'ALL');
              }}
              style={{
                fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                background: pc, color: '#fff',
              }}
            >
              {copiedId === 'ALL' ? '\u2713 Copied!' : 'Copy full list'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: sub, marginBottom: 14, lineHeight: 1.5 }}>
            Tap an item to cross it off. Tap <span style={{ color: pc, fontWeight: 600 }}>Copy</span> to grab the line. Under items, <span style={{ color: pc, fontWeight: 600 }}>Rotate:</span> chips are interchangeable options {'\u2014'} tap one to copy it instead.
          </p>

          {p.shopping.map((group, gi) => {
            return (
              <div key={gi} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${cardBd}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: pc }}>{group.cat}</div>
                  <button
                    onClick={() => copy(groupToText(group), `G${gi}`)}
                    style={{ fontSize: 10, fontWeight: 600, color: pc, padding: '2px 8px' }}
                  >
                    {copiedId === `G${gi}` ? '\u2713 Copied!' : 'Copy group'}
                  </button>
                </div>
                {group.items.map((item, i) => {
                  const name = itemName(item);
                  const subs = itemSubs(item);
                  const key = `${p.id}:${name}`;
                  const checked = !!shoppingChecked[key];
                  const copyId = `${gi}-${i}`;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px', marginBottom: 4, borderRadius: 8,
                        background: checked ? faint : cardBg,
                        border: `1px solid ${cardBd}`,
                        fontSize: 12, fontWeight: 500, color: checked ? sub : fg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          onClick={() => toggleCheck(key)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
                        >
                          <span style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: `2px solid ${checked ? pc : cardBd}`,
                            background: checked ? pc : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#fff', fontWeight: 700,
                          }}>
                            {checked && '\u2713'}
                          </span>
                          <span style={{
                            textDecoration: checked ? 'line-through' : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{name}</span>
                        </div>
                        <button
                          onClick={() => copy(name, copyId)}
                          aria-label="Copy item"
                          style={{
                            fontSize: 10, fontWeight: 600, color: sub, padding: '4px 8px',
                            borderRadius: 6, border: `1px solid ${cardBd}`, flexShrink: 0,
                          }}
                        >
                          {copiedId === copyId ? '\u2713' : 'Copy'}
                        </button>
                      </div>
                      {subs.length > 0 && (
                        <div style={{
                          marginTop: 6, paddingLeft: 26, display: 'flex', flexWrap: 'wrap',
                          alignItems: 'center', gap: 4,
                        }}>
                          <span style={{ fontSize: 10, color: sub, fontWeight: 600 }}>Rotate:</span>
                          {subs.map((s, si) => {
                            const chipId = `${copyId}-s${si}`;
                            return (
                              <button
                                key={si}
                                onClick={() => copy(s, chipId)}
                                title={`Copy "${s}"`}
                                style={{
                                  fontSize: 10, fontWeight: 500, color: pc,
                                  padding: '2px 8px', borderRadius: 10,
                                  background: pa + '22',
                                  border: `1px solid ${pa}44`,
                                }}
                              >
                                {copiedId === chipId ? '\u2713 ' : ''}{s}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* My Items (custom, phase-independent) */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${cardBd}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: pc }}>
                My Items
                {customItems.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: sub, marginLeft: 6 }}>
                    ({customItems.length})
                  </span>
                )}
              </div>
              {customItems.length > 0 && (
                <button
                  onClick={() => copy(
                    groupToText({ cat: 'My Items', items: customItems }),
                    'G-custom'
                  )}
                  style={{ fontSize: 10, fontWeight: 600, color: pc, padding: '2px 8px' }}
                >
                  {copiedId === 'G-custom' ? '\u2713 Copied!' : 'Copy group'}
                </button>
              )}
            </div>

            {customItems.length === 0 && !adding && (
              <div style={{ fontSize: 11, color: sub, fontStyle: 'italic', marginBottom: 8 }}>
                Add non-diet items here {'\u2014'} coffee, paper towels, toilet paper, toothpaste, whatever else you need this trip. Shared across all phases.
              </div>
            )}

            {customItems.map((name, i) => {
              const key = `custom:${name}`;
              const checked = !!shoppingChecked[key];
              const copyId = `custom-${i}`;
              return (
                <div
                  key={i}
                  style={{
                    padding: '8px 10px', marginBottom: 4, borderRadius: 8,
                    background: checked ? faint : cardBg,
                    border: `1px solid ${cardBd}`,
                    fontSize: 12, fontWeight: 500, color: checked ? sub : fg,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    onClick={() => toggleCheck(key)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${checked ? pc : cardBd}`,
                      background: checked ? pc : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff', fontWeight: 700,
                    }}>
                      {checked && '\u2713'}
                    </span>
                    <span style={{
                      textDecoration: checked ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{name}</span>
                  </div>
                  <button
                    onClick={() => copy(name, copyId)}
                    aria-label="Copy item"
                    style={{
                      fontSize: 10, fontWeight: 600, color: sub, padding: '4px 8px',
                      borderRadius: 6, border: `1px solid ${cardBd}`, flexShrink: 0,
                    }}
                  >
                    {copiedId === copyId ? '\u2713' : 'Copy'}
                  </button>
                  <button
                    onClick={() => removeCustomItem(name)}
                    aria-label="Remove item"
                    title="Remove"
                    style={{
                      fontSize: 14, fontWeight: 700, color: sub, padding: '2px 8px',
                      borderRadius: 6, flexShrink: 0, lineHeight: 1,
                    }}
                  >
                    {'\u00d7'}
                  </button>
                </div>
              );
            })}

            {adding ? (
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center',
                padding: '8px 10px', borderRadius: 8,
                border: `1.5px solid ${pa}`,
                background: cardBg, marginTop: 4,
              }}>
                <input
                  type="text"
                  autoFocus
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { addCustomItem(); }
                    else if (e.key === 'Escape') { setAdding(false); setNewItemText(''); }
                  }}
                  placeholder="e.g. Coffee beans"
                  style={{
                    flex: 1, padding: '4px 6px', fontSize: 12,
                    background: 'transparent', color: fg,
                    border: 'none', outline: 'none',
                  }}
                />
                <button
                  onClick={addCustomItem}
                  disabled={!newItemText.trim()}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px',
                    borderRadius: 6, background: pc, color: '#fff',
                    opacity: newItemText.trim() ? 1 : 0.4,
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setAdding(false); setNewItemText(''); }}
                  style={{
                    fontSize: 11, fontWeight: 600, color: sub,
                    padding: '4px 8px', borderRadius: 6,
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                style={{
                  width: '100%', marginTop: 4,
                  padding: '8px 10px', borderRadius: 8,
                  border: `1.5px dashed ${cardBd}`,
                  background: 'transparent', color: pc,
                  fontSize: 12, fontWeight: 600,
                }}
              >
                + Add item
              </button>
            )}
          </div>

          {Object.keys(shoppingChecked).some((k) => k.startsWith(`${p.id}:`)) && (
            <button
              onClick={clearChecksForPhase}
              style={{ fontSize: 11, color: '#e53935', textDecoration: 'underline', padding: '8px 0' }}
            >
              Clear checks for Phase {p.id}
            </button>
          )}

          <div style={{
            padding: '12px 14px', borderRadius: 10, background: phaseBg,
            border: `1px solid ${cardBd}`, fontSize: 11, color: sub, lineHeight: 1.6, marginTop: 8,
          }}>
            <strong style={{ color: fg }}>Tip:</strong> Use the copy buttons to paste into your favorite grocery app. Checks persist between visits so you can build up a list over multiple shopping trips.
          </div>
        </div>
      )}
    </div>
  );
}
