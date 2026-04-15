import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../../lib/db';
import { today as todayStr } from '../../lib/phaseUtils';

const STEPS = [
  { when: 'Prep Week (7 days before)', what: 'Take Malic Acid 600\u2013800mg 2\u20133x/day with meals for 7 days. Softens biliary deposits. Alternative: 32oz pure apple juice daily.' },
  { when: 'Flush Day \u2014 Morning through 2 PM', what: 'Eat only fruits and vegetables. NO fat at all. Stop all food and liquids at 2 PM.' },
  { when: '6:00 PM', what: '2 tablespoons Epsom salt dissolved in warm water. Drink it.' },
  { when: '8:00 PM', what: 'Second dose \u2014 2 tablespoons Epsom salt in warm water. Expect bowel evacuation to begin.' },
  { when: '~10:00\u201310:30 PM (after bowels settle)', what: 'Drink 2\u20133 oz extra virgin olive oil followed immediately by fresh lemon juice as chaser. Lay on your RIGHT side. Try to sleep.' },
  { when: 'Next Morning', what: 'Expect continued bowel movements. Look for green/tan stones or debris (may be saponified oil, may be biliary material \u2014 both indicate bile was flushed). Resume normal eating gently \u2014 broth, fruit, simple foods.' },
];

// `warn: true` rows render with a warning-triangle prefix in the notes block
const NOTES = [
  { warn: true,  text: 'Do NOT attempt if you have known large gallstones \u2014 get an ultrasound first' },
  { warn: true,  text: 'Skip your binder, Eliminate, and non-essential supplements on flush day' },
  { warn: false, text: 'Continue TUDCA through prep week \u2014 stop on flush day, resume next day' },
  { warn: false, text: 'Reduce olive oil to 2\u20133 oz for first attempt (standard protocol calls for 4 oz)' },
  { warn: false, text: 'Wait minimum 6\u20138 weeks between flushes' },
  { warn: true,  text: "If you experience severe upper-right abdominal pain that doesn't resolve, go to ER \u2014 possible bile duct obstruction" },
];

const FLUSHES_KEY = 'kp-flushes';

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatPretty(str) {
  const d = parseLocalDate(str);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysSince(str) {
  const then = parseLocalDate(str).getTime();
  const now = parseLocalDate(todayStr()).getTime();
  return Math.max(0, Math.floor((now - then) / 86400000));
}

export default function LiverFlush({ theme }) {
  const { fg, sub, cardBg, cardBd, faint, pa, dark } = theme;
  const [flushes, setFlushes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting(FLUSHES_KEY).then((v) => {
      setFlushes(Array.isArray(v) ? v : []);
      setLoaded(true);
    });
  }, []);

  const persist = (list) => {
    setFlushes(list);
    setSetting(FLUSHES_KEY, list);
  };

  const logFlushToday = () => {
    const d = todayStr();
    if (flushes.includes(d)) return; // dedupe
    const next = [...flushes, d].sort(); // chronological ascending
    persist(next);
  };

  const removeFlush = (d) => {
    persist(flushes.filter((x) => x !== d));
  };

  const sortedDesc = [...flushes].sort().reverse();
  const mostRecent = sortedDesc[0];
  const since = mostRecent ? daysSince(mostRecent) : null;

  // Warning block style mirrors the medical disclaimer in AnnualLabs
  const warnBg = dark ? '#2a1a1a' : '#fef3f3';
  const warnBd = dark ? '#4a2a2a' : '#f0d0d0';
  const warnFg = dark ? '#ff8a80' : '#8b4545';

  return (
    <div style={{ background: cardBg, borderRadius: 14, margin: '8px 16px', padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: fg }}>
        Liver/Gallbladder Flush
      </div>
      <div style={{ fontSize: 11, color: sub, marginBottom: 12, lineHeight: 1.5 }}>
        Do after completing liver cleanse phase. Requires 1 week malic acid prep.
      </div>

      {/* Steps */}
      <div style={{ marginBottom: 14 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10,
            padding: '10px 0',
            borderBottom: i < STEPS.length - 1 ? `1px solid ${faint}` : 'none',
          }}>
            <div style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
              background: pa + '33', color: pa,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: fg }}>{s.when}</div>
              <div style={{ fontSize: 11, color: sub, marginTop: 3, lineHeight: 1.5 }}>{s.what}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes / warnings */}
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: warnBg, border: `1px solid ${warnBd}`,
        fontSize: 11, color: warnFg, lineHeight: 1.6, marginBottom: 14,
      }}>
        {NOTES.map((n, i) => (
          <div key={i} style={{ padding: '3px 0' }}>
            {n.warn ? `${'\u26A0\uFE0F'} ` : `${'\u2022'} `}
            <span style={{ color: warnFg }}>{n.text}</span>
          </div>
        ))}
      </div>

      {/* Flush tracker */}
      <div style={{ paddingTop: 4 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: fg }}>Flush Log</div>
          <button
            onClick={logFlushToday}
            disabled={!loaded || flushes.includes(todayStr())}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: pa, color: '#fff',
              opacity: (!loaded || flushes.includes(todayStr())) ? 0.5 : 1,
            }}
          >
            {flushes.includes(todayStr()) ? 'Logged Today' : 'Log a Flush'}
          </button>
        </div>

        {loaded && flushes.length === 0 && (
          <div style={{ fontSize: 11, color: sub, fontStyle: 'italic', padding: '4px 0' }}>
            No flushes logged yet. Tap the button above the day you do one.
          </div>
        )}

        {loaded && since !== null && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 8,
            background: faint, border: `1px solid ${cardBd}`,
            fontSize: 11, color: fg,
          }}>
            <strong style={{ color: pa }}>{since}</strong> day{since === 1 ? '' : 's'} since last flush
            {since < 42 && (
              <span style={{ color: warnFg, marginLeft: 6 }}>
                {'\u2014 wait at least 6\u20138 weeks before next'}
              </span>
            )}
          </div>
        )}

        {sortedDesc.length > 0 && (
          <div>
            {sortedDesc.map((d, i) => (
              <div key={d} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0',
                borderBottom: i < sortedDesc.length - 1 ? `1px solid ${faint}` : 'none',
              }}>
                <div style={{ fontSize: 12, color: fg }}>
                  {formatPretty(d)}
                  <span style={{ fontSize: 10, color: sub, marginLeft: 8 }}>
                    ({daysSince(d)}d ago)
                  </span>
                </div>
                <button
                  onClick={() => removeFlush(d)}
                  aria-label="Remove log entry"
                  title="Remove"
                  style={{
                    fontSize: 14, fontWeight: 700, color: sub,
                    padding: '2px 8px', borderRadius: 6, lineHeight: 1,
                  }}
                >
                  {'\u00d7'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
