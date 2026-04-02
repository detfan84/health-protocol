import { BLOCKS, PARASITE_ADDS } from '../data/blocks';
import { getPhaseInfo } from './phaseUtils';

// Get all active supplement IDs for a given date, respecting phase + hidden + supply
function getActiveItemIds(startDate, dateStr, hidden, supply) {
  const info = getPhaseInfo(startDate, dateStr);
  const isPara = info.si === 2;

  const items = [];
  for (const block of BLOCKS) {
    const base = block.items.filter(it => it.phases.includes(info.pid));
    if (isPara) {
      const paraForBlock = PARASITE_ADDS.filter(p => p.block === block.id);
      base.push(...paraForBlock);
    }
    items.push(...base);
  }

  // Filter out hidden and out-of-stock items (grace for supply issues)
  return items.filter(it => {
    if (hidden[it.id]) return false;
    const supplyInfo = supply[it.id];
    if (supplyInfo?.status === 'Out') return false;
    if (supplyInfo?.offRoster) return false;
    return true;
  }).map(it => it.id);
}

// Format date as YYYY-MM-DD in local time (not UTC)
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get date N days before today
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Compute all streak/aggregate stats from daily history
// dailyRecords: { 'YYYY-MM-DD': { checks, water, moves, ... } }
// workouts: [{ date, data }]
// options: { startDate, hidden, supply, hydrationTarget }
export function computeStreaks(dailyRecords, workouts, options) {
  const { startDate, hidden = {}, supply = {}, hydrationTarget = 100 } = options;

  if (!startDate) {
    return emptyStats();
  }

  let supplementStreak = 0;
  let perfectStreak = 0;
  let hydrationStreak = 0;
  let hydrationDays = 0;
  let movementDays = 0;

  // Walk backwards from yesterday (today is still in progress)
  const yesterday = daysAgo(1);
  let streakBroken = false;
  let hydStreakBroken = false;

  // Check up to 400 days back (more than enough for any streak)
  for (let i = 1; i <= 400; i++) {
    const d = daysAgo(i);
    const dateStr = formatDate(d);

    // Don't go before start date
    if (dateStr < startDate) break;

    const record = dailyRecords[dateStr];
    if (!record) {
      // No record = missed day
      streakBroken = true;
      hydStreakBroken = true;
      continue;
    }

    const checks = record.checks || {};
    const water = record.water || 0;
    const moves = record.moves || {};

    // Supplement completion for this day
    const activeIds = getActiveItemIds(startDate, dateStr, hidden, supply);
    const checkedCount = activeIds.filter(id => checks[id]).length;
    const totalCount = activeIds.length;
    const dayPerfect = totalCount > 0 && checkedCount === totalCount;

    // Supplement streak (consecutive 100% days)
    if (!streakBroken) {
      if (dayPerfect) {
        supplementStreak++;
        perfectStreak++;
      } else {
        streakBroken = true;
      }
    }

    // Hydration
    if (water >= hydrationTarget) {
      hydrationDays++;
      if (!hydStreakBroken) {
        hydrationStreak++;
      }
    } else {
      hydStreakBroken = true;
    }

    // Movement (at least one movement checked)
    const hasMovement = Object.values(moves).some(v => v === true || (typeof v === 'object' && v));
    if (hasMovement) {
      movementDays++;
    }
  }

  // Check if today also counts (for supplement streak extension)
  // Today's partial progress can extend streak if already complete
  const todayStr = formatDate(new Date());
  const todayRecord = dailyRecords[todayStr];
  if (todayRecord && !streakBroken) {
    const todayActive = getActiveItemIds(startDate, todayStr, hidden, supply);
    const todayChecked = todayActive.filter(id => (todayRecord.checks || {})[id]).length;
    if (todayActive.length > 0 && todayChecked === todayActive.length) {
      supplementStreak++;
      perfectStreak++;
    }
  }
  if (todayRecord && !hydStreakBroken) {
    if ((todayRecord.water || 0) >= hydrationTarget) {
      hydrationStreak++;
      hydrationDays++;
    }
  }
  if (todayRecord) {
    const todayMoves = todayRecord.moves || {};
    const hasTodayMovement = Object.values(todayMoves).some(v => v === true || (typeof v === 'object' && v));
    if (hasTodayMovement) movementDays++;
  }

  // Active week: 5+ movement days in last 7
  let recentMoveDays = 0;
  for (let i = 0; i < 7; i++) {
    const dateStr = formatDate(daysAgo(i));
    const record = dailyRecords[dateStr];
    if (record?.moves) {
      const hasMov = Object.values(record.moves).some(v => v === true || (typeof v === 'object' && v));
      if (hasMov) recentMoveDays++;
    }
  }

  // Workout totals
  let totalWorkouts = 0;
  let totalStretches = 0;
  for (const w of workouts) {
    if (w.data?.exercises?.length > 0) {
      totalWorkouts++;
      // Check if it's a stretch/mobility routine
      if (w.data.routineName?.toLowerCase().includes('stretch') ||
          w.data.routineName?.toLowerCase().includes('mobility') ||
          w.data.routineName?.toLowerCase().includes('wind-down')) {
        totalStretches++;
      }
    }
  }

  return {
    supplementStreak,
    perfectStreak,
    hydrationDays,
    hydrationStreak,
    movementDays,
    totalWorkouts,
    totalStretches,
    hasActiveWeek: recentMoveDays >= 5,
  };
}

function emptyStats() {
  return {
    supplementStreak: 0,
    perfectStreak: 0,
    hydrationDays: 0,
    hydrationStreak: 0,
    movementDays: 0,
    totalWorkouts: 0,
    totalStretches: 0,
    hasActiveWeek: false,
  };
}
