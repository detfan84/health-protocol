import { useState, useEffect, useCallback } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { loadInitialData, setSetting, setDailyField, setSupplyStatuses, setRoutines, setWorkout, getWorkout, getAllDailyRecords, getAllWorkouts } from './lib/db';
import { getPhaseInfo, today, getHour } from './lib/phaseUtils';
import { BLOCKS, PARASITE_ADDS } from './data/blocks';
import { PHASE_META, SUBPHASES } from './data/phases';
import { getTheme } from './styles/theme';
import { scheduleBlockReminders, scheduleWorkoutReminder } from './lib/notifications';
import { getEncouragement, getHydrationEncouragement, getMovementEncouragement, evaluateBadges } from './lib/badgeUtils';
import { computeStreaks } from './lib/streakUtils';

import Header from './components/Header';
import TabBar from './components/TabBar';

import TimeBlock from './components/today/TimeBlock';
import FastingMode from './components/today/FastingMode';
import HydrationTracker from './components/today/HydrationTracker';
import MovementChecklist from './components/today/MovementChecklist';

import FoodLog from './components/log/FoodLog';
import Journal from './components/log/Journal';
import SymptomTracker from './components/log/SymptomTracker';

import SupplyTracker from './components/supply/SupplyTracker';

import SpacingRules from './components/reference/SpacingRules';
import SymptomsGuide from './components/reference/SymptomsGuide';
import AnnualLabs from './components/reference/AnnualLabs';

import ExerciseTab from './ExerciseTab';
import ProfileTab from './components/ProfileTab';

function AppInner() {
  const settings = useSettings();
  const [tab, setTab] = useState('today');
  const [startDate, setStartDate] = useState(null);
  const [checks, setChecks] = useState({});
  const [journal, setJournal] = useState('');
  const [food, setFood] = useState({ m1: '', m2: '', sn: '' });
  const [water, setWater] = useState(0);
  const [moves, setMoves] = useState({});
  const [symptoms, setSymptoms] = useState({});
  const [supply, setSupply] = useState({});
  const [hidden, setHidden] = useState({});
  const [editing, setEditing] = useState(false);
  const [fastingMode, setFastingMode] = useState(false);
  const [userRoutines, setUserRoutines] = useState([]);
  const [streakStats, setStreakStats] = useState({});
  const [ready, setReady] = useState(false);

  const d = today();
  const hour = getHour();

  useEffect(() => {
    loadInitialData(d).then(data => {
      setStartDate(data.startDate);
      setChecks(data.daily.checks || {});
      setJournal(data.daily.journal || '');
      setFood(data.daily.food || { m1: '', m2: '', sn: '' });
      setWater(data.daily.water || 0);
      setMoves(data.daily.moves || {});
      setSymptoms(data.daily.symptoms || {});
      setSupply(data.supplyStatuses);
      setHidden(data.hidden);
      setUserRoutines(data.userRoutines);
      setReady(true);
      // Schedule notifications if enabled
      if (data.notificationPrefs?._enabled) {
        scheduleBlockReminders(BLOCKS, data.notificationPrefs);
      }
      // Schedule workout reminder if enabled
      if (data.workoutSchedule?.reminders) {
        scheduleWorkoutReminder(data.workoutSchedule);
      }
      // Compute streaks from history
      Promise.all([getAllDailyRecords(), getAllWorkouts()]).then(([dailyRecords, workouts]) => {
        const stats = computeStreaks(dailyRecords, workouts, {
          startDate: data.startDate,
          hidden: data.hidden,
          supply: data.supplyStatuses,
          hydrationTarget: data.hydrationTarget,
        });
        setStreakStats(stats);
      });
    });
  }, [d]);

  // Debounce helpers for text inputs
  const saveTimeout = {};
  const debouncedSave = useCallback((field, value, delay = 500) => {
    clearTimeout(saveTimeout[field]);
    saveTimeout[field] = setTimeout(() => setDailyField(d, field, value), delay);
  }, [d]);

  const toggleCheck = (id) => {
    const n = { ...checks, [id]: !checks[id] };
    setChecks(n);
    setDailyField(d, 'checks', n);
  };

  const toggleMove = (id) => {
    const n = { ...moves, [id]: !moves[id] };
    setMoves(n);
    setDailyField(d, 'moves', n);
  };

  const updateActivity = (id, value) => {
    const n = { ...moves, [id]: value };
    setMoves(n);
    setDailyField(d, 'moves', n);
  };

  const toggleHide = (id) => {
    const n = { ...hidden, [id]: !hidden[id] };
    setHidden(n);
    setSetting('hidden', n);
  };

  const updateFood = (val) => {
    setFood(val);
    debouncedSave('food', val);
  };

  const updateJournal = (val) => {
    setJournal(val);
    debouncedSave('journal', val);
  };

  const updateSymptoms = (val) => {
    setSymptoms(val);
    setDailyField(d, 'symptoms', val);
  };

  const updateSupply = (val) => {
    setSupply(val);
    setSupplyStatuses(val);
  };

  const addWater = () => {
    const inc = 8; // Always add 8oz internally
    const n = water + inc;
    setWater(n);
    setDailyField(d, 'water', n);
  };

  const subWater = () => {
    const dec = 8;
    const n = Math.max(0, water - dec);
    setWater(n);
    setDailyField(d, 'water', n);
  };

  const handleSetStartDate = (val) => {
    setStartDate(val);
    setSetting('startDate', val);
  };

  const handleResetStartDate = () => {
    setStartDate(null);
    setSetting('startDate', null);
  };

  const saveUserRoutines = (routines) => {
    setUserRoutines(routines);
    setRoutines(routines);
  };

  const info = getPhaseInfo(startDate);
  const pm = PHASE_META.find(p => p.id === info.pid) || PHASE_META[0];
  const isPara = info.si === 2;

  // Merge parasite add-ons into their assigned time blocks during parasite phase
  // Filter out off-roster items from supply
  const isOffRoster = (id) => supply[id]?.offRoster === true;
  const activeItems = (b) => {
    const base = b.items.filter(it => it.phases.includes(info.pid) && !isOffRoster(it.id));
    if (isPara) {
      const paraForBlock = PARASITE_ADDS.filter(p => p.block === b.id && !isOffRoster(p.id));
      return [...base, ...paraForBlock];
    }
    return base;
  };
  const allActive = BLOCKS.flatMap(b => activeItems(b));
  const totalItems = allActive.filter(it => !hidden[it.id]).length;
  const checkedN = allActive.filter(it => checks[it.id] && !hidden[it.id]).length;
  const pct = totalItems > 0 ? Math.round((checkedN / totalItems) * 100) : 0;

  const theme = getTheme(settings.dark, pm);

  // Evaluate badges whenever relevant state changes
  useEffect(() => {
    if (!ready) return;
    const stats = {
      daysOnProtocol: info.td,
      currentPhase: info.pid,
      supplementStreak: streakStats.supplementStreak || 0,
      perfectStreak: streakStats.perfectStreak || 0,
      hydrationDays: streakStats.hydrationDays || 0,
      hydrationStreak: streakStats.hydrationStreak || 0,
      movementDays: streakStats.movementDays || 0,
      totalWorkouts: streakStats.totalWorkouts || 0,
      totalStretches: streakStats.totalStretches || 0,
      hasCheckedAnySupplement: checkedN > 0,
      hasPerfectDay: pct === 100,
      hasActiveWeek: streakStats.hasActiveWeek || false,
      hasProgressed: false,
      hasCustomRoutine: userRoutines.length > 0,
      hasPersonalRecord: false,
      maxProgressions: {},
    };
    const updated = evaluateBadges(stats, settings.earnedBadges);
    // Only save if something new was earned
    const newlyEarned = Object.keys(updated).some(
      k => updated[k].earned && !settings.earnedBadges?.[k]?.earned
    );
    if (newlyEarned) {
      settings.setEarnedBadges(updated);
    }
  }, [ready, checkedN, pct, info.td, info.pid, userRoutines.length, streakStats]);

  if (!ready) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui', color: '#999', background: theme.bg, minHeight: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 480, margin: '0 auto', minHeight: '100vh', color: theme.fg, background: theme.bg }}>
      <Header
        phaseInfo={{ ...info, pct }}
        startDate={startDate}
        onSetStartDate={handleSetStartDate}
        theme={theme}
      />
      <TabBar tab={tab} setTab={setTab} theme={theme} />

      {/* TODAY TAB */}
      {tab === 'today' && (
        <div style={{ paddingBottom: 24 }}>
          {/* Encouragement message */}
          {(() => {
            const msg = getEncouragement({
              daysOnProtocol: info.td,
              supplementStreak: streakStats.supplementStreak || 0,
              hasCheckedAnySupplement: checkedN > 0,
              hasPerfectDay: pct === 100,
            });
            return msg ? (
              <div style={{ padding: '4px 16px 4px', fontSize: 12, color: theme.pa, fontWeight: 500, fontStyle: 'italic' }}>
                {msg}
              </div>
            ) : null;
          })()}
          <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button
              onClick={() => { setFastingMode(!fastingMode); if (!fastingMode) setEditing(false); }}
              style={{
                fontSize: 11, fontWeight: 600,
                color: fastingMode ? '#ff9800' : theme.sub,
                padding: '4px 12px', borderRadius: 6,
                border: `1px solid ${fastingMode ? '#ff9800' : theme.cardBd}`,
                background: fastingMode ? (theme.dark ? '#2a1f0f' : '#fff3e0') : 'transparent',
              }}
            >
              {fastingMode ? 'Normal Mode' : 'Not Eating Today'}
            </button>
            {!fastingMode && (
              <button
                onClick={() => setEditing(!editing)}
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: editing ? '#e53935' : theme.pa,
                  padding: '4px 12px', borderRadius: 6,
                  border: `1px solid ${editing ? '#e53935' : theme.pa}`,
                }}
              >
                {editing ? 'Done Editing' : 'Edit List'}
              </button>
            )}
          </div>

          {editing && (
            <div style={{
              margin: '0 16px 8px', padding: '10px 14px', borderRadius: 10,
              background: theme.dark ? '#2a1a1a' : '#fef3f3',
              border: `1px solid ${theme.dark ? '#4a2a2a' : '#f0d0d0'}`,
              fontSize: 11, color: theme.dark ? '#ff8a80' : '#8b4545',
            }}>
              Tap {'\u2713'} to keep · Tap {'\u2715'} to hide from daily view. Hidden items won't appear until you re-enable them.
            </div>
          )}

          {fastingMode ? (
            <FastingMode
              allItems={allActive}
              checks={checks}
              hidden={hidden}
              onToggle={toggleCheck}
              theme={theme}
            />
          ) : (
            BLOCKS.map(block => (
              <TimeBlock
                key={block.id}
                block={block}
                items={activeItems(block)}
                checks={checks}
                hidden={hidden}
                editing={editing}
                hour={hour}
                onToggle={toggleCheck}
                onToggleHide={toggleHide}
                theme={theme}
              />
            ))
          )}

          <HydrationTracker
            water={water}
            onAdd={addWater}
            onSub={subWater}
            encouragement={getHydrationEncouragement(streakStats.hydrationDays || 0, streakStats.hydrationStreak || 0)}
            theme={theme}
          />
          <MovementChecklist
            moves={moves}
            activeMovements={settings.activeMovements}
            onToggle={toggleMove}
            onUpdateActivity={updateActivity}
            onUpdateActiveMovements={settings.setActiveMovements}
            encouragement={getMovementEncouragement(streakStats.movementDays || 0, streakStats.totalWorkouts || 0)}
            theme={theme}
          />
        </div>
      )}

      {/* LOG TAB */}
      {tab === 'log' && (
        <div style={{ paddingBottom: 24 }}>
          <FoodLog food={food} onUpdate={updateFood} date={d} theme={theme} />
          <Journal journal={journal} onUpdate={updateJournal} theme={theme} />
          <SymptomTracker symptoms={symptoms} onUpdate={updateSymptoms} theme={theme} />
        </div>
      )}

      {/* EXERCISE TAB */}
      {tab === 'exercise' && (
        <div style={{ padding: '8px 16px 24px' }}>
          <ExerciseTab
            userRoutines={userRoutines}
            onSaveRoutines={saveUserRoutines}
            date={d}
            theme={theme}
          />
        </div>
      )}

      {/* SUPPLY TAB */}
      {tab === 'supply' && (
        <SupplyTracker supply={supply} onUpdate={updateSupply} phaseId={info.pid} theme={theme} />
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <ProfileTab theme={theme} />
      )}

      {/* REFERENCE TAB */}
      {tab === 'ref' && (
        <div style={{ paddingBottom: 24 }}>
          <SpacingRules theme={theme} />
          <SymptomsGuide theme={theme} />
          <AnnualLabs theme={theme} startDate={startDate} onResetStart={handleResetStartDate} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    loadInitialData(today()).then(setInitial);
  }, []);

  if (!initial) return null;

  return (
    <SettingsProvider initial={initial}>
      <AppInner />
    </SettingsProvider>
  );
}
