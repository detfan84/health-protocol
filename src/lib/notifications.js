let activeTimers = [];

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function fireNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'protocol-reminder',
      requireInteraction: true,
    });
  } catch (e) {
    // Fallback for mobile — some browsers need service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
      });
    }
  }
}

export function scheduleBlockReminders(blocks, prefs) {
  // Cancel any existing timers
  cancelAllReminders();

  if (Notification.permission !== 'granted') return;

  const now = new Date();

  for (const block of blocks) {
    const blockPref = prefs[block.id];
    // Skip if explicitly disabled
    if (blockPref === false) continue;
    // Skip if no preference set and notifications not globally enabled
    if (blockPref === undefined && !prefs._enabled) continue;

    // Determine the reminder time
    let hour, minute;
    if (typeof blockPref === 'object' && blockPref.hour !== undefined) {
      hour = blockPref.hour;
      minute = blockPref.minute || 0;
    } else {
      // Default: use the block's start hour
      hour = block.hr[0];
      minute = 0;
    }

    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If already passed today, skip (don't schedule for tomorrow — we reschedule daily)
    if (target <= now) continue;

    const delay = target.getTime() - now.getTime();

    // Count items in the block for the notification body
    const itemCount = block.items ? block.items.length : 0;
    const body = `${block.time} — ${block.label}${itemCount > 0 ? ` (${itemCount} items)` : ''}`;

    const timerId = setTimeout(() => {
      fireNotification('Protocol Reminder', body);
    }, delay);

    activeTimers.push(timerId);
  }
}

export function cancelAllReminders() {
  activeTimers.forEach(id => clearTimeout(id));
  activeTimers = [];
}

export function scheduleWorkoutReminder(workoutSchedule) {
  if (Notification.permission !== 'granted') return;
  if (!workoutSchedule?.reminders || !workoutSchedule.days?.length) return;

  const now = new Date();
  // JS getDay(): 0=Sun, but our schedule uses 0=Mon
  const jsDay = now.getDay();
  const ourDay = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon

  if (!workoutSchedule.days.includes(ourDay)) return;

  const [h, m] = (workoutSchedule.time || '09:00').split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);

  if (target <= now) return; // Already passed today

  const delay = target.getTime() - now.getTime();
  const timerId = setTimeout(() => {
    fireNotification('Workout Reminder', 'Today is a workout day. Time to move!');
  }, delay);

  activeTimers.push(timerId);
}

// Format hour for display
export function formatTime(hour, minute = 0) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return minute > 0 ? `${h}:${String(minute).padStart(2, '0')} ${ampm}` : `${h} ${ampm}`;
}
