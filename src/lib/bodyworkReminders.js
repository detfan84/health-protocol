// Morning and evening reminders for the body work view.
//
// Two rules carried over from the prototype's tracking ethos:
//
//   * Informational, never scolding. These say what is due and what is
//     worth checking. They do not count streaks, do not report misses as
//     failures, and never imply a day was wasted.
//   * The 48-hour look-back is the one that actually matters. Delayed
//     soreness is the real risk with the eccentric and contract–relax
//     work, so if a look-back is pending it leads the evening reminder.
//
// LIMITATION: these are setTimeout timers, so they only fire while the app
// is open. Same as the existing block and workout reminders. Real
// background delivery needs the Push API and a server to push from, which
// this app deliberately does not have — everything stays on the device.

import { ALL_CARDS, EVERY, FLARE, NAME_BY_ID } from '../data/bodywork.js';
import { lastSession, daysBetween, today } from './bodyworkUtils.js';
import { fireNotification } from './notifications.js';

let timers = [];

export const DEFAULT_PREFS = {
  enabled: false,
  morning: '08:00',
  evening: '20:00',
};

/* Cards whose own interval has come round. Not "overdue" — due. */
export function dueToday(log) {
  return ALL_CARDS.filter(c => {
    const last = lastSession(log, c.id);
    if (!last) return true;
    return daysBetween(last, today()) >= (EVERY[c.id] || 3);
  });
}

/* Flare cards logged 1–2 days ago: the window where delayed soreness shows. */
export function pendingLookBacks(log) {
  return FLARE.filter(id => {
    const last = lastSession(log, id);
    if (!last) return false;
    const d = daysBetween(last, today());
    return d === 1 || d === 2;
  });
}

const names = (ids, max = 3) => {
  const list = ids.slice(0, max).map(id => NAME_BY_ID[id] || id);
  const rest = ids.length - list.length;
  return list.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
};

export function morningBody(log) {
  const due = dueToday(log);
  if (!due.length) return 'Nothing is due today. A squat hang and nasal breathing are always fair game.';
  const daily = due.filter(c => (EVERY[c.id] || 3) === 1);
  const lead = daily.length ? daily : due;
  return `${due.length} due today — ${names(lead.map(c => c.id))}.`;
}

export function eveningBody(log) {
  const look = pendingLookBacks(log);
  if (look.length) {
    // This leads, because it is the safety one.
    return `How did today feel after ${names(look, 2)}? Delayed soreness shows in this window — note it before adding volume.`;
  }
  const checkedInToday = log.checkins.some(c => c.d === today());
  if (!checkedInToday) return 'A line about how the body felt today, while you still remember it.';
  const done = new Set(log.sessions.filter(s => s.d === today()).map(s => s.id));
  if (!done.size) return 'Nothing logged today. The breathing work takes five minutes lying down.';
  return `${done.size} logged today. Anything worth adding to the check-in?`;
}

function msUntil(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  // If the time has passed, aim at tomorrow rather than skipping the day.
  if (target <= new Date()) target.setDate(target.getDate() + 1);
  return target.getTime() - Date.now();
}

export function cancelBodyWorkReminders() {
  timers.forEach(clearTimeout);
  timers = [];
}

/* `getLog` is a function, not a value, so the notification body is built
   from state at fire time rather than at schedule time — otherwise an
   app left open all day would announce this morning's list tonight. */
export function scheduleBodyWorkReminders(getLog, prefs) {
  cancelBodyWorkReminders();
  if (!prefs?.enabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const plan = [
    ['morning', prefs.morning || DEFAULT_PREFS.morning, 'Body work', morningBody],
    ['evening', prefs.evening || DEFAULT_PREFS.evening, 'Body work — evening', eveningBody],
  ];

  for (const [slot, time, title, build] of plan) {
    if (!time) continue;
    const fire = () => {
      Promise.resolve(getLog()).then(log => {
        if (log) fireNotification(title, build(log), `bodywork-${slot}`);
      });
      // Re-arm for the same time tomorrow if the app is still open.
      timers.push(setTimeout(fire, 24 * 60 * 60 * 1000));
    };
    timers.push(setTimeout(fire, msUntil(time)));
  }
}
