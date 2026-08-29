// viewSession.js — running a block, instead of listing it.
//
// The complaint this exists to answer, in Kevin's words: the app was a toolbox
// tipped into a chest. Everything was in there and none of it took you
// through anything. A checklist tells you what you did not do yet. A session
// tells you what to do NOW, shows you how, counts the seconds, and moves on.
//
// One thing on screen at a time. The instruction is the screen — not folded
// behind a disclosure, because you cannot read a disclosure while your face is
// on the floor. The photo plays. The timer runs itself. Next is a thumb-sized
// button in the same place every time.
//
// Rules kept from the rest of the app:
//   - Passing an item marks it done; skipping marks nothing. The record is
//     what happened, and skipping is a thing that happened too.
//   - Nothing scores you. There is no completion bar, and leaving in the
//     middle is a normal way to finish (content law 2, decision 8a).
//   - Every write goes through the same guarded path as everywhere else.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { localDateKey } from '../../lib/core.js';
import { applyCheckToggle, addSet, updateSet, trainingLog } from '../trackerOps.js';
import { unitsOf, weightUnitLabel, displayWeight, parseWeight } from '../../lib/units.js';

const FIELD_ORDER = [
  ['release', 'Do this'],
  ['tool', 'You need'],
  ['load', 'Then load it'],
  ['notice', 'Notice'],
  ['careful', 'Careful'],
];

/**
 * @param protocolId,blockId  which block to run
 * @param done                called when the session ends, for any reason
 */
export async function viewSession({ protocolId, blockId, done }) {
  const date = localDateKey();
  const [protocols, day] = await Promise.all([store.loadProtocols(), store.loadDay(date)]);
  const units = unitsOf(await store.getSetting('ui.units'));

  const protocol = protocols.find((p) => p.id === protocolId);
  const block = protocol?.blocks?.find((b) => b.id === blockId);
  const root = h('div.session', {});

  if (!block || block.items.length === 0) {
    root.append(
      h('div.card', {},
        h('h1', {}, 'That block is empty'),
        h('button.btn', { onclick: () => done() }, 'Back to today'),
      ),
    );
    return root;
  }

  const items = block.items;
  let index = 0;
  let timer = null;
  let remaining = 0;
  let wakeLock = null;

  // A guided session is the one screen where the phone must not sleep in your
  // face. Not available everywhere, and never worth failing over.
  async function holdScreen() {
    try { wakeLock = await navigator.wakeLock?.request?.('screen'); } catch { wakeLock = null; }
  }
  function releaseScreen() {
    try { wakeLock?.release?.(); } catch { /* already gone */ }
    wakeLock = null;
  }
  holdScreen();

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function leave() {
    stopTimer();
    releaseScreen();
    done();
  }

  const stage = h('div');
  root.append(stage);

  function markDone(item, then) {
    guarded(
      // Passing an item marks it done ONCE — running the same block twice must
      // not take a second dose out of the bottle. The supply moves with the
      // tick, in one transaction (decision 22).
      () => store.mutateDayWithSupply(localDateKey(), item.id, ({ day: fresh, supply }) =>
        (fresh.checks[item.id] ? { day: fresh } : applyCheckToggle({ day: fresh, item, supply }))),
      {
        what: `The check-off for ${item.name}`,
        onOk: (next) => { Object.assign(day, next); then?.(); },
        onFail: () => then?.(), // never trap somebody mid-session on a write
      },
    );
  }

  function advance() {
    stopTimer();
    if (index >= items.length - 1) return finish();
    index += 1;
    render();
  }

  function finish() {
    stopTimer();
    releaseScreen();
    clear(stage);
    stage.append(
      h('div.card', {},
        h('h1', {}, 'That’s the block.'),
        h('p.muted', {}, `${block.name} — done for today. What you ticked is in the record; what you skipped simply is not.`),
        h('button.btn.primary', { style: 'width:100%', onclick: () => done() }, 'Back to today'),
      ),
    );
  }

  function render() {
    clear(stage);
    const item = items[index];
    const seconds = item.amount?.seconds;
    const isTimed = item.tracking === 'duration' && Number.isFinite(seconds);
    const alreadyDone = Boolean(day.checks[item.id]);

    /* ------------------------------- header ------------------------------ */
    stage.append(
      h('div.session-top', {},
        h('button.btn.quiet.small', { onclick: leave, 'aria-label': 'Leave this session' }, '✕ Leave'),
        h('span.why', {}, `${block.name} · ${index + 1} of ${items.length}`),
      ),
    );

    /* -------------------------------- what -------------------------------- */
    stage.append(
      h('h1.session-name', {}, item.name),
      // The session runner is exactly where an exploratory drill stops feeling
      // exploratory — it is the surface you meet on the fortieth repetition.
      item.tier === 'exploratory' ? h('p.why', {}, 'Exploratory — worth trying, not established. The grade is on this item in the library.') : null,
      item.dose ? h('p.session-dose', {}, item.dose) : null,
      item.why ? h('p.muted', {}, item.why) : null,
    );

    /* ------------------------------- how ---------------------------------- */
    if (item.fields) {
      const fields = h('div.session-fields', {});
      for (const [key, label] of FIELD_ORDER) {
        if (!item.fields[key]) continue;
        fields.append(
          h('div.field-line' + (key === 'careful' ? '.careful' : ''), {},
            h('span.field-label', {}, label),
            h('span', {}, item.fields[key]),
          ),
        );
      }
      stage.append(fields);
    } else if (item.notes) {
      stage.append(h('p', {}, item.notes));
    }

    /* ------------------------------ the photo ----------------------------- */
    if (item.photos?.length) {
      const ph = item.photos[0];
      const img = h('img.photo', {
        src: `./src/content/photos/${ph.set}_0.jpg`,
        alt: ph.caption ?? item.name,
        decoding: 'async',
      });
      let frame = 0;
      const swap = setInterval(() => {
        if (!img.isConnected) { clearInterval(swap); return; }
        frame = frame ? 0 : 1;
        img.src = `./src/content/photos/${ph.set}_${frame}.jpg`;
      }, 1200);
      img.addEventListener('error', () => { clearInterval(swap); img.remove(); }, { once: true });
      stage.append(h('figure.photo-figure', {}, img, ph.caption ? h('figcaption.why', {}, ph.caption) : null));
    }

    /* ------------------------------- timer -------------------------------- */
    if (isTimed) {
      remaining = remaining || seconds;
      const clock = h('div.session-clock', { 'aria-live': 'off' }, format(remaining));
      const startBtn = h('button.btn.primary.session-go', {});

      const tick = () => {
        remaining -= 1;
        clock.textContent = format(Math.max(0, remaining));
        if (remaining <= 0) {
          stopTimer();
          clock.textContent = 'Done';
          // Marked, then moved on: the person is mid-movement and should not
          // have to find a button with their face on the floor.
          markDone(item, () => setTimeout(() => { remaining = 0; advance(); }, 1200));
        }
      };

      const setLabel = () => { startBtn.textContent = timer ? 'Pause' : (remaining === seconds ? 'Start' : 'Resume'); };
      startBtn.addEventListener('click', () => {
        if (timer) { stopTimer(); } else { timer = setInterval(tick, 1000); }
        setLabel();
      });
      setLabel();
      stage.append(h('div.session-timer', {}, clock, startBtn));
    }

    /* ------------------------------- sets --------------------------------- */
    if (item.tracking === 'sets') {
      const log = trainingLog(day, item.id);
      const wLabel = weightUnitLabel(units);
      const sets = h('div.sets', {});
      (log?.sets ?? []).forEach((set, i) => {
        sets.append(
          h('div.field-row.set-row', {},
            h('div', {}, h('label', {}, `Set ${i + 1} · reps`), h('input', {
              type: 'number', min: '0', inputmode: 'numeric',
              value: Number.isFinite(set.reps) ? String(set.reps) : '',
              'aria-label': `Reps in set ${i + 1}`,
              onchange: (e) => write((fresh) => updateSet(fresh, item.id, i, { reps: Number(e.target.value) || undefined })),
            })),
            h('div', {}, h('label', {}, `Weight (${wLabel})`), h('input', {
              type: 'number', min: '0', step: '0.5', inputmode: 'decimal',
              value: Number.isFinite(set.kg) ? String(displayWeight(set.kg, units)) : '',
              placeholder: 'bodyweight',
              'aria-label': `Weight in set ${i + 1}`,
              onchange: (e) => write((fresh) => updateSet(fresh, item.id, i, { kg: parseWeight(e.target.value, units) })),
            })),
          ),
        );
      });
      sets.append(h('button.btn', {
        onclick: () => {
          const existing = trainingLog(day, item.id)?.sets ?? [];
          const seed = existing[existing.length - 1] ?? { reps: item.amount?.reps };
          write((fresh) => addSet(fresh, item.id, { ...seed }));
        },
      }, (log?.sets ?? []).length ? 'Add another set' : 'Log a set'));
      stage.append(h('div.training', {}, h('span.field-label', {}, 'Log'), sets));
    }

    function write(fn) {
      guarded(() => store.mutateDay(localDateKey(), fn), {
        what: `The log for ${item.name}`,
        onOk: (next) => { Object.assign(day, next); render(); },
      });
    }

    /* ------------------------------ the moves ----------------------------- */
    stage.append(
      h('div.session-actions', {},
        h('button.btn.primary.session-next', {
          onclick: () => { remaining = 0; markDone(item, advance); },
        }, alreadyDone ? 'Next' : (index === items.length - 1 ? 'Done — finish' : 'Done — next')),
        h('button.btn.quiet', {
          onclick: () => { remaining = 0; advance(); },
        }, 'Skip this one'),
      ),
    );
  }

  function format(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m ? `${m}:${String(r).padStart(2, '0')}` : `${r}`;
  }

  render();
  root._beforeUnmount = () => { stopTimer(); releaseScreen(); };
  return root;
}
