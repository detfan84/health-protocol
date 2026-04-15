import { useState } from 'react';
import { PHASE_META } from '../data/phases';
import { getEffectiveSubphases } from '../lib/phaseUtils';
import { useSettings } from '../context/SettingsContext';
import { getTheme } from '../styles/theme';
import SettingsPanel from './SettingsPanel';

export default function Header({ phaseInfo, startDate, onSetStartDate, phaseOffset, onSetPhaseOffset, subphaseDurations, onSetSubphaseDurations, theme }) {
  const { dark, setDark } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  const effectiveSubs = getEffectiveSubphases(subphaseDurations);
  const totalDays = effectiveSubs.reduce((s, x) => s + x.days, 0);
  const pm = PHASE_META.find(p => p.id === phaseInfo.pid) || PHASE_META[0];
  const sp = effectiveSubs[phaseInfo.si];
  const { pc, pa, fg, sub, faint, cardBd, inputBg } = theme;

  return (
    <>
      <div style={{ padding: '20px 16px 12px', borderBottom: `3px solid ${pc}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: sub }}>
            Kevin's Protocol
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setShowSettings(!showSettings)} style={{ fontSize: 16, padding: 4 }} aria-label="Settings">
              {'\u2699\uFE0F'}
            </button>
            <button onClick={() => setDark(!dark)} style={{ fontSize: 16, padding: 4 }} aria-label="Toggle dark mode">
              {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            </button>
          </div>
        </div>

        {!startDate ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: fg }}>When did you start the liver cleanse?</div>
            <input
              type="date"
              onChange={e => onSetStartDate(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${cardBd}`, fontSize: 14, background: inputBg, color: fg,
              }}
            />
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: pc }}>
                  {sp?.name}
                </div>
                <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>
                  Day {phaseInfo.dis} of {sp?.days} · Phase {phaseInfo.pid}
                </div>
              </div>
              <PhaseRing pct={phaseInfo.pct || 0} pa={pa} pc={pc} faint={faint} />
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden' }}>
              {PHASE_META.map(p => {
                const days = effectiveSubs.filter(s => s.pid === p.id).reduce((s, x) => s + x.days, 0);
                return (
                  <div
                    key={p.id}
                    style={{
                      width: `${(days / totalDays) * 100}%`,
                      background: phaseInfo.pid >= p.id ? (dark ? p.dk : p.color) : faint,
                      opacity: phaseInfo.pid > p.id ? 0.4 : 1,
                      borderRadius: 3,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          theme={theme}
          onClose={() => setShowSettings(false)}
          startDate={startDate}
          phaseInfo={phaseInfo}
          phaseOffset={phaseOffset}
          onSetPhaseOffset={onSetPhaseOffset}
          subphaseDurations={subphaseDurations}
          onSetSubphaseDurations={onSetSubphaseDurations}
        />
      )}
    </>
  );
}

function PhaseRing({ pct, pa, pc, faint }) {
  const circumference = 138.2;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="22" fill="none" stroke={faint} strokeWidth="4" />
        <circle
          cx="26" cy="26" r="22" fill="none" stroke={pa} strokeWidth="4"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          transform="rotate(-90 26 26)" strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', fontSize: 12, fontWeight: 700, color: pc }}>{pct}%</div>
    </div>
  );
}
