// viewReminders.js — the reminder schedule, and the way it leaves the app.
//
// Decision 12, as rewritten: opt-in is the hard rule, nothing pings by
// default, and every interval is a placeholder until real use says otherwise.
// v1 delivery is the person's own calendar — an .ics file whose alarms fire
// while this app is closed, on any phone, with no server and nothing running.
//
// The copy here is careful about one thing above all: a reminder that arrives
// while the app is shut cannot know what you have already done. Promising
// otherwise would be a lie the architecture cannot keep.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { localDateKey, nowIso } from '../../lib/core.js';
import {
  normalizeReminders, addReminder, updateReminder, removeReminder,
  remindersFromBlocks, remindersToIcs, expandTimes, KINDS, REMINDERS_KEY,
} from '../../lib/reminders.js';
import { NUDGE_KEY, notificationState, resyncNudges, testNudge } from './nudges.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function remindersCard() {
  let rec = normalizeReminders(await store.getSetting(REMINDERS_KEY));
  let nudgeRec = await store.getSetting(NUDGE_KEY).catch(() => null);
  const protocols = await store.loadProtocols();

  const card = h('div.card', {});
  const list = h('div');

  // save takes a FUNCTION of the stored record, not a finished record. The
  // finished-record version of this — putSetting(updateReminder(rec, …)) —
  // is the read-modify-write gap mutateSetting's docstring describes: two
  // quick edits both computed from the same stale `rec`, and the second
  // write landed carrying the first field's old value, under a green UI.
  // Found live on this very card (a time edit eaten by a label edit).
  function save(change, what) {
    return guarded(
      () => store.mutateSetting(REMINDERS_KEY, (cur) => ({
        ...change(normalizeReminders(cur)),
        updatedAt: nowIso(),
      })),
      {
        what,
        onOk: (saved) => {
          rec = normalizeReminders(saved);
          // The engine walks toward one target at a time; an edited schedule
          // means the target may be wrong the moment the write lands.
          resyncNudges();
          render();
        },
      },
    );
  }

  function timeRow(t) {
    const repeats = Boolean(t.everyMinutes);
    const fires = expandTimes(t, rec.quiet);
    return h('div.editor-item', {},
      h('div.field-row', {},
        h('div', {},
          h('label', { class: 'visually-hidden' }, `Kind of reminder at ${t.at}`),
          h('select', {
            'aria-label': `Kind of reminder at ${t.at}`,
            onchange: (e) => save((cur) => updateReminder(cur, t.id, { kind: e.target.value }), 'The reminder kind'),
          },
            Object.entries(KINDS).map(([value, k]) =>
              h('option', { value, selected: t.kind === value }, k.label)),
          ),
        ),
        h('div', { style: 'flex:2' },
          h('input', {
            type: 'text', value: t.label ?? '', placeholder: 'What it is for',
            'aria-label': `Label for the ${t.at} reminder`,
            onchange: (e) => save((cur) => updateReminder(cur, t.id, { label: e.target.value }), 'The reminder label'),
          })),
        h('button.btn.small.danger', {
          'aria-label': `Remove the ${t.at} reminder`,
          onclick: () => save((cur) => removeReminder(cur, t.id), 'Removing the reminder'),
        }, 'Remove'),
      ),
      h('div.field-row', {},
        h('div', {},
          h('label', {}, repeats ? 'From' : 'At'),
          h('input', {
            type: 'time', value: t.at,
            'aria-label': `Time for ${t.label ?? 'this reminder'}`,
            onchange: (e) => save((cur) => updateReminder(cur, t.id, { at: e.target.value }), 'The reminder time'),
          })),
        repeats
          ? h('div', {},
              h('label', {}, 'Until'),
              h('input', {
                type: 'time', value: t.until,
                'aria-label': `End of the window for ${t.label ?? 'this reminder'}`,
                onchange: (e) => save((cur) => updateReminder(cur, t.id, { until: e.target.value }), 'The reminder window'),
              }))
          : null,
        repeats
          ? h('div', {},
              h('label', {}, 'Every (min)'),
              h('input', {
                type: 'number', min: '5', max: '720', step: '5', value: String(t.everyMinutes),
                'aria-label': `Minutes between ${t.label ?? 'these reminders'}`,
                onchange: (e) => save((cur) => updateReminder(cur, t.id, { everyMinutes: Number(e.target.value) }), 'How often the reminder repeats'),
              }))
          : null,
      ),
      repeats
        ? h('p.why', {}, `${fires.length} a day: ${fires.slice(0, 6).join(', ')}${fires.length > 6 ? '\u2026' : ''}`)
        : null,
      h('div.chip-row', {},
        DAY_LABELS.map((label, i) =>
          h('button.phase-chip', {
            'aria-pressed': String(!t.days || t.days.includes(i)),
            'aria-label': `${label} for the ${t.at} reminder`,
            onclick: () => {
              const current = t.days ?? [0, 1, 2, 3, 4, 5, 6];
              const next = current.includes(i) ? current.filter((d) => d !== i) : [...current, i];
              // Every day off is not a schedule — leave at least one standing.
              if (next.length === 0) return;
              save((cur) => updateReminder(cur, t.id, { days: next }), 'The reminder days');
            },
          }, label),
        ),
      ),
    );
  }

  function render() {
    clear(card);
    clear(list);

    card.append(
      h('div.card-head', {}, h('h2', {}, 'Reminders')),
      h('p.muted', {}, 'Off unless you turn them on, and nothing is ever added on your behalf.'),
      h('div.field', {},
        h('label', { for: 'reminders-on' }, 'Use reminders'),
        h('select', {
          id: 'reminders-on',
          onchange: (e) => save((cur) => ({ ...cur, enabled: e.target.value === 'on' }), 'The reminder setting'),
        },
          [['off', 'Off'], ['on', 'On']].map(([v, l]) =>
            h('option', { value: v, selected: rec.enabled === (v === 'on') }, l)),
        ),
      ),
    );

    if (!rec.enabled) return;

    for (const t of rec.times) list.append(timeRow(t));
    if (rec.times.length === 0) {
      list.append(h('p.muted', {}, 'No times yet. Add one, or start from the blocks your protocol already has.'));
    }
    card.append(list);

    const suggestions = remindersFromBlocks(protocols)
      .filter((s) => !rec.times.some((t) => t.at === s.at));

    card.append(
      h('div.field-row', { style: 'margin-top:var(--sp-3)' },
        h('button.btn', {
          onclick: () => save((cur) => addReminder(cur, { at: '08:00', kind: 'block' }), 'Adding a reminder'),
        }, 'Add a time'),
        h('button.btn', {
          onclick: () => save((cur) => addReminder(cur, { kind: 'snack', label: 'Move a little' }), 'Adding a repeating nudge'),
        }, 'Add a repeating nudge'),
        suggestions.length
          ? h('button.btn', {
              onclick: () => save(
                (cur) => suggestions.reduce((acc, s) => addReminder(acc, { ...s, kind: 'block' }), cur),
                'Adding reminders for your blocks',
              ),
            }, `Use my ${suggestions.length} block times`)
          : null,
      ),
    );

    /* ---------------------------- quiet hours -------------------------- */
    // Repeating nudges only. A time you typed yourself is a time you meant,
    // and the app does not know better than you about your own evening.
    const quiet = rec.quiet ?? { from: '21:00', to: '07:00' };
    card.append(
      h('div', { style: 'margin-top:var(--sp-3)' },
        h('p', {}, h('strong', {}, 'Quiet hours')),
        h('p.muted', {}, 'Repeating nudges stay out of this window. Times you set yourself are left alone \u2014 if you asked for 21:30, you meant 21:30.'),
        h('div.field-row', {},
          h('div', {},
            h('label', { for: 'quiet-on' }, 'Use quiet hours'),
            h('select', {
              id: 'quiet-on',
              onchange: (e) => save(
                e.target.value === 'on' ? { ...rec, quiet } : { ...rec, quiet: null },
                'The quiet hours setting',
              ),
            },
              [['off', 'Off'], ['on', 'On']].map(([v, l]) =>
                h('option', { value: v, selected: Boolean(rec.quiet) === (v === 'on') }, l)),
            ),
          ),
          rec.quiet
            ? h('div', {}, h('label', {}, 'From'), h('input', {
                type: 'time', value: rec.quiet.from, 'aria-label': 'Quiet hours start',
                onchange: (e) => save((cur) => ({ ...cur, quiet: { ...(cur.quiet ?? quiet), from: e.target.value } }), 'Quiet hours'),
              }))
            : null,
          rec.quiet
            ? h('div', {}, h('label', {}, 'To'), h('input', {
                type: 'time', value: rec.quiet.to, 'aria-label': 'Quiet hours end',
                onchange: (e) => save((cur) => ({ ...cur, quiet: { ...(cur.quiet ?? quiet), to: e.target.value } }), 'Quiet hours'),
              }))
            : null,
        ),
      ),
    );

    /* --------------------------- on this phone -------------------------- */
    // The R24 surface's controls. Two separate opt-ins on purpose: the
    // schedule above travels with a backup; this toggle is per-device state
    // sitting next to a per-device browser permission.
    function saveNudge(value, what) {
      return guarded(() => store.putSetting({ key: NUDGE_KEY, value }), {
        what,
        onOk: (saved) => { nudgeRec = saved; resyncNudges(); render(); },
      });
    }

    const nudgeState = notificationState(nudgeRec);
    const testNote = h('p.muted', {}, '');
    card.append(
      h('div', { style: 'margin-top:var(--sp-4); padding-top:var(--sp-3); border-top:1px solid var(--line)' },
        h('p', {}, h('strong', {}, 'On this phone')),
        h('p.muted', {},
          'While this app is open — in front, or sitting in the background with the screen off — it can tap you on the shoulder at the times above: a note on screen, or a notification like any other app’s. Close it fully and nothing here runs; the calendar route below covers that.'),
        nudgeState === 'unsupported'
          ? h('p.muted', {}, 'This browser can’t show notifications, so only the on-screen note applies here. The calendar route below still works.')
          : null,
        nudgeState === 'blocked'
          ? h('p.muted', {}, 'Notifications are blocked for this site in your browser. To use them, allow notifications in the browser’s site settings, then come back here.')
          : null,
        nudgeState === 'off'
          ? h('button.btn', {
              onclick: async () => {
                // The permission ask must ride the tap itself — browsers
                // ignore it otherwise — and the answer is the browser's to
                // give, so the toggle is saved only on a real yes.
                let perm = 'denied';
                try { perm = await Notification.requestPermission(); }
                catch (error) { console.error('[protocol-app] the permission ask failed:', error); }
                if (perm === 'granted') await saveNudge(true, 'The notification setting');
                else render(); // blocked or dismissed — say which, honestly
              },
            }, 'Turn on notifications on this phone')
          : null,
        nudgeState === 'on'
          ? h('div.field-row', {},
              h('button.btn', {
                onclick: async () => {
                  testNote.textContent = 'Sending…';
                  try {
                    await testNudge();
                    testNote.textContent = 'Sent. It should be in your notification tray right now — if it is, the scheduled ones will look just like it.';
                  } catch (error) {
                    console.error('[protocol-app] the test notification failed:', error);
                    testNote.textContent = 'That didn’t show. The browser accepted the permission but refused the notification — the on-screen note and the calendar route still work.';
                  }
                },
              }, 'Send a test'),
              h('button.btn.quiet', {
                onclick: () => saveNudge(false, 'The notification setting'),
              }, 'Turn off'),
            )
          : null,
        nudgeState === 'on' ? testNote : null,
      ),
    );

    /* ------------------------- how they arrive ------------------------- */
    card.append(
      h('div', { style: 'margin-top:var(--sp-4); padding-top:var(--sp-3); border-top:1px solid var(--line)' },
        h('p', {}, h('strong', {}, 'When the app is closed')),
        h('p.muted', {}, 'A fully closed app can’t nudge anybody. For those hours, add these times to the calendar you already use: download the file below and open it — your calendar will offer to add them, with an alert at each time.'),
        h('p.muted', {}, 'A calendar alert knows the time and nothing else. It cannot know you have already taken something, or that you have run out — open the app for that. Change your times here and download again to update them.'),
        h('button.btn.primary', {
          style: 'width:100%',
          disabled: rec.times.length === 0 ? '' : null,
          onclick: () => guarded(
            async () => {
              const text = remindersToIcs(rec, { from: localDateKey() });
              const blob = new Blob([text], { type: 'text/calendar' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'shoes-of-peace-reminders.ics';
              a.style.display = 'none';
              document.body.append(a);
              a.click();
              setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 30_000);
              return rec.times.length;
            },
            {
              what: 'The calendar file',
              detail: 'The calendar file was not produced. Nothing on this device changed.',
              onOk: (n) => {
                icsNote.textContent = `Wrote ${n} repeating reminder${n === 1 ? '' : 's'}. Open the downloaded file to add them to your calendar.`;
              },
            },
          ),
        }, 'Download calendar reminders'),
      ),
    );
    const icsNote = h('p.muted', {}, '');
    card.append(icsNote);
  }

  render();
  return card;
}
