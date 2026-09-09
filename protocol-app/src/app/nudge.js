// nudge.js — the engine behind in-app reminders (R24): one loop reading the
// schedule that already exists, walking to the next firing, and handing it to
// whatever delivery the moment calls for.
//
// What "the app can nudge you" means on a phone is the honest boundary of the
// feature, so it is stated here once: this engine runs while the app is OPEN —
// in front, or a background tab with the screen off. Browsers throttle a
// background tab's timers to whole minutes, which is fine for reminders; a
// tab that is fully closed runs nothing, and the calendar export is the path
// that still works there. The Reminders card says exactly this to the person.
//
// Everything time-shaped is computed by lib/reminders.js (nextFire, on top of
// the same expandTimes the calendar file uses), so the two delivery paths can
// never disagree about when something happens. This file owns only the
// walking: arm a timer, look at the clock on wake, deliver or step forward.
//
// Composed at fire time — the one thing no closed-app path can do. The
// schedule is re-read at the moment of delivery, so a reminder switched off
// or deleted an hour ago stays silent. What it still cannot know is whether
// the thing is DONE: schedule rows are times with labels, not items (R19's
// standing note), so the words never claim more than the clock.
//
// Every dependency is injected so the engine tests in Node with a fake clock.
// The browser wiring lives in ui/nudges.js.

import { normalizeReminders, nextFire } from '../lib/reminders.js';
import { localDateKey } from '../lib/core.js';
import { hhmm } from './todayModel.js';

// Fired late is worse than not fired: a posture check ten minutes behind is
// still a posture check; "part of the day" two hours behind is noise about a
// day that has moved on. Past this line the moment is skipped, not delivered
// stale — Home already tells the truth about what was missed.
export const GRACE_MS = 10 * 60 * 1000;

// Never trust one long sleep. A background tab's timers are throttled, and a
// pocketed phone or a closed laptop lid can suspend them outright — so the
// engine hops: wake at most this far out, look at the clock, re-arm. Every
// hop re-reads the schedule too, so an edit made in another tab is picked up
// within the hop even if nobody calls resync.
export const MAX_HOP_MS = 30 * 60 * 1000;

/**
 * createNudger({ load, visible, banner, notify, canNotify, now?, setTimer?,
 * clearTimer? }) → { start, stop, resync }
 *
 *   load()      → the stored reminders record (raw; normalized here)
 *   visible()   → is the app on screen right now?
 *   banner(f)   → deliver f = { at, id, kind, label? } on screen
 *   notify(f)   → deliver f as a system notification (may be async)
 *   canNotify() → may we use the system path? (may be async)
 *
 * Delivery is chosen at fire time: on screen gets the banner — a system
 * notification for a page you are already looking at is noise — and in the
 * background gets the notification, permission allowing. Hidden with no
 * permission gets nothing: there is no honest way to reach a person who has
 * not said yes to being reached.
 */
export function createNudger({
  load,
  visible,
  banner,
  notify,
  canNotify,
  now = () => new Date(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
}) {
  let timer = null;
  let armed = null; // the firing the timer is walking toward
  let running = false;

  const msUntil = (fire) => {
    const [y, m, d] = fire.date.split('-').map(Number);
    const [hh, mm] = fire.at.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime() - now().getTime();
  };

  async function arm() {
    if (!running) return;
    if (timer !== null) { clearTimer(timer); timer = null; }
    const d = now();
    armed = nextFire(normalizeReminders(await load()), { date: localDateKey(d), hm: hhmm(d) });
    if (!armed) return;
    timer = setTimer(wake, Math.min(Math.max(msUntil(armed), 0), MAX_HOP_MS));
  }

  async function wake() {
    timer = null;
    if (!running || !armed) return;
    const late = -msUntil(armed);
    // Not there yet — this was a hop, or the timer ran a moment early.
    if (late < 0) return arm();
    if (late <= GRACE_MS) await deliver(armed);
    return arm(); // past grace: skipped, and arm() finds what is next
  }

  async function deliver(due) {
    // Composed at fire time: rows are re-read, so only what still exists on a
    // still-enabled schedule speaks.
    const rec = normalizeReminders(await load());
    if (!rec.enabled) return;
    for (const f of due.fires) {
      const t = rec.times.find((x) => x.id === f.id);
      if (!t) continue;
      const fire = { at: due.at, id: t.id, kind: t.kind };
      if (t.label) fire.label = t.label;
      try {
        if (visible()) banner(fire);
        else if (await canNotify()) await notify(fire);
      } catch (error) {
        // A reminder that failed to show is worth a trace, never a crash —
        // and never a failure card: nothing was being saved.
        console.error('[protocol-app] a reminder failed to show:', error);
      }
    }
  }

  return {
    start() { running = true; return arm(); },
    stop() {
      running = false;
      if (timer !== null) { clearTimer(timer); timer = null; }
      armed = null;
    },
    /** The schedule changed, or the app came back to the front — look again. */
    resync() { return arm(); },
    /** Test hook: what the engine is currently walking toward. */
    _armed: () => armed,
  };
}
