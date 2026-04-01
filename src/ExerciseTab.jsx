import { useState, useEffect } from 'react';
import { getWorkout, setWorkout } from './lib/db';
import { ROUTINE_TEMPLATES } from './data/routines';

import RoutineList from './components/exercise/RoutineList';
import RoutineView from './components/exercise/RoutineView';
import WorkoutLogger from './components/exercise/WorkoutLogger';
import ExerciseBrowser from './components/exercise/ExerciseBrowser';
import ProgressChart from './components/exercise/ProgressChart';

export default function ExerciseTab({ userRoutines, onSaveRoutines, date, theme }) {
  const [view, setView] = useState('list'); // list | edit | log | browse | progress
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [workout, setWorkoutState] = useState(null);
  const { fg, sub, pa, cardBd } = theme;

  useEffect(() => {
    getWorkout(date).then(w => setWorkoutState(w || {}));
  }, [date]);

  const handleCreateFromTemplate = (template, difficulty) => {
    const variant = template.variants[difficulty];
    const routine = {
      id: `${template.id}-${difficulty}-${Date.now()}`,
      name: `${template.name} (${difficulty})`,
      basedOn: template.id,
      difficulty,
      exercises: variant.map(e => ({ ...e })),
    };
    setActiveRoutine(routine);
    setView('edit');
  };

  const handleCreateNew = () => {
    setActiveRoutine({
      id: `custom-${Date.now()}`,
      name: 'New Routine',
      exercises: [],
    });
    setView('edit');
  };

  const handleSaveRoutine = (routine) => {
    const idx = userRoutines.findIndex(r => r.id === routine.id);
    const updated = idx >= 0
      ? userRoutines.map((r, i) => i === idx ? routine : r)
      : [...userRoutines, routine];
    onSaveRoutines(updated);
    setView('list');
  };

  const handleDeleteRoutine = (routine) => {
    onSaveRoutines(userRoutines.filter(r => r.id !== routine.id));
    setView('list');
  };

  const handleStartWorkout = (routine) => {
    setActiveRoutine(routine);
    setView('log');
  };

  const handleSaveWorkout = (logData) => {
    setWorkoutState(logData);
    setWorkout(date, logData);
  };

  // Sub-navigation tabs
  const subTabs = [
    { id: 'list', label: 'Routines' },
    { id: 'browse', label: 'Browse' },
    { id: 'progress', label: 'Progress' },
  ];

  if (view === 'edit' && activeRoutine) {
    return (
      <RoutineView
        routine={activeRoutine}
        onSave={handleSaveRoutine}
        onDelete={userRoutines.find(r => r.id === activeRoutine.id) ? handleDeleteRoutine : null}
        onBack={() => setView('list')}
        theme={theme}
      />
    );
  }

  if (view === 'log' && activeRoutine) {
    return (
      <WorkoutLogger
        routine={activeRoutine}
        workout={workout}
        onSave={handleSaveWorkout}
        onBack={() => setView('list')}
        theme={theme}
      />
    );
  }

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${view === t.id ? pa : cardBd}`,
              background: view === t.id ? (theme.dark ? '#2a2a3a' : '#e8eaf6') : 'transparent',
              color: view === t.id ? pa : sub,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <RoutineList
          userRoutines={userRoutines}
          onSelect={handleStartWorkout}
          onCreateFromTemplate={handleCreateFromTemplate}
          onCreateNew={handleCreateNew}
          theme={theme}
        />
      )}

      {view === 'browse' && (
        <ExerciseBrowser theme={theme} />
      )}

      {view === 'progress' && (
        <ProgressChart theme={theme} />
      )}
    </div>
  );
}
