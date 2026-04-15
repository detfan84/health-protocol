import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { EQUIPMENT } from '../data/equipment';
import { BLOCKS } from '../data/blocks';
import { SUBPHASES, PHASE_META } from '../data/phases';
import { computeOffsetForSubphase, getEffectiveSubphases } from '../lib/phaseUtils';
import { requestPermission, getPermissionStatus, formatTime, scheduleBlockReminders } from '../lib/notifications';

export default function SettingsPanel({ theme, onClose, startDate, phaseInfo, phaseOffset, onSetPhaseOffset, subphaseDurations, onSetSubphaseDurations }) {
  const {
    equipment, setEquipment,
    notificationPrefs, setNotificationPrefs,
    workoutSchedule, setWorkoutSchedule,
  } = useSettings();
  const { fg, sub, cardBg, cardBd, faint, pa, inputBg } = theme;
  const [permStatus, setPermStatus] = useState(getPermissionStatus());

  const toggleEquip = (id) => {
    if (id === 'bodyweight') return;
    setEquipment(
      equipment.includes(id)
        ? equipment.filter(e => e !== id)
        : [...equipment, id]
    );
  };

  const effectiveSubs = getEffectiveSubphases(subphaseDurations);
  const hasCustomDurations = effectiveSubs.some((sp, i) => sp.days !== SUBPHASES[i].days);

  const jumpToSubphase = (targetSi) => {
    if (!startDate || !onSetPhaseOffset) return;
    const newOffset = computeOffsetForSubphase(startDate, targetSi, subphaseDurations);
    onSetPhaseOffset(newOffset);
  };

  const resetPhaseOffset = () => {
    if (onSetPhaseOffset) onSetPhaseOffset(0);
  };

  const updateDuration = (i, val) => {
    if (!onSetSubphaseDurations) return;
    const next = { ...(subphaseDurations || {}) };
    if (!val || val < 1 || val === SUBPHASES[i].days) {
      delete next[i];
    } else {
      next[i] = val;
    }
    onSetSubphaseDurations(next);
  };

  const setCurrentDay = (newDay) => {
    if (!startDate || !onSetPhaseOffset || !phaseInfo) return;
    const newOffset = computeOffsetForSubphase(startDate, phaseInfo.si, subphaseDurations, newDay);
    onSetPhaseOffset(newOffset);
  };

  const resetAllDurations = () => {
    if (onSetSubphaseDurations) onSetSubphaseDurations({});
  };

  return (
    <div style={{ background: cardBg, borderBottom: `1px solid ${cardBd}`, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: fg }}>Settings</div>
        <button onClick={onClose} style={{ fontSize: 18, color: sub, padding: 4 }}>×</button>
      </div>

      {/* Protocol Phase */}
      {startDate && phaseInfo && onSetPhaseOffset && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Protocol Phase
          </div>
          <div style={{ fontSize: 11, color: sub, marginBottom: 10, lineHeight: 1.5 }}>
            Tap a row to jump to Day 1 of that subphase. Edit the day count to change how long each subphase lasts. Time advances normally from the day you jump.
          </div>
          <div style={{ fontSize: 11, color: sub, marginBottom: 10, lineHeight: 1.6 }}>
            Current: <span style={{ color: fg, fontWeight: 600 }}>{effectiveSubs[phaseInfo.si]?.name}</span> · Day{' '}
            <CurrentDayInput
              key={`${phaseInfo.si}-${phaseInfo.dis}`}
              value={phaseInfo.dis}
              max={effectiveSubs[phaseInfo.si]?.days}
              theme={theme}
              onCommit={setCurrentDay}
            />
            {' '}of {effectiveSubs[phaseInfo.si]?.days} · Protocol day {phaseInfo.td}
            {phaseOffset !== 0 && (
              <span style={{ color: '#ff9800', fontWeight: 600 }}> · Adjusted {phaseOffset > 0 ? `+${phaseOffset}` : phaseOffset}d</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {effectiveSubs.map((sp, i) => {
              const pm = PHASE_META.find(p => p.id === sp.pid) || PHASE_META[0];
              const isCurrent = i === phaseInfo.si;
              const accent = theme.dark ? pm.dk : pm.color;
              const defaultDays = SUBPHASES[i].days;
              const isCustom = sp.days !== defaultDays;
              return (
                <SubphaseRow
                  key={i}
                  sp={sp}
                  defaultDays={defaultDays}
                  isCurrent={isCurrent}
                  isCustom={isCustom}
                  accent={accent}
                  theme={theme}
                  onJump={() => jumpToSubphase(i)}
                  onCommitDuration={(v) => updateDuration(i, v)}
                />
              );
            })}
          </div>
          {(phaseOffset !== 0 || hasCustomDurations) && (
            <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {phaseOffset !== 0 && (
                <button
                  onClick={resetPhaseOffset}
                  style={{ fontSize: 11, color: '#e53935', textDecoration: 'underline', padding: '4px 0' }}
                >
                  Reset phase jump
                </button>
              )}
              {hasCustomDurations && (
                <button
                  onClick={resetAllDurations}
                  style={{ fontSize: 11, color: '#e53935', textDecoration: 'underline', padding: '4px 0' }}
                >
                  Reset all durations to default
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Supplement Reminders */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Supplement Reminders
        </div>

        {permStatus === 'unsupported' && (
          <div style={{ fontSize: 11, color: '#e53935', marginBottom: 8 }}>
            Push notifications are not supported in this browser.
          </div>
        )}

        {permStatus === 'denied' && (
          <div style={{ fontSize: 11, color: '#e53935', marginBottom: 8 }}>
            Notifications are blocked. Enable them in your browser settings for this site.
          </div>
        )}

        {permStatus !== 'granted' && permStatus !== 'denied' && permStatus !== 'unsupported' && (
          <button
            onClick={async () => {
              const result = await requestPermission();
              setPermStatus(result);
              if (result === 'granted') {
                const newPrefs = { ...notificationPrefs, _enabled: true };
                setNotificationPrefs(newPrefs);
                scheduleBlockReminders(BLOCKS, newPrefs);
              }
            }}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: pa, color: '#fff', marginBottom: 8,
            }}
          >
            Enable Supplement Reminders
          </button>
        )}

        {permStatus === 'granted' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: fg }}>Reminders active</div>
              <button
                onClick={() => {
                  const newPrefs = { ...notificationPrefs, _enabled: !notificationPrefs._enabled };
                  setNotificationPrefs(newPrefs);
                  scheduleBlockReminders(BLOCKS, newPrefs);
                }}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${notificationPrefs._enabled ? '#4caf50' : cardBd}`,
                  background: notificationPrefs._enabled ? (theme.dark ? '#1a2e1a' : '#e8f5e9') : 'transparent',
                  color: notificationPrefs._enabled ? '#4caf50' : sub,
                }}
              >
                {notificationPrefs._enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {notificationPrefs._enabled && (
              <div>
                <div style={{ fontSize: 10, color: sub, marginBottom: 6 }}>
                  Tap to enable/disable each block. Reminders fire at the block's start time.
                </div>
                {BLOCKS.map(block => {
                  const isOn = notificationPrefs[block.id] !== false;
                  return (
                    <div
                      key={block.id}
                      onClick={() => {
                        const newPrefs = { ...notificationPrefs, [block.id]: !isOn };
                        setNotificationPrefs(newPrefs);
                        scheduleBlockReminders(BLOCKS, newPrefs);
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: `1px solid ${faint}`, cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: fg }}>{block.time}</div>
                        <div style={{ fontSize: 10, color: sub }}>{block.label} · {formatTime(block.hr[0])}</div>
                      </div>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: `2px solid ${isOn ? '#4caf50' : cardBd}`,
                        background: isOn ? '#4caf50' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: 'white', fontWeight: 700,
                      }}>
                        {isOn && '\u2713'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Workout Schedule */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Workout Schedule
        </div>
        <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>Which days do you plan to work out?</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const active = workoutSchedule.days?.includes(i) || false;
            return (
              <button
                key={day}
                onClick={() => {
                  const days = active
                    ? (workoutSchedule.days || []).filter(d => d !== i)
                    : [...(workoutSchedule.days || []), i].sort();
                  setWorkoutSchedule({ ...workoutSchedule, days });
                }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${active ? '#4caf50' : cardBd}`,
                  background: active ? (theme.dark ? '#1a2e1a' : '#e8f5e9') : 'transparent',
                  color: active ? '#4caf50' : sub,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: fg }}>Preferred time:</div>
          <input
            type="time"
            value={workoutSchedule.time || '09:00'}
            onChange={e => setWorkoutSchedule({ ...workoutSchedule, time: e.target.value })}
            style={{
              padding: '4px 8px', borderRadius: 6, border: `1px solid ${cardBd}`,
              fontSize: 12, background: inputBg, color: fg,
            }}
          />
        </div>

        {permStatus === 'granted' && (workoutSchedule.days?.length > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: fg }}>Workout reminders</div>
            <button
              onClick={() => setWorkoutSchedule({ ...workoutSchedule, reminders: !workoutSchedule.reminders })}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${workoutSchedule.reminders ? '#4caf50' : cardBd}`,
                background: workoutSchedule.reminders ? (theme.dark ? '#1a2e1a' : '#e8f5e9') : 'transparent',
                color: workoutSchedule.reminders ? '#4caf50' : sub,
              }}
            >
              {workoutSchedule.reminders ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>

      {/* Equipment */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          My Equipment
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EQUIPMENT.map(eq => {
            const active = eq.alwaysOn || equipment.includes(eq.id);
            return (
              <button
                key={eq.id}
                onClick={() => toggleEquip(eq.id)}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: `1.5px solid ${active ? '#4caf50' : cardBd}`,
                  background: active ? (theme.dark ? '#1a2e1a' : '#e8f5e9') : 'transparent',
                  color: active ? '#4caf50' : sub,
                  opacity: eq.alwaysOn ? 0.6 : 1,
                }}
              >
                {eq.icon} {eq.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CurrentDayInput({ value, max, theme, onCommit }) {
  const [local, setLocal] = useState(null);
  const display = local !== null ? local : String(value);

  const commit = () => {
    if (local === null) return;
    const n = parseInt(local, 10);
    if (!isNaN(n) && n >= 1 && n !== value) {
      onCommit(n);
    }
    setLocal(null);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min="1"
      max={max || 999}
      value={display}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{
        width: 44, padding: '2px 4px', borderRadius: 5,
        border: `1px solid ${theme.cardBd}`, background: theme.inputBg, color: theme.fg,
        fontSize: 11, textAlign: 'center', fontWeight: 600,
      }}
    />
  );
}

function SubphaseRow({ sp, defaultDays, isCurrent, isCustom, accent, theme, onJump, onCommitDuration }) {
  const { fg, sub, cardBd, inputBg } = theme;
  const [localVal, setLocalVal] = useState(null);
  const displayVal = localVal !== null ? localVal : String(sp.days);

  const commit = () => {
    if (localVal === null) return;
    const n = parseInt(localVal, 10);
    if (!isNaN(n) && n > 0) {
      onCommitDuration(n);
    }
    setLocalVal(null);
  };

  return (
    <div
      onClick={onJump}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 10px', borderRadius: 8, cursor: 'pointer', gap: 8,
        border: `1.5px solid ${isCurrent ? accent : cardBd}`,
        background: isCurrent ? (theme.dark ? '#1a2a1a' : '#f0f7ed') : 'transparent',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: isCurrent ? accent : fg, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{sp.name}</span>
          {isCurrent && (
            <span style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.05em' }}>CURRENT</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: sub, marginTop: 1 }}>
          Phase {sp.pid} · {sp.label}
          {isCustom && (
            <span style={{ color: '#ff9800', fontWeight: 600 }}> · custom (default {defaultDays}d)</span>
          )}
        </div>
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
      >
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="999"
          value={displayVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{
            width: 48, padding: '4px 6px', borderRadius: 6,
            border: `1px solid ${isCustom ? '#ff9800' : cardBd}`,
            background: inputBg, color: fg, fontSize: 12, textAlign: 'center',
            fontWeight: isCustom ? 600 : 400,
          }}
        />
        <span style={{ fontSize: 11, color: sub }}>d</span>
      </div>
    </div>
  );
}
