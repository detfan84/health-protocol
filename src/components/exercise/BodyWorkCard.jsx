import { useState } from 'react';
import { PHOTOS, NO_PHOTO, TRACK, FLARE, M_BY_KEY } from '../../data/bodywork';
import {
  lastSession, countIn, isStale, ago, series, deltaText,
  sparkPoints, sparkPath, flareText, mKey,
} from '../../lib/bodyworkUtils';
import PhotoLoop from './PhotoLoop';

function Field({ label, children, theme }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
        textTransform: 'uppercase', color: theme.sub, marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: theme.fg }}>{children}</div>
    </div>
  );
}

function Note({ label, text, tone, theme }) {
  if (!text) return null;
  const warn = tone === 'careful';
  const bg = warn
    ? (theme.dark ? '#2a1a1a' : '#fef3f3')
    : (theme.dark ? '#16241a' : '#f1f8f2');
  const bd = warn
    ? (theme.dark ? '#4a2a2a' : '#f0d0d0')
    : (theme.dark ? '#2a4a32' : '#d3e8d8');
  const fg = warn
    ? (theme.dark ? '#ff8a80' : '#8b4545')
    : (theme.dark ? '#8fd39d' : '#2f6b3d');

  return (
    <div style={{
      margin: '0 0 12px', padding: '9px 12px', borderRadius: 9,
      background: bg, border: `1px solid ${bd}`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
        textTransform: 'uppercase', color: fg, marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: fg }}>{text}</div>
    </div>
  );
}

function Sparkline({ points, theme }) {
  if (!points) return null;
  return (
    <svg
      className="bw-spark"
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ width: '100%', height: 24, color: theme.pa, display: 'block', marginTop: 4 }}
    >
      <path d={sparkPath(points)} />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" />
    </svg>
  );
}

function MetricRow({ metric, side, log, onMeasure, theme }) {
  const arr = series(log, metric.key, side);
  const d = deltaText(metric, arr);
  const [val, setVal] = useState(arr.length ? String(arr[arr.length - 1].v) : '');

  const commit = () => {
    const v = parseFloat(val);
    if (Number.isNaN(v)) return;
    onMeasure(metric.key, side, v);
  };

  const deltaColor =
    d.cls === 'up' ? (theme.dark ? '#8fd39d' : '#2f6b3d')
    : d.cls === 'down' ? (theme.dark ? '#ff8a80' : '#b04545')
    : theme.sub;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ flex: 1, fontSize: 12, color: theme.fg, lineHeight: 1.3 }}>
        {metric.label}{side ? ` — ${side}` : ''}
        <span style={{ display: 'block', fontSize: 10, color: theme.sub }}>
          {metric.cadence}
        </span>
      </span>
      <input
        type="number"
        step="0.1"
        inputMode="decimal"
        aria-label={`${metric.label}${side ? ` ${side}` : ''}`}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { commit(); e.target.blur(); } }}
        style={{
          width: 58, padding: '5px 7px', fontSize: 13, textAlign: 'right',
          borderRadius: 7, border: `1px solid ${theme.cardBd}`,
          background: theme.inputBg, color: theme.fg,
        }}
      />
      <span style={{ fontSize: 10, color: theme.sub, width: 30 }}>{metric.unit}</span>
      <span style={{ fontSize: 10, color: deltaColor, width: 78, textAlign: 'right' }}>
        {d.txt}
      </span>
    </div>
  );
}

export default function BodyWorkCard({ card, log, onLog, onUndo, onMeasure, theme }) {
  const [open, setOpen] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const { fg, sub, cardBg, cardBd, faint, pa } = theme;
  const last = lastSession(log, card.id);
  const stale = isStale(log, card.id);
  const shots = PHOTOS[card.id];
  const keys = TRACK[card.id] || [];

  const handleLog = () => {
    onLog(card.id);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1400);
  };

  const staleColor = theme.dark ? '#e0a458' : '#b57419';

  return (
    <div style={{
      background: cardBg, border: `1px solid ${cardBd}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 13px', textAlign: 'left', background: 'transparent',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: fg }}>
          {card.name}
          {card.fix && (
            <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 600, color: pa }}>
              {card.fix}
            </span>
          )}
        </span>
        {last && (
          <span style={{ fontSize: 10, color: stale ? staleColor : sub }}>
            {ago(last)}
          </span>
        )}
        <span style={{ fontSize: 11, color: sub }}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 13px 13px' }}>
          {card.tool && (
            <div style={{
              padding: '7px 11px', marginBottom: 12, borderRadius: 8,
              background: faint, fontSize: 12, lineHeight: 1.5, color: fg,
            }}>
              <b style={{ fontSize: 10, letterSpacing: 0.6, color: sub }}>TOOL </b>
              {card.tool}
            </div>
          )}

          {/* Release is only half the drill — the load is what keeps it. */}
          {card.release && (
            <div style={{ marginBottom: 12 }}>
              <Field label="Release" theme={theme}>{card.release}</Field>
              <Field label="Then load — required" theme={theme}>{card.load}</Field>
            </div>
          )}

          {card.steps && (
            <Field label="How" theme={theme}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {card.steps.map((s, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>{s}</li>
                ))}
              </ol>
            </Field>
          )}

          {card.dose && (
            <Field label="Dose" theme={theme}>
              <span style={{ fontWeight: 600 }}>{card.dose}</span>
            </Field>
          )}
          <Field label="Feels like" theme={theme}>{card.feels}</Field>
          <Note label="You'll know it worked" text={card.notice} tone="notice" theme={theme} />
          <Note label="Careful" text={card.careful} tone="careful" theme={theme} />

          {/* Photos, or a note saying which kind of blank this is. The two
              kinds read differently: nothing exists to find, versus what
              exists would teach the wrong thing. */}
          {shots
            ? shots.map((s, i) => <PhotoLoop key={i} shot={s} theme={theme} />)
            : (() => {
              const gap = NO_PHOTO[card.id];
              if (!gap) return null;
              return (
                <div style={{
                  padding: '9px 12px', marginBottom: 12, borderRadius: 9,
                  border: `1px dashed ${cardBd}`, fontSize: 11.5,
                  lineHeight: 1.55, color: sub,
                }}>
                  {gap.why === 'absent'
                    ? <>No photo of {gap.what} — the library is an exercise library,
                        and this is not an exercise. The written steps are the whole
                        instruction here.</>
                    : <>No photo of {gap.what} that would not teach the wrong thing —{' '}
                        {gap.near}. This one is worth filming yourself.</>}
                </div>
              );
            })()}

          {/* ---- tracking ---- */}
          <div style={{
            marginTop: 4, paddingTop: 11, borderTop: `1px solid ${cardBd}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <button
                onClick={handleLog}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                  borderRadius: 8, color: '#fff', background: pa,
                }}
              >
                {justLogged ? 'Logged' : 'Did this'}
              </button>
              {last && (
                <button
                  onClick={() => onUndo(card.id)}
                  style={{
                    padding: '6px 11px', fontSize: 11, fontWeight: 600,
                    borderRadius: 8, color: sub, border: `1px solid ${cardBd}`,
                  }}
                >
                  Undo
                </button>
              )}
              <span style={{ fontSize: 10.5, color: stale ? staleColor : sub }}>
                {last
                  ? <><b>{ago(last)}</b> · {countIn(log, card.id, 30)} in the last 30 days</>
                  : 'not logged yet'}
              </span>
            </div>

            {/* The 48-hour prompt. Delayed soreness is the actual risk with
                the eccentric and contract–relax work — a safety feature. */}
            {FLARE.includes(card.id) && (() => {
              const f = flareText(log, card.id);
              return (
                <div style={{
                  padding: '7px 11px', marginBottom: 9, borderRadius: 8,
                  fontSize: 11.5, lineHeight: 1.5,
                  background: f.active
                    ? (theme.dark ? '#2a2010' : '#fff8e8')
                    : 'transparent',
                  border: f.active
                    ? `1px solid ${theme.dark ? '#4a3a1a' : '#f0e0b8'}`
                    : `1px dashed ${cardBd}`,
                  color: f.active ? staleColor : sub,
                }}>
                  {f.txt}
                </div>
              );
            })()}

            {keys.map(k => {
              const m = M_BY_KEY[k];
              if (!m) return null;
              const sides = m.sides ? ['L', 'R'] : [null];
              return (
                <div key={k} style={{ marginBottom: 12 }}>
                  {sides.map(side => (
                    <MetricRow
                      key={mKey(m.key, side)}
                      metric={m}
                      side={side}
                      log={log}
                      onMeasure={onMeasure}
                      theme={theme}
                    />
                  ))}
                  <p style={{ fontSize: 10.5, lineHeight: 1.5, color: sub, margin: '3px 0 0' }}>
                    {m.how}
                  </p>
                  {sides.map(side => (
                    <Sparkline
                      key={`sp-${mKey(m.key, side)}`}
                      points={sparkPoints(series(log, m.key, side), m.better)}
                      theme={theme}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
