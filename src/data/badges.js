// Badge definitions. Each badge has an id, name, description, category, icon,
// and an unlock condition described by type + threshold.
// The unlock logic lives in lib/badgeUtils.js — this is just the catalog.

export const BADGE_CATEGORIES = [
  { id: 'protocol', name: 'Protocol' },
  { id: 'consistency', name: 'Consistency' },
  { id: 'hydration', name: 'Hydration' },
  { id: 'movement', name: 'Movement' },
  { id: 'exercise', name: 'Exercise' },
];

export const BADGES = [
  // --- Protocol ---
  { id: 'first-day', name: 'First Day', description: 'Check off your first supplement', category: 'protocol', icon: '\uD83C\uDF31', condition: { type: 'first_check' } },
  { id: 'first-week', name: 'First Week', description: '7 days on protocol', category: 'protocol', icon: '\uD83D\uDCC5', condition: { type: 'days_on_protocol', threshold: 7 } },
  { id: 'phase-pioneer', name: 'Phase Pioneer', description: 'Complete Phase 1', category: 'protocol', icon: '\uD83D\uDEE1\uFE0F', condition: { type: 'phase_complete', phase: 1 } },
  { id: 'deep-clean', name: 'Deep Clean', description: 'Complete Phase 2', category: 'protocol', icon: '\uD83E\uDDFD', condition: { type: 'phase_complete', phase: 2 } },
  { id: 'optimized', name: 'Optimized', description: 'Complete Phase 3', category: 'protocol', icon: '\u26A1', condition: { type: 'phase_complete', phase: 3 } },
  { id: 'lifer', name: 'Lifer', description: 'Reach Phase 4 — Lifelong Maintenance', category: 'protocol', icon: '\uD83C\uDFC6', condition: { type: 'phase_complete', phase: 3 } },
  { id: 'year-one', name: 'Year One', description: '1 year on protocol', category: 'protocol', icon: '\uD83C\uDF89', condition: { type: 'days_on_protocol', threshold: 365 } },
  { id: 'two-year-club', name: 'Two Year Club', description: 'Still going at 2 years', category: 'protocol', icon: '\uD83D\uDC8E', condition: { type: 'days_on_protocol', threshold: 730 } },

  // --- Consistency (supplement streaks) ---
  { id: 'streak-7', name: '7-Day Streak', description: '7 consecutive days at 80%+ supplements', category: 'consistency', icon: '\uD83D\uDD25', condition: { type: 'supplement_streak', threshold: 7 } },
  { id: 'iron-will', name: 'Iron Will', description: '30-day supplement streak', category: 'consistency', icon: '\uD83D\uDCAA', condition: { type: 'supplement_streak', threshold: 30 } },
  { id: 'unbreakable', name: 'Unbreakable', description: '90-day supplement streak', category: 'consistency', icon: '\uD83E\uDDF1', condition: { type: 'supplement_streak', threshold: 90 } },
  { id: 'half-year', name: 'Half Year', description: '180-day supplement streak', category: 'consistency', icon: '\u2B50', condition: { type: 'supplement_streak', threshold: 180 } },
  { id: 'streak-365', name: '365-Day Streak', description: 'Full year of consistency — legendary', category: 'consistency', icon: '\uD83D\uDC51', condition: { type: 'supplement_streak', threshold: 365 } },
  { id: 'perfect-day', name: 'Perfect Day', description: '100% supplements checked off in a day', category: 'consistency', icon: '\u2705', condition: { type: 'perfect_day', threshold: 1 } },
  { id: 'perfect-week', name: 'Perfect Week', description: '100% supplements 7 days straight', category: 'consistency', icon: '\uD83C\uDF1F', condition: { type: 'perfect_streak', threshold: 7 } },

  // --- Hydration ---
  { id: 'hydrated', name: 'Hydrated', description: 'Hit your hydration target for the first time', category: 'hydration', icon: '\uD83D\uDCA7', condition: { type: 'hydration_days', threshold: 1 } },
  { id: 'water-warrior', name: 'Water Warrior', description: 'Hit hydration target 7 days in a row', category: 'hydration', icon: '\uD83C\uDF0A', condition: { type: 'hydration_streak', threshold: 7 } },
  { id: 'century-club', name: 'Century Club', description: 'Hit hydration target 100 total days', category: 'hydration', icon: '\uD83C\uDFCA', condition: { type: 'hydration_days', threshold: 100 } },
  { id: 'hydration-master', name: 'Hydration Master', description: 'Hit hydration target 365 total days', category: 'hydration', icon: '\uD83C\uDF0D', condition: { type: 'hydration_days', threshold: 365 } },

  // --- Movement ---
  { id: 'first-move', name: 'First Move', description: 'Log any movement activity', category: 'movement', icon: '\uD83D\uDEB6', condition: { type: 'movement_days', threshold: 1 } },
  { id: 'active-week', name: 'Active Week', description: 'Move 5+ days in a week', category: 'movement', icon: '\uD83C\uDFC3', condition: { type: 'active_week' } },
  { id: 'workout-20', name: 'Workout Warrior', description: 'Log 20 workouts', category: 'movement', icon: '\uD83C\uDFCB\uFE0F', condition: { type: 'total_workouts', threshold: 20 } },
  { id: 'workout-50', name: '50 Workouts', description: 'Half a hundred logged workouts', category: 'movement', icon: '\uD83E\uDD4A', condition: { type: 'total_workouts', threshold: 50 } },
  { id: 'workout-100', name: '100 Workouts', description: 'Triple digits — elite consistency', category: 'movement', icon: '\uD83E\uDD47', condition: { type: 'total_workouts', threshold: 100 } },
  { id: 'stretch-master', name: 'Stretch Master', description: 'Complete 10 stretch routines', category: 'movement', icon: '\uD83E\uDDD8', condition: { type: 'total_stretches', threshold: 10 } },
  { id: 'marathon-mover', name: 'Marathon Mover', description: 'Log movement 365 total days', category: 'movement', icon: '\uD83C\uDFC5', condition: { type: 'movement_days', threshold: 365 } },

  // --- Exercise ---
  { id: 'level-up', name: 'Level Up', description: 'Progress any exercise to the next level', category: 'exercise', icon: '\u2B06\uFE0F', condition: { type: 'any_progression' } },
  { id: 'routine-builder', name: 'Routine Builder', description: 'Create a custom routine', category: 'exercise', icon: '\uD83D\uDCCB', condition: { type: 'custom_routine' } },
  { id: 'pr-breaker', name: 'PR Breaker', description: 'Set a new personal record on any exercise', category: 'exercise', icon: '\uD83D\uDCC8', condition: { type: 'personal_record' } },
  { id: 'pistol-squat', name: 'Pistol Squat', description: 'Reach max progression on pistol squat', category: 'exercise', icon: '\uD83E\uDDB5', condition: { type: 'max_progression', exerciseId: 'pistol-squat' } },
  { id: 'phase1-veteran', name: 'Phase 1 Veteran', description: 'Complete Phase 1 with 90%+ daily average', category: 'exercise', icon: '\uD83C\uDF96\uFE0F', condition: { type: 'phase_veteran', phase: 1 } },
];
