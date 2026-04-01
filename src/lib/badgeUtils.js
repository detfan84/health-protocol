import { BADGES } from '../data/badges';

// Check which badges are earned based on current stats.
// Stats shape: { daysOnProtocol, currentPhase, supplementStreak, perfectStreak,
//   hydrationDays, hydrationStreak, movementDays, totalWorkouts, totalStretches,
//   hasCheckedAnySupplement, hasPerfectDay, hasActiveWeek, hasProgressed,
//   hasCustomRoutine, hasPersonalRecord, maxProgressions }
//
// Returns: { [badgeId]: { earned: true, date: '2026-...' } | { earned: false, progress: 0.5 } }

export function evaluateBadges(stats, earnedBadges = {}) {
  const results = {};

  for (const badge of BADGES) {
    // Already earned — keep it
    if (earnedBadges[badge.id]?.earned) {
      results[badge.id] = earnedBadges[badge.id];
      continue;
    }

    const c = badge.condition;
    let earned = false;
    let progress = 0;

    switch (c.type) {
      case 'first_check':
        earned = stats.hasCheckedAnySupplement;
        progress = earned ? 1 : 0;
        break;

      case 'days_on_protocol':
        earned = stats.daysOnProtocol >= c.threshold;
        progress = Math.min(1, stats.daysOnProtocol / c.threshold);
        break;

      case 'phase_complete':
        earned = stats.currentPhase > c.phase;
        progress = earned ? 1 : (stats.currentPhase === c.phase ? 0.5 : 0);
        break;

      case 'supplement_streak':
        earned = stats.supplementStreak >= c.threshold;
        progress = Math.min(1, stats.supplementStreak / c.threshold);
        break;

      case 'perfect_day':
        earned = stats.hasPerfectDay;
        progress = earned ? 1 : 0;
        break;

      case 'perfect_streak':
        earned = stats.perfectStreak >= c.threshold;
        progress = Math.min(1, stats.perfectStreak / c.threshold);
        break;

      case 'hydration_days':
        earned = stats.hydrationDays >= c.threshold;
        progress = Math.min(1, stats.hydrationDays / c.threshold);
        break;

      case 'hydration_streak':
        earned = stats.hydrationStreak >= c.threshold;
        progress = Math.min(1, stats.hydrationStreak / c.threshold);
        break;

      case 'movement_days':
        earned = stats.movementDays >= c.threshold;
        progress = Math.min(1, stats.movementDays / c.threshold);
        break;

      case 'active_week':
        earned = stats.hasActiveWeek;
        progress = earned ? 1 : 0;
        break;

      case 'total_workouts':
        earned = stats.totalWorkouts >= c.threshold;
        progress = Math.min(1, stats.totalWorkouts / c.threshold);
        break;

      case 'total_stretches':
        earned = stats.totalStretches >= c.threshold;
        progress = Math.min(1, stats.totalStretches / c.threshold);
        break;

      case 'any_progression':
        earned = stats.hasProgressed;
        progress = earned ? 1 : 0;
        break;

      case 'custom_routine':
        earned = stats.hasCustomRoutine;
        progress = earned ? 1 : 0;
        break;

      case 'personal_record':
        earned = stats.hasPersonalRecord;
        progress = earned ? 1 : 0;
        break;

      case 'max_progression':
        earned = stats.maxProgressions?.[c.exerciseId] || false;
        progress = earned ? 1 : 0;
        break;

      case 'phase_veteran':
        earned = stats.phaseVeteran?.[c.phase] || false;
        progress = earned ? 1 : 0;
        break;

      default:
        progress = 0;
    }

    if (earned) {
      results[badge.id] = { earned: true, date: new Date().toISOString().slice(0, 10) };
    } else {
      results[badge.id] = { earned: false, progress };
    }
  }

  return results;
}

// Generate a contextual encouragement message based on stats
export function getEncouragement(stats) {
  const messages = [];

  if (stats.supplementStreak >= 30) {
    messages.push(`${stats.supplementStreak}-day streak. You're unstoppable.`);
  } else if (stats.supplementStreak >= 7) {
    messages.push(`${stats.supplementStreak}-day streak. Keep it going.`);
  } else if (stats.supplementStreak >= 3) {
    messages.push(`${stats.supplementStreak} days in a row. Building momentum.`);
  }

  if (stats.daysOnProtocol === 1) {
    messages.push('Day 1. Every journey starts here.');
  } else if (stats.daysOnProtocol === 7) {
    messages.push('One week down. You\'re doing this.');
  } else if (stats.daysOnProtocol === 30) {
    messages.push('30 days. The hardest part is behind you.');
  } else if (stats.daysOnProtocol === 100) {
    messages.push('100 days. You\'ve built something real.');
  }

  if (stats.hasPerfectDay) {
    messages.push('Perfect day yesterday. Can you do it again?');
  }

  return messages.length > 0 ? messages[0] : null;
}

// Generate hydration encouragement
export function getHydrationEncouragement(hydrationDays, hydrationStreak) {
  if (hydrationStreak >= 7) return `${hydrationStreak}-day hydration streak. Your body thanks you.`;
  if (hydrationDays >= 10) return `You've hit your target ${hydrationDays} times. Consistency wins.`;
  return null;
}

// Generate movement encouragement
export function getMovementEncouragement(movementDays, totalWorkouts) {
  if (totalWorkouts >= 10) return `${totalWorkouts} workouts logged. Consistency > intensity.`;
  if (movementDays >= 5) return `Active ${movementDays} days. Your body is adapting.`;
  return null;
}
