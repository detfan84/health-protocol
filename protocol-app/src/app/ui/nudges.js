// nudges.js — the browser wiring for in-app reminders (R24): the nudge
// engine, plugged into this device's clock, screen state and notification
// tray. The engine itself is src/app/nudge.js and knows nothing about the
// DOM; everything here is the part only a real browser can answer.
//
// The Android facts this file is built on, because the old push memo was
// written for an iPhone and Kevin is not on one:
//   - `new Notification()` THROWS on Android Chrome. The only working path is
//     the service worker registration's showNotification(), which is why the
//     system path waits on serviceWorker.ready.
//   - A plain tab can show notifications — no install, no server. What no web
//     app anywhere can do is schedule one for later (R19: Notification
//     Triggers is abandoned, Web Push has no deliver-at) — so these fire from
//     a live timer, which is exactly the "while open" boundary the copy
//     states.
//
// Two opt-ins, deliberately separate: the schedule's own `enabled` travels
// with a backup because it is the person's plan; the notification toggle here
// is per-device state living next to a per-device browser permission. A
// restored backup on a new phone must not imply a permission nobody granted
// there.

import * as store from '../store.js';
import { createNudger } from '../nudge.js';
import { REMINDERS_KEY, KINDS } from '../../lib/reminders.js';
import { hhmm } from '../todayModel.js';
import { announceNudge } from './announcer.js';

export const NUDGE_KEY = 'nudge.device';

/**
 * What this browser will actually do, as one word the card can show:
 * 'unsupported' | 'blocked' | 'on' | 'off'. Three-state honesty (D24): the
 * difference between "you said no here" and "the browser said no" is the
 * difference between a toggle and a trip to site settings.
 */
export function notificationState(setting) {
  if (typeof Notification === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted' && setting?.value === true) return 'on';
  return 'off';
}

/** May the system path speak right now? Permission AND the device toggle. */
async function canNotify() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const s = await store.getSetting(NUDGE_KEY).catch(() => null);
  return s?.value === true;
}

/** One notification through the tray, the way Android requires it. */
async function systemNotification({ at, label, kind, id }) {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(label ?? KINDS[kind]?.label ?? 'Reminder', {
    // The same admission the calendar file carries: a time, not your day.
    body: `${at} — a time you set in Shoes of Peace. It knows the clock only; open the app to see what is actually due.`,
    // One tag per reminder+minute: a resync that fires twice collapses to one.
    tag: `nudge-${id ?? kind}-${at}`,
    icon: './src/icons/icon-192.png',
    badge: './src/icons/icon-192.png',
  });
}

/**
 * The proof button on the Reminders card. A settings screen that says "on"
 * and can show nothing is a claim; a notification in the tray ten seconds
 * after the tap is a fact — and this is the fact Kevin actually needs on his
 * own phone before any schedule matters.
 */
export async function testNudge() {
  await systemNotification({
    at: hhmm(),
    label: 'This is what a reminder here looks like',
    kind: 'other',
  });
}

/* ------------------------------ the loop ------------------------------ */

let live = null;

/**
 * Start the engine on this device. Called once by app.js after the
 * disclaimer gate — a re-run of init() (theme change, acceptance) finds it
 * already running and leaves it alone.
 */
export function startNudges() {
  if (live || typeof document === 'undefined') return;
  live = createNudger({
    load: () => store.getSetting(REMINDERS_KEY),
    visible: () => document.visibilityState === 'visible',
    banner: (fire) => announceNudge(fire, KINDS),
    notify: systemNotification,
    canNotify,
  });
  // Coming back to the front is the moment throttled timers are worth
  // correcting — and the moment a stale target must be dropped, not fired.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') live?.resync();
  });
  live.start();
}

/** The schedule was edited — walk to the right next firing, now. */
export function resyncNudges() {
  live?.resync();
}

/* Test hook: forget the engine so a fresh document gets a fresh one. */
export function _resetForTests() {
  live?.stop();
  live = null;
}
