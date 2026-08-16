import { useState, useEffect, useRef } from 'react';
import { SECTIONS, METRICS } from '../../data/bodywork';
import { getBodyWorkLog, setBodyWorkLog, getSetting, setSetting } from '../../lib/db';
import { requestPermission, getPermissionStatus } from '../../lib/notifications';
import {
  DEFAULT_PREFS, scheduleBodyWorkReminders, morningBody, eveningBody,
} from '../../lib/bodyworkReminders';
import {
  blankLog, logSession, undoLast, addMeasure, saveCheckin,
  mergeLog, summaryText, buildFeed, logStats, today,
} from '../../lib/bodyworkUtils';
import BodyWorkCard from './BodyWorkCard';
import '../../styles/bodywork.css';

export default function BodyWork({ theme }) {
  const { fg, sub, cardBg, cardBd, faint, pa, inputBg } = theme;

  const [log, setLog] = useState(null);
  const [section, setSection] = useState(SECTIONS[0].id);
  const [panel, setPanel] = useState('work'); // work | baseline | log
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [perm, setPerm] = useState('default');
  const fileRef = useRef(null);

  // The scheduler reads the log at fire time, not at schedule time, so it
  // needs a live reference rather than a captured value.
  const logRef = useRef(null);
  logRef.current = log;

  useEffect(() => {
    getBodyWorkLog().then(stored => setLog(stored || blankLog()));
    getSetting('bodyworkReminders').then(p => setPrefs({ ...DEFAULT_PREFS, ...(p || {}) }));
    setPerm(getPermissionStatus());
  }, []);

  // One writer. Every mutation goes through here so the stored object and
  // the exported object can never drift apart.
  const persist = (next) => {
    setLog(next);
    setBodyWorkLog(next);
  };

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const savePrefs = async (next) => {
    setPrefs(next);
    await setSetting('bodyworkReminders', next);
    scheduleBodyWorkReminders(() => logRef.current, next);
  };

  const toggleReminders = async () => {
    if (!prefs.enabled) {
      const result = await requestPermission();
      setPerm(result);
      if (result !== 'granted') {
        flash(
          result === 'unsupported'
            ? 'This browser does not support notifications.'
            : 'Notifications are blocked for this site — allow them in browser settings first.'
        );
        return;
      }
    }
    savePrefs({ ...prefs, enabled: !prefs.enabled });
  };

  if (!log) {
    return <div style={{ padding: 24, color: sub, fontSize: 13 }}>Loading…</div>;
  }

  const handleLog = (id) => persist(logSession(log, id));
  const handleUndo = (id) => persist(undoLast(log, id));
  const handleMeasure = (key, side, v) => persist(addMeasure(log, key, side, v));

  const handleCheckin = () => {
    if (energy === null && !note.trim()) {
      flash('Pick a number or write a line first.');
      return;
    }
    persist(saveCheckin(log, energy, note.trim()));
    setEnergy(null);
    setNote('');
    flash('Check-in saved.');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bodywork-log-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        persist(mergeLog(log, JSON.parse(r.result)));
        flash('Merged. Nothing was overwritten — same-day duplicates were skipped.');
      } catch (e) {
        flash(`That file could not be read as a log: ${e.message}`);
      }
    };
    r.readAsText(file);
  };

  const handleSummary = async () => {
    const t = summaryText(log);
    try {
      await navigator.clipboard.writeText(t);
      flash('Summary copied.');
    } catch {
      window.prompt('Copy this:', t);
    }
  };

  const stats = logStats(log);
  const feed = buildFeed(log);
  const activeSection = SECTIONS.find(s => s.id === section) || SECTIONS[0];

  const panelBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setPanel(key)}
      style={{
        flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: 600, borderRadius: 8,
        color: panel === key ? fg : sub,
        background: panel === key ? cardBg : 'transparent',
        boxShadow: panel === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, padding: 5, borderRadius: 10, background: faint, marginBottom: 10 }}>
        {panelBtn('work', 'Work')}
        {panelBtn('baseline', 'Baseline')}
        {panelBtn('log', 'Log')}
      </div>

      {toast && (
        <div style={{
          padding: '8px 12px', marginBottom: 10, borderRadius: 8,
          background: theme.dark ? '#16241a' : '#f1f8f2',
          border: `1px solid ${theme.dark ? '#2a4a32' : '#d3e8d8'}`,
          fontSize: 11.5, lineHeight: 1.5, color: theme.dark ? '#8fd39d' : '#2f6b3d',
        }}>
          {toast}
        </div>
      )}

      {/* ---------------- WORK ---------------- */}
      {panel === 'work' && (
        <>
          <div style={{
            display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8,
            marginBottom: 4, scrollbarWidth: 'none',
          }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                aria-current={section === s.id}
                style={{
                  flex: '0 0 auto', padding: '6px 12px', fontSize: 11, fontWeight: 600,
                  borderRadius: 20, whiteSpace: 'nowrap',
                  color: section === s.id ? '#fff' : sub,
                  background: section === s.id ? pa : 'transparent',
                  border: `1px solid ${section === s.id ? pa : cardBd}`,
                }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {activeSection.note && (
            <p style={{ fontSize: 12, lineHeight: 1.55, color: sub, margin: '2px 2px 10px', fontStyle: 'italic' }}>
              {activeSection.note}
            </p>
          )}

          {activeSection.items.map(card => (
            <BodyWorkCard
              key={card.id}
              card={card}
              log={log}
              onLog={handleLog}
              onUndo={handleUndo}
              onMeasure={handleMeasure}
              theme={theme}
            />
          ))}
        </>
      )}

      {/* ---------------- BASELINE ---------------- */}
      {/* Built from the metric registry so the two can never drift apart. */}
      {panel === 'baseline' && (
        <>
          {['core', 'extra'].map(tier => (
            <div key={tier} style={{ marginBottom: 16 }}>
              <h4 style={{
                fontSize: 12, fontWeight: 700, color: fg, margin: '0 0 8px',
              }}>
                {tier === 'core' ? 'The six worth keeping up' : 'Useful, but optional'}
              </h4>
              {METRICS.filter(m => m.tier === tier).map(m => (
                <div key={m.key} style={{
                  background: cardBg, border: `1px solid ${cardBd}`,
                  borderRadius: 10, padding: '10px 12px', marginBottom: 7,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: fg }}>{m.label}</div>
                  <div style={{ fontSize: 10.5, color: sub, margin: '2px 0 5px' }}>
                    {m.unit} · {m.cadence} · {m.better === 'up' ? 'higher is better' : 'lower is better'}
                    {m.sides ? ' · both sides' : ''}
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.55, color: sub }}>{m.how}</div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* ---------------- LOG ---------------- */}
      {panel === 'log' && (
        <>
          <div style={{
            background: cardBg, border: `1px solid ${cardBd}`,
            borderRadius: 12, padding: '12px 13px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: fg, marginBottom: 8 }}>
              Today's check-in
            </div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setEnergy(i)}
                  aria-pressed={energy === i}
                  style={{
                    width: 27, height: 30, fontSize: 11, fontWeight: 600, borderRadius: 7,
                    color: energy === i ? '#fff' : sub,
                    background: energy === i ? pa : 'transparent',
                    border: `1px solid ${energy === i ? pa : cardBd}`,
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: sub, marginBottom: 8 }}>Energy, 0–10</div>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="A line about how the body feels today"
              style={{
                width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 8,
                border: `1px solid ${cardBd}`, background: inputBg, color: fg,
                marginBottom: 8, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleCheckin}
              style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 600,
                borderRadius: 8, color: '#fff', background: pa,
              }}
            >
              Save check-in
            </button>
          </div>

          {/* ---- reminders ---- */}
          <div style={{
            background: cardBg, border: `1px solid ${cardBd}`,
            borderRadius: 12, padding: '12px 13px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: fg }}>
                Reminders
              </span>
              <button
                onClick={toggleReminders}
                role="switch"
                aria-checked={prefs.enabled}
                style={{
                  padding: '5px 13px', fontSize: 11, fontWeight: 600, borderRadius: 8,
                  color: prefs.enabled ? '#fff' : sub,
                  background: prefs.enabled ? pa : 'transparent',
                  border: `1px solid ${prefs.enabled ? pa : cardBd}`,
                }}
              >
                {prefs.enabled ? 'On' : 'Off'}
              </button>
            </div>

            <p style={{ fontSize: 10.5, lineHeight: 1.5, color: sub, margin: '0 0 10px' }}>
              Two a day, saying what is due and what is worth checking. No streaks and
              no misses reported.
            </p>

            {prefs.enabled && (
              <>
                {[['morning', 'Morning'], ['evening', 'Evening']].map(([k, label]) => (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7,
                  }}>
                    <span style={{ flex: 1, fontSize: 12, color: fg }}>{label}</span>
                    <input
                      type="time"
                      value={prefs[k]}
                      aria-label={`${label} reminder time`}
                      onChange={e => savePrefs({ ...prefs, [k]: e.target.value })}
                      style={{
                        padding: '5px 8px', fontSize: 12, borderRadius: 7,
                        border: `1px solid ${cardBd}`, background: inputBg, color: fg,
                      }}
                    />
                  </div>
                ))}

                {/* What they would say right now, so the setting is not abstract. */}
                <div style={{
                  marginTop: 8, padding: '8px 11px', borderRadius: 8,
                  background: faint, fontSize: 11, lineHeight: 1.55, color: sub,
                }}>
                  <div style={{ marginBottom: 5 }}>
                    <b style={{ color: fg }}>Morning would say: </b>{morningBody(log)}
                  </div>
                  <div>
                    <b style={{ color: fg }}>Evening would say: </b>{eveningBody(log)}
                  </div>
                </div>

                <p style={{ fontSize: 10, lineHeight: 1.5, color: sub, margin: '8px 0 0' }}>
                  These fire only while the app is open — same as the protocol and workout
                  reminders. Nothing is sent to a server, so nothing can wake the phone on
                  its own.
                </p>
              </>
            )}

            {perm === 'denied' && (
              <p style={{ fontSize: 10.5, lineHeight: 1.5, color: sub, margin: '6px 0 0' }}>
                Notifications are currently blocked for this site in your browser settings.
              </p>
            )}
          </div>

          <div style={{ fontSize: 11.5, color: sub, margin: '0 2px 10px' }}>
            {stats.total
              ? <><b>{stats.total}</b> entries across <b>{stats.days}</b> days, since {stats.since}.</>
              : <>Started {stats.since}. Nothing logged yet.</>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={handleSummary} style={{
              padding: '7px 13px', fontSize: 11.5, fontWeight: 600, borderRadius: 8,
              color: '#fff', background: pa,
            }}>
              Copy summary
            </button>
            <button onClick={handleExport} style={{
              padding: '7px 13px', fontSize: 11.5, fontWeight: 600, borderRadius: 8,
              color: fg, border: `1px solid ${cardBd}`,
            }}>
              Export
            </button>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '7px 13px', fontSize: 11.5, fontWeight: 600, borderRadius: 8,
              color: fg, border: `1px solid ${cardBd}`,
            }}>
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files[0]) handleImport(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {feed.length ? feed.map(r => (
              <li key={r.key} style={{
                display: 'flex', gap: 8, padding: '7px 2px',
                borderBottom: `1px solid ${cardBd}`, fontSize: 12, color: fg,
              }}>
                <span style={{ flex: 1 }}>{r.label}</span>
                <span style={{ fontSize: 10.5, color: sub }}>{r.when}</span>
              </li>
            )) : (
              <li style={{ padding: '10px 2px', fontSize: 12, color: sub }}>
                Nothing logged yet. Open a card and press Did this.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
