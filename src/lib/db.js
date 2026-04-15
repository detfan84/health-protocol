import { openDB } from 'idb';

const DB_NAME = 'protocol-db';
const DB_VERSION = 2;

let dbPromise;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('daily')) {
          db.createObjectStore('daily');
        }
        if (!db.objectStoreNames.contains('supply')) {
          db.createObjectStore('supply');
        }
        if (!db.objectStoreNames.contains('routines')) {
          db.createObjectStore('routines');
        }
        if (!db.objectStoreNames.contains('workouts')) {
          db.createObjectStore('workouts');
        }
        if (!db.objectStoreNames.contains('bodylog')) {
          db.createObjectStore('bodylog');
        }
      },
    });
  }
  return dbPromise;
}

// --- Settings store (persistent key-value) ---

export async function getSetting(key) {
  const db = await getDB();
  return db.get('settings', key);
}

export async function setSetting(key, value) {
  const db = await getDB();
  return db.put('settings', value, key);
}

// --- Daily store (keyed by date string "YYYY-MM-DD") ---

export async function getDaily(date) {
  const db = await getDB();
  return db.get('daily', date);
}

export async function setDaily(date, data) {
  const db = await getDB();
  return db.put('daily', data, date);
}

export async function getDailyField(date, field) {
  const data = await getDaily(date) || {};
  return data[field];
}

export async function setDailyField(date, field, value) {
  const data = await getDaily(date) || {};
  data[field] = value;
  return setDaily(date, data);
}

// --- Supply store ---

export async function getSupplyStatuses() {
  const db = await getDB();
  return (await db.get('supply', 'statuses')) || {};
}

export async function setSupplyStatuses(statuses) {
  const db = await getDB();
  return db.put('supply', statuses, 'statuses');
}

// --- Routines store (user-customized routines) ---

export async function getRoutines() {
  const db = await getDB();
  return (await db.get('routines', 'userRoutines')) || [];
}

export async function setRoutines(routines) {
  const db = await getDB();
  return db.put('routines', routines, 'userRoutines');
}

// --- Workouts store (keyed by date) ---

export async function getWorkout(date) {
  const db = await getDB();
  return db.get('workouts', date);
}

export async function setWorkout(date, data) {
  const db = await getDB();
  return db.put('workouts', data, date);
}

export async function getAllWorkouts() {
  const db = await getDB();
  const keys = await db.getAllKeys('workouts');
  const entries = [];
  for (const key of keys) {
    entries.push({ date: key, data: await db.get('workouts', key) });
  }
  return entries;
}

// --- Body log store (weight/body metrics by date) ---

export async function getBodyLog(date) {
  const db = await getDB();
  return db.get('bodylog', date);
}

export async function setBodyLog(date, data) {
  const db = await getDB();
  return db.put('bodylog', data, date);
}

export async function getAllBodyLogs() {
  const db = await getDB();
  const keys = await db.getAllKeys('bodylog');
  const entries = [];
  for (const key of keys) {
    entries.push({ date: key, ...(await db.get('bodylog', key)) });
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

// --- Daily store: get all records (for streak computation) ---

export async function getAllDailyRecords() {
  const db = await getDB();
  const keys = await db.getAllKeys('daily');
  const entries = {};
  for (const key of keys) {
    entries[key] = await db.get('daily', key);
  }
  return entries;
}

// --- Bulk load for app init ---

export async function loadInitialData(dateStr) {
  const [
    startDate, phaseOffset, subphaseDurations, dark, unitSystem, hydrationTarget, bodyWeight,
    hidden, userSupplements, equipment, notificationPrefs, profile, earnedBadges, workoutSchedule, activeMovements,
    dailyData, supplyStatuses, userRoutines,
  ] = await Promise.all([
    getSetting('startDate'),
    getSetting('phaseOffset'),
    getSetting('subphaseDurations'),
    getSetting('dark'),
    getSetting('unitSystem'),
    getSetting('hydrationTarget'),
    getSetting('bodyWeight'),
    getSetting('hidden'),
    getSetting('userSupplements'),
    getSetting('equipment'),
    getSetting('notificationPrefs'),
    getSetting('profile'),
    getSetting('earnedBadges'),
    getSetting('workoutSchedule'),
    getSetting('activeMovements'),
    getDaily(dateStr),
    getSupplyStatuses(),
    getRoutines(),
  ]);

  return {
    startDate: startDate || null,
    phaseOffset: phaseOffset || 0,
    subphaseDurations: subphaseDurations || {},
    dark: dark || false,
    unitSystem: unitSystem || 'imperial',
    hydrationTarget: hydrationTarget || 100,
    bodyWeight: bodyWeight || null,
    hidden: hidden || {},
    userSupplements: userSupplements || [],
    equipment: equipment || ['bodyweight'],
    notificationPrefs: notificationPrefs || {},
    profile: profile || { gender: '', height: '', bodyFatPct: '' },
    earnedBadges: earnedBadges || {},
    workoutSchedule: workoutSchedule || { days: [], time: '09:00', reminders: false },
    activeMovements: activeMovements || null,
    daily: dailyData || {},
    supplyStatuses,
    userRoutines,
  };
}
