import { createContext, useContext, useState, useCallback } from 'react';
import { setSetting } from '../lib/db';

const SettingsContext = createContext();

export function SettingsProvider({ initial, children }) {
  const [dark, setDarkState] = useState(initial.dark);
  const [unitSystem, setUnitSystemState] = useState(initial.unitSystem);
  const [hydrationTarget, setHydrationTargetState] = useState(initial.hydrationTarget);
  const [bodyWeight, setBodyWeightState] = useState(initial.bodyWeight);
  const [equipment, setEquipmentState] = useState(initial.equipment);
  const [notificationPrefs, setNotificationPrefsState] = useState(initial.notificationPrefs);
  const [profile, setProfileState] = useState(initial.profile);
  const [earnedBadges, setEarnedBadgesState] = useState(initial.earnedBadges);
  const [workoutSchedule, setWorkoutScheduleState] = useState(initial.workoutSchedule);
  const [activeMovements, setActiveMovementsState] = useState(initial.activeMovements);

  const setDark = useCallback((v) => {
    setDarkState(v);
    setSetting('dark', v);
  }, []);

  const setUnitSystem = useCallback((v) => {
    setUnitSystemState(v);
    setSetting('unitSystem', v);
  }, []);

  const setHydrationTarget = useCallback((v) => {
    setHydrationTargetState(v);
    setSetting('hydrationTarget', v);
  }, []);

  const setBodyWeight = useCallback((v) => {
    setBodyWeightState(v);
    setSetting('bodyWeight', v);
  }, []);

  const setEquipment = useCallback((v) => {
    setEquipmentState(v);
    setSetting('equipment', v);
  }, []);

  const setNotificationPrefs = useCallback((v) => {
    setNotificationPrefsState(v);
    setSetting('notificationPrefs', v);
  }, []);

  const setProfile = useCallback((v) => {
    setProfileState(v);
    setSetting('profile', v);
  }, []);

  const setEarnedBadges = useCallback((v) => {
    setEarnedBadgesState(v);
    setSetting('earnedBadges', v);
  }, []);

  const setWorkoutSchedule = useCallback((v) => {
    setWorkoutScheduleState(v);
    setSetting('workoutSchedule', v);
  }, []);

  const setActiveMovements = useCallback((v) => {
    setActiveMovementsState(v);
    setSetting('activeMovements', v);
  }, []);

  return (
    <SettingsContext.Provider value={{
      dark, setDark,
      unitSystem, setUnitSystem,
      hydrationTarget, setHydrationTarget,
      bodyWeight, setBodyWeight,
      equipment, setEquipment,
      notificationPrefs, setNotificationPrefs,
      profile, setProfile,
      earnedBadges, setEarnedBadges,
      workoutSchedule, setWorkoutSchedule,
      activeMovements, setActiveMovements,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
