// viewToday.js — the daily surface. One tap is the whole ask.
//
// Content law 2 lives here structurally: there are no totals, meters, or
// summaries about the person anywhere on this screen. A tap re-sorts the day
// — done things move to Done — but nothing is scored, and nothing is said
// about how much of it you did.
//
// The day is grouped, not listed (PLAN §5, R16): Now · still open from
// earlier · anytime · later (folded) · done (folded). A protocol with nine
// blocks is nine cards you scroll past; grouped, it is the handful you can
// act on right now.
//
// Fail-loudly (ruling B): every write on this screen goes through guarded().
// Success paints only after the write confirms; failure lands on screen with
// a real Retry; typed text is never discarded. Absence renders as "—", never
// as 0 (ruling A) — an unlogged tally is not a zero tally.

import { h, clear } from './dom.js';
import { buildToday, makePhaseSetting } from '../todayModel.js';
import {
  setJournal, addFood, removeFood, bumpWaterMl, setWaterMl,
  unavailableReason, addSet, updateSet, removeSet, setDuration, setReading, trainingLog, lastLoggedBefore,
  applyCheckToggle, setCheckUnits,
} from '../trackerOps.js';
import { unitsOf, stepMl, volumeUnitLabel, displayVolume, parseVolume, weightUnitLabel, displayWeight, parseWeight } from '../../lib/units.js';
import { cadenceOf, cadenceLabel, addDays, dueToday } from '../../lib/cadence.js';
import { seriesFor, summarise, sparkPath, summaryText } from '../../lib/readings.js';
import { guarded } from './announcer.js';
import * as store from '../store.js';
import { localDateKey, nowIso, displayTime, timeFormatOf } from '../../lib/core.js';

/** 'YYYY-MM-DD' → a local Date at midnight. */
function dateFromKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The last minute of a given day — how a finished day is looked at. */
function endOfDay(key) {
  const d = dateFromKey(key);
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Scroll, where scrolling exists — jsdom and headless renders have no view. */
function scrollToY(y) {
  try { window.scrollTo(0, y); } catch { /* no viewport to move */ }
}

function timeLabel(b, fmt = 'auto') {
  const t = (v) => displayTime(v, fmt);
  if (b.start && b.end) return `${t(b.start)}–${t(b.end)}`;
  if (b.start) return `from ${t(b.start)}`;
  return null;
}

/**
 * The instructions, folded away until asked for.
 *
 * Notes carry the whole point of an item — how to do it, how long, what to
 * watch for, what to be careful of. They were stored and never drawn, which
 * left a screen of names you could tick without knowing why. Printing them
 * inline would make an already-long list unreadable, so each item keeps a
 * disclosure: closed by default, one tap to the real thing.
 *
 * Paragraphs that begin with a short label ("Release: ...", "Careful: ...")
 * keep that label in bold, because that is how they read on paper.
 */
function notesBlock(notes, itemId, openNotes, extra, card = {}) {
  const paragraphs = String(notes ?? '').split(/\n{2,}/).filter((t) => t.trim() !== '');
  const hasCard = Boolean(card.fields || card.photos?.length || card.training);
  if (paragraphs.length === 0 && !extra && !hasCard) return null;
  // Opened instructions stay open. The screen re-sorts itself as the day gets
  // ticked off, and re-closing what somebody opened to read mid-exercise would
  // make the app fight them.
  const photos = photoLoop(card.photos);
  const el = h(
    'details.notes',
    { open: openNotes?.has(itemId) ? '' : null },
    h('summary', {}, hasCard || paragraphs.length ? 'How' : 'Options'),
    card.training ?? null,
    fieldsBlock(card.fields),
    photos,
    paragraphs.map((text) => {
      const m = /^([A-Z][A-Za-z ]{1,14}):\s([\s\S]+)$/.exec(text);
      return m
        ? h('p', {}, h('strong', {}, `${m[1]} `), m[2])
        : h('p', {}, text);
    }),
    extra ?? null,
  );
  el.addEventListener('toggle', () => {
    if (el.open) {
      openNotes?.add(itemId);
      photos?._startLoop?.();
    } else {
      openNotes?.delete(itemId);
      photos?._stopLoop?.();
    }
  });
  if (el.open) photos?._startLoop?.();
  return el;
}

/**
 * The body-work card: a photo loop, and the five fields as five fields.
 *
 * This is the shape the old app had and the rebuild dropped — the content was
 * carried across as one blob of notes behind a "How" fold, which is how an app
 * full of body work came to look like an app with none. Tool, release, load,
 * notice and careful are five different kinds of thing (K3): what you need,
 * what to do, what to load afterwards so the range holds, what tells you it
 * worked, and what would hurt you. Careful is drawn as a warning because it is
 * not just another paragraph.
 */
function photoLoop(photos) {
  if (!photos?.length) return null;
  const host = h('div.photos', {});
  const frames = [];

  for (const ph of photos) {
    // Two frames, the start and the end of the movement, alternating: a still
    // cannot show a movement, and a video is a file nobody has offline.
    const img = h('img.photo', {
      src: `./src/content/photos/${ph.set}_0.jpg`,
      alt: ph.caption ?? 'The movement, first frame',
      loading: 'lazy',
      decoding: 'async',
    });
    // A photo that fails to load says so rather than leaving a broken icon.
    img.addEventListener('error', () => {
      img.replaceWith(h('p.why', {}, 'That photo is missing from this copy of the app.'));
    }, { once: true });
    frames.push({ img, set: ph.set });
    host.append(
      h('figure.photo-figure', {},
        img,
        ph.caption
          ? h('figcaption.why', {},
              ph.approx ? h('span.chip', {}, 'close, not exact') : null,
              ph.caption)
          : null,
      ),
    );
  }

  // The loop runs only while somebody is looking at it. A timer per photo,
  // left running behind a closed disclosure — or after the screen re-sorts —
  // is a battery drain nobody asked for on a phone that stays open all day.
  let timer = null;
  let frame = 0;
  host._startLoop = () => {
    if (timer) return;
    timer = setInterval(() => {
      frame = frame ? 0 : 1;
      for (const f of frames) {
        if (f.img.isConnected) f.img.src = `./src/content/photos/${f.set}_${frame}.jpg`;
      }
    }, 1200);
  };
  host._stopLoop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  return host;
}

const FIELD_LABELS = {
  tool: 'Tool',
  release: 'Release',
  load: 'Load',
  notice: 'Notice',
  careful: 'Careful',
};

function fieldsBlock(fields) {
  if (!fields) return null;
  return h('div.fields', {},
    Object.keys(FIELD_LABELS)
      .filter((k) => fields[k])
      .map((k) =>
        h('div.field-line' + (k === 'careful' ? '.careful' : ''), {},
          h('span.field-label', {}, FIELD_LABELS[k]),
          h('span', {}, fields[k]),
        ),
      ),
  );
}

/**
 * The training log: what you actually did, typed where you did it.
 *
 * A tick tells you a workout happened. It does not tell you that last week was
 * 3×8 at 20 lb and today was 3×10 — which is the entire reason to write
 * training down. So an item tracked as sets or a duration carries a small
 * logger inside its own disclosure, and above it, last time's numbers.
 *
 * Everything here is optional. The tap is still the whole daily ask: an item
 * ticked with nothing typed is complete, and always was.
 */
/**
 * The change since last time, for one side of one measurement.
 *
 * Deliberately quiet. A line, a sentence, and the dates — no grade, no streak,
 * no comparison with anybody else. The direction word only appears when the
 * item states which way is progress, because reporting a change is honest and
 * calling an unlabelled one an improvement is not.
 *
 * The picture is not a timeline: readings are plotted evenly by position, and
 * the words carry the dates. Three readings six months apart spaced evenly
 * along an axis would be a lie told by a picture.
 */
function deltaBlock(item, side, history, day) {
  // Today's reading is in `day`, which is not yet in `history` — pass it in
  // rather than waiting for a reload, or a number just typed would not appear
  // in its own trend until tomorrow.
  const series = seriesFor(history, item.id, side, day);
  if (!series.length) return null;
  const summary = summarise(series, item.measure ?? {});
  const text = summaryText(summary, item.measure ?? {});
  if (!text) return null;

  const path = sparkPath(series);
  const host = h('div.delta', {});
  if (path) {
    host.append(
      h('svg', {
        viewBox: '0 0 120 28', width: '120', height: '28',
        'aria-hidden': 'true', focusable: 'false',
        class: 'spark' + (summary.direction ? ` spark-${summary.direction}` : ''),
      }, h('path', { d: path, fill: 'none', 'stroke-width': '1.5' })),
    );
  }
  // The sentence is the accessible version of the line, not a caption for it —
  // everything the picture shows is in the words.
  host.append(h('p.muted', {}, text));
  return host;
}

function trainingBlock(item, day, { units, writeKey, onLogged, lastTime, history }) {
  if (item.tracking !== 'sets' && item.tracking !== 'duration' && item.tracking !== 'measure') return null;

  const host = h('div.training', {});
  const wLabel = weightUnitLabel(units);

  const target = item.tracking === 'measure' || !item.amount
    ? null
    : item.tracking === 'duration'
      ? `${item.amount.seconds ?? ''} sec`
      : `${item.amount.sets ?? ''} × ${item.amount.reps ?? ''}`.trim();

  host.append(
    h('div.training-head', {},
      h('span.field-label', {}, item.tracking === 'measure' ? 'Reading' : 'Log'),
      target ? h('span.why', {}, `Asked for: ${target}`) : null,
      lastTime ? h('span.why', {}, `Last time (${lastTime.when}): ${lastTime.text}`) : null,
    ),
  );

  const write = (fn, what) => guarded(() => store.mutateDay(writeKey(), fn), {
    what,
    onOk: (next) => onLogged?.(next),
  });

  const rows = h('div.sets', {});
  function renderSets() {
    clear(rows);
    const log = trainingLog(day, item.id);

    // A self-test's answer (docs/TAXONOMY.md §5.1). Fourteen tests shipped as
    // tick boxes with their unit written in a sentence — "Recorded in cm." —
    // and nowhere at all to put the number. Two shapes, because the tests are
    // two shapes: most want a figure, one wants which of four things you saw.
    if (item.tracking === 'measure' && item.measure) {
      const stored = log?.readings ?? {};
      const sides = item.sides ? ['left', 'right'] : ['both'];
      const label = { left: 'Left', right: 'Right', both: 'Reading' };

      for (const side of sides) {
        const current = stored[side];
        if (item.measure.kind === 'choice') {
          rows.append(
            h('div', {},
              h('label', {}, item.sides ? `${label[side]} — what you saw` : 'What you saw'),
              h('select', {
                'aria-label': `${label[side]} reading for ${item.name}`,
                onchange: (e) => {
                  const chosen = (item.outcomes ?? []).find((o) => o.id === e.target.value);
                  write(
                    (fresh) => setReading(fresh, item.id, side, chosen ? { outcomeId: chosen.id, tell: chosen.tell } : undefined),
                    `The ${label[side].toLowerCase()} reading for ${item.name}`,
                  );
                },
              },
                [h('option', { value: '' }, 'Not recorded')].concat(
                  (item.outcomes ?? []).map((o) => h('option', {
                    value: o.id,
                    selected: current?.outcomeId === o.id,
                  }, o.tell)),
                ),
              ),
            ),
          );
        } else {
          const isScale = item.measure.kind === 'scale';
          rows.append(
            h('div.field-row', {},
              h('div', {},
                h('label', {}, item.sides
                  ? `${label[side]} (${isScale ? `${item.measure.min}–${item.measure.max}` : item.measure.unit})`
                  : `Reading (${isScale ? `${item.measure.min}–${item.measure.max}` : item.measure.unit})`),
                h('input', {
                  type: 'number',
                  inputmode: 'decimal',
                  ...(isScale ? { min: String(item.measure.min), max: String(item.measure.max) } : { min: '0' }),
                  // A blank is "not recorded" and a zero is a result. A big toe
                  // that does not lift is a reading, not a missing one.
                  value: Number.isFinite(current?.value) ? String(current.value) : '',
                  placeholder: '—',
                  'aria-label': `${label[side]} reading for ${item.name}`,
                  onchange: (e) => {
                    const raw = e.target.value.trim();
                    const n = Number(raw);
                    write(
                      (fresh) => setReading(fresh, item.id, side, raw !== '' && Number.isFinite(n) ? n : undefined),
                      `The ${label[side].toLowerCase()} reading for ${item.name}`,
                    );
                  },
                })),
            ),
          );
        }
      }
      for (const side of sides) {
        const delta = deltaBlock(item, side, history, day);
        if (!delta) continue;
        if (item.sides) delta.prepend(h('span.field-label', {}, label[side]));
        rows.append(delta);
      }
      if (item.measure.better) {
        rows.append(h('p.muted', {}, `${item.measure.better === 'higher' ? 'Higher' : 'Lower'} is better. It is your own number — nothing is compared to anybody else's.`));
      }
      return;
    }

    if (item.tracking === 'duration') {
      const secs = log?.seconds;
      rows.append(
        h('div.field-row', {},
          h('div', {},
            h('label', {}, 'Seconds'),
            h('input', {
              type: 'number', min: '1', inputmode: 'numeric',
              value: Number.isFinite(secs) ? String(secs) : '',
              placeholder: item.amount?.seconds ? String(item.amount.seconds) : '—',
              'aria-label': `Seconds for ${item.name}`,
              onchange: (e) => {
                const n = Number(e.target.value);
                write(
                  (fresh) => setDuration(fresh, item.id, Number.isFinite(n) && n > 0 ? n : undefined),
                  `The time for ${item.name}`,
                );
              },
            })),
        ),
      );
      return;
    }

    (log?.sets ?? []).forEach((set, i) => {
      rows.append(
        h('div.field-row.set-row', {},
          h('div', {},
            h('label', {}, `Set ${i + 1} · reps`),
            h('input', {
              type: 'number', min: '0', inputmode: 'numeric',
              value: Number.isFinite(set.reps) ? String(set.reps) : '',
              placeholder: item.amount?.reps ? String(item.amount.reps) : '—',
              'aria-label': `Reps in set ${i + 1} of ${item.name}`,
              onchange: (e) => {
                const n = Number(e.target.value);
                write((fresh) => updateSet(fresh, item.id, i, { reps: Number.isFinite(n) ? n : undefined }),
                  `Set ${i + 1} of ${item.name}`);
              },
            })),
          h('div', {},
            h('label', {}, `Weight (${wLabel})`),
            h('input', {
              type: 'number', min: '0', step: '0.5', inputmode: 'decimal',
              value: Number.isFinite(set.kg) ? String(displayWeight(set.kg, units)) : '',
              placeholder: 'bodyweight',
              'aria-label': `Weight in set ${i + 1} of ${item.name}, in ${wLabel}`,
              onchange: (e) => {
                write((fresh) => updateSet(fresh, item.id, i, { kg: parseWeight(e.target.value, units) }),
                  `Set ${i + 1} of ${item.name}`);
              },
            })),
          h('button.btn.small.quiet', {
            'aria-label': `Remove set ${i + 1} of ${item.name}`,
            onclick: () => write((fresh) => removeSet(fresh, item.id, i), `Removing set ${i + 1}`),
          }, 'Remove'),
        ),
      );
    });

    rows.append(
      h('button.btn.small', {
        onclick: () => {
          // A new set starts from the last one you did today, or from what the
          // plan asked for — nobody wants to retype 10 and 20 five times.
          const sets = trainingLog(day, item.id)?.sets ?? [];
          const previous = sets[sets.length - 1];
          const seed = previous
            ? { ...previous }
            : { reps: item.amount?.reps, kg: lastTime?.kg };
          write((fresh) => addSet(fresh, item.id, seed), `A set of ${item.name}`);
        },
      }, (trainingLog(day, item.id)?.sets ?? []).length ? 'Add another set' : 'Log a set'),
    );
  }
  renderSets();
  host.append(rows);
  host._renderSets = renderSets;
  return host;
}

function checkRow(item, day, why, { openNotes, onChanged, onPause, unavailable, cadence, weekly, writeKey = localDateKey, units = 'imperial', lastTime, history } = {}) {
  const pressed = Boolean(day.checks[item.id]);
  const btn = h(
    'button.check',
    {
      'aria-pressed': String(pressed),
      'aria-label': `${item.name} — done today`,
      onclick: () =>
        guarded(
          // The tick and the bottle move together, in one transaction
          // (decision 22). For anything without a supply dose configured this
          // is exactly the old one-tap write, with a snapshot on it.
          () => store.mutateDayWithSupply(writeKey(), item.id, ({ day: fresh, supply }) =>
            applyCheckToggle({ day: fresh, item, supply })),
          {
            what: `The check-off for ${item.name}`,
            // Paint only after the write confirms — a checkmark is a receipt,
            // not a hope (ruling B, point 1).
            onOk: (next) => {
              Object.assign(day, next); // keep this view's copy current
              btn.setAttribute('aria-pressed', String(Boolean(next.checks[item.id])));
              // The receipt paints on this button first (ruling B), then the
              // screen re-sorts: a done item moves to Done, and what is left is
              // what is left. Nothing is scored — things just move.
              onChanged?.(next);
            },
          },
        ),
    },
    '✓',
  );
  // The pause control lives inside the item's own disclosure rather than on
  // the row: fifty rows with a second button each is the clutter that made
  // this screen unusable, and pausing is something you do occasionally and on
  // purpose. (R16 — a person must be able to stop the app asking, and start it
  // again whenever they want.)
  // What came out of the bottle, after the fact (decision 22). Only ever shown
  // for something that actually decremented, and only once it has: this is a
  // correction, not a question the app asks before you have done anything.
  // Clearing it means "I am not saying", which is not the same as zero.
  const recorded = day.checks[item.id];
  const unitsLine = Number.isFinite(recorded?.units)
    ? h('div.field-row', {},
        h('div', {},
          h('label', { for: `units-${item.id}` }, `Taken (${recorded.unitName || 'units'})`),
          h('input', {
            type: 'number', min: '0', inputmode: 'numeric', id: `units-${item.id}`,
            value: String(recorded.units),
            'aria-label': `Units taken of ${item.name}`,
            onchange: (e) => {
              const raw = String(e.target.value).trim();
              const n = raw === '' ? null : Number(e.target.value);
              guarded(
                () => store.mutateDayWithSupply(writeKey(), item.id, ({ day: fresh, supply }) =>
                  setCheckUnits({ day: fresh, supply, itemId: item.id, units: n })),
                {
                  what: `What you took of ${item.name}`,
                  onOk: (next) => { Object.assign(day, next); onChanged?.(next); },
                },
              );
            },
          }),
        ),
        h('span.why', {}, 'Your supply count moves with this. Leave it empty to say nothing.'),
      )
    : null;

  const options = onPause
    ? h('div.item-options', {},
        unitsLine,
        unavailable?.kind === 'out-of-stock'
          ? h('span.why', {}, 'Not being asked for: the supply count is zero. Restock it on Supply — it is on the Home menu — and it comes back on its own.')
          : unavailable
            ? h('button.btn.small', {
                onclick: () => onPause(item, false),
                'aria-label': `Start asking for ${item.name} again`,
              }, 'Start again')
            : h('button.btn.small.quiet', {
                onclick: () => onPause(item, true),
                'aria-label': `Pause ${item.name}`,
              }, 'Pause this'),
        unavailable
          ? null
          : h('span.why', {}, 'Stops the app asking for this. Nothing already recorded changes, and you can start it again whenever you want.'),
      )
    : null;

  // Logging a set is doing the thing, so it ticks the item too — but only
  // upward: it never un-ticks something you already marked done.
  const training = trainingBlock(item, day, {
    units,
    writeKey,
    lastTime,
    history,
    onLogged: (next) => {
      Object.assign(day, next);
      training?._renderSets?.();
      const hasWork = Boolean(next.log?.[item.id]);
      if (hasWork && !next.checks[item.id]) {
        guarded(() => store.mutateDayWithSupply(writeKey(), item.id, ({ day: fresh, supply }) =>
          applyCheckToggle({ day: fresh, item, supply })), {
          what: `The check-off for ${item.name}`,
          onOk: (after) => {
            Object.assign(day, after);
            btn.setAttribute('aria-pressed', 'true');
            onChanged?.(after);
          },
        });
      }
    },
  });

  return h(
    'div.row' + (unavailable ? '.unavailable' : ''),
    {},
    btn,
    h(
      'div.grow',
      {},
      h('span.name', {},
        item.name,
        item.dose ? h('span.dose', {}, ` · ${item.dose}`) : null,
        // "Worth trying" has to survive the trip from the library to the day,
        // or by the fortieth repetition it is just something you do. The grade
        // behind the word stays in the library; this is the hedge, not the
        // reference (law 5, and canon 3.8's erosion across surfaces).
        item.tier === 'exploratory' ? h('span.chip.cadence', {}, 'Exploratory') : null,
        cadence ? h('span.chip.cadence', {}, cadence) : null,
        weekly ? h('span.chip.cadence', {}, weekly) : null,
      ),
      why ? h('span.why', {}, why) : null,
      // A card with real content opens to the card; a plain item opens to its
      // notes. Same disclosure, so the row stays one line until asked.
      notesBlock(item.notes, item.id, openNotes, options, {
        fields: item.fields,
        photos: item.photos,
        training,
      }),
    ),
  );
}

export async function viewToday({ reload, stamp, date: viewing, startSession, mode = 'day' } = {}) {
  const date = viewing ?? localDateKey();
  const isToday = date === localDateKey();

  // Which day a write lands in. Today re-asks the clock at write time, so a
  // phone left open overnight files this morning's taps under this morning; a
  // past day is fixed, because that is the day being corrected.
  const writeKey = () => (isToday ? localDateKey() : date);

  const [protocols, day, history, pauses, supplies] = await Promise.all([
    store.loadProtocols(),
    store.loadDay(date),
    store.loadRecentDays(date),   // cadence needs to know about the week so far
    store.loadPauses(),
    store.loadSupplies(),
  ]);
  // Catch the phase pointers up with the calendar before anything is drawn —
  // and only ever for today (decision 21: looking back changes nothing).
  const loaded = await store.loadPhaseSettings(protocols);
  const phaseSettings = isToday ? await store.advancePhases(protocols, loaded, date) : loaded;
  // Read once, up here: the day's rows need it for weights, the water card
  // needs it for volumes, and a second read would be a second answer.
  const units = unitsOf(await store.getSetting('ui.units'));
  // Opt-in, and absent means off (R17) — the law's posture is the default.
  const showWeekly = (await store.getSetting('ui.weeklyCount'))?.value === true;
  // Device convention unless somebody said otherwise (decision 23).
  const timeFmt = timeFormatOf(await store.getSetting('ui.timeFormat'));
  const state = { day, history, pauses, supplies };
  // A past day is looked at from its own end: every block's window has closed,
  // so nothing is "now" and what is left is simply what was not recorded.
  const asOf = isToday ? new Date() : endOfDay(date);
  const today = buildToday({ protocols, phaseSettings, now: asOf, day, history, pauses, supplies });

  // Instructions the person has opened, by item id — kept across the
  // re-sorts a tap causes, so reading stays read.
  const openNotes = new Set();

  // Fired when this screen is replaced, so its page-level listeners go with
  // it — and so anything half-typed is saved on the way out.
  const leaving = new AbortController();

  const root = h('div');
  const dateText = dateFromKey(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Past days are viewable and correctable (decision 21). Arrows for the day
  // before and after, and a typed date for anything further back. There is no
  // forward arrow past today: a record of a day that has not happened is not
  // a record of anything.
  const go = (key) => reload?.({ date: key === localDateKey() ? undefined : key });
  const picker = h('input', {
    type: 'date',
    value: date,
    max: localDateKey(),
    'aria-label': 'Show another day',
    style: 'max-width:11rem',
    onchange: (e) => { if (e.target.value && e.target.value <= localDateKey()) go(e.target.value); },
  });
  root.append(
    h('h1', {}, isToday ? 'Today' : 'That day'),
    h('div.field-row', { style: 'align-items:center' },
      h('button.btn.small', {
        'aria-label': 'The day before',
        onclick: () => go(addDays(date, -1)),
      }, '‹'),
      h('div.grow', {}, h('p.muted', { style: 'margin:0' }, dateText)),
      isToday
        ? null
        : h('button.btn.small', {
            'aria-label': 'The day after',
            onclick: () => go(addDays(date, +1)),
          }, '›'),
      isToday ? null : h('button.btn.small', { onclick: () => go(localDateKey()) }, 'Today'),
    ),
    h('div.field', { style: 'margin-top:var(--sp-2)' }, picker),
  );
  // NOT via append(null): the DOM's append() renders a null argument as the
  // word "null" on the screen, where h()'s own child handling would have
  // dropped it. One of those was live for exactly as long as it took to look.
  if (!isToday) {
    root.append(
      h('p.muted', {}, 'You are looking at a day that has already happened. Ticking something here is not cheating — a record you correct is a record that is more true.'),
    );
  }

  /* ------------------------- phase pointers ------------------------- */
  // Only on today: the phase pointer is where the plan is NOW, and changing
  // it from inside a past day would edit the present by accident.
  for (const pp of isToday ? today.phasedProtocols : []) {
    // The select may only display a phase that actually persisted. On a
    // failed write it snaps back — the screen never gets ahead of storage.
    let persisted = pp.current?.id ?? pp.phases[0]?.id;
    const select = h(
      'select',
      {
        'aria-label': `Current phase of ${pp.protocolName}`,
        onchange: (e) => {
          const chosen = e.target.value;
          guarded(
            () =>
              store.putSetting(
                makePhaseSetting(pp.protocolId, chosen, localDateKey(), nowIso()),
              ),
            {
              what: `The phase change for ${pp.protocolName}`,
              onOk: () => {
                persisted = chosen;
                rerenderBlocks();
              },
              onFail: () => {
                e.target.value = persisted;
              },
            },
          );
        },
      },
      pp.phases.map((ph) =>
        h('option', { value: ph.id, selected: ph.id === pp.current?.id }, ph.name),
      ),
    );
    // Where the plan has got to, stated rather than implied. A phase moves
    // itself along when the days you set for it run out (D14), and an app that
    // did that silently would be changing the plan behind somebody's back.
    // This is information about the plan, not commentary about the person.
    const where = pp.progress
      ? pp.progress.total
        ? `Day ${pp.progress.dayNumber} of ${pp.progress.total}. It moves on by itself when the days run out.`
        : `Day ${pp.progress.dayNumber}. This phase has no set length, so it waits for you.`
      : null;
    root.append(
      h('div.card', {},
        h('div.field', {}, h('label', {}, `${pp.protocolName} — current phase`), select),
        where ? h('p.why', {}, where) : null,
      ),
    );
  }

  /* ------------------------------ blocks ---------------------------- */
  // 'track' is the journal / food / water page: the day's records, without
  // the whole plan above them. 'day' is the full grouped list for anybody who
  // wants to see everything at once. Neither is the front door any more.
  const blocksHost = h('div');
  if (mode !== 'track') root.append(blocksHost);

  function rerenderBlocks() {
    return guarded(
      async () => {
        const key = writeKey();
        const [ps, fresh, hist, paused, supply] = await Promise.all([
          store.loadProtocols(),
          store.loadDay(key),
          store.loadRecentDays(key),
          store.loadPauses(),
          store.loadSupplies(),
        ]);
        const settings = await store.loadPhaseSettings(ps);
        Object.assign(state, { day: fresh, history: hist, pauses: paused, supplies: supply });
        return buildToday({
          protocols: ps, phaseSettings: settings, now: isToday ? new Date() : endOfDay(key),
          day: fresh, history: hist, pauses: paused, supplies: supply,
        });
      },
      {
        what: "Refreshing today's blocks",
        detail: "Today's blocks couldn't refresh from storage, so this screen may not show the latest change.",
        onOk: (t) => {
          // Hold the scroll: the list shrinks as things move to Done, and a
          // screen that jumps under your thumb loses the next tap.
          const y = window.scrollY;
          clear(blocksHost);
          renderBlocks(t);
          scrollToY(y);
        },
      },
    );
  }

  /** One block, drawn as a card, with only the items that belong here. */
  function blockCard(b, t, { flavour = '' } = {}) {
    const head = h(
      'div.card-head',
      {},
      h('h2', {}, b.name),
      timeLabel(b, timeFmt) ? h('span.chip', {}, timeLabel(b, timeFmt)) : null,
      t.multipleActive ? h('span.chip', {}, b.protocolName) : null,
    );
    // Run it, rather than read it. A block with more than one thing in it is a
    // session: the app takes you through, one item at a time, and the list
    // below is what you get when you would rather do it yourself.
    const start = startSession && isToday && b.items.length > 1
      ? h('button.btn.primary.start-session', {
          onclick: () => startSession(b.protocolId, b.blockId),
        }, `Start — ${b.items.length} things`)
      : null;
    return h('section.card' + flavour, { 'aria-label': `${b.name} block` },
      head,
      start,
      b.items.map((it) => checkRow(it, day, it.why, {
        openNotes,
        writeKey,
        units,
        lastTime: lastTimeFor(it),
        history: state.history,
        onChanged: rerenderBlocks,
        onPause: pauseOrResume,
        unavailable: unavailableReason(it.id, { pause: state.pauses[it.id], supply: state.supplies[it.id] }),
        cadence: cadenceChip(it),
        weekly: weeklyChip(it),
      })),
    );
  }

  /**
   * Last time's numbers, as a line a person can train against.
   * Reads the same recent history the cadence maths already loaded.
   */
  function lastTimeFor(item) {
    if (item.tracking !== 'sets' && item.tracking !== 'duration') return null;
    const found = lastLoggedBefore(state.history, item.id, date);
    if (!found) return null;
    const wLabel = weightUnitLabel(units);
    const when = dateFromKey(found.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (Number.isFinite(found.log.seconds)) {
      return { when, text: `${found.log.seconds} sec` };
    }
    const sets = found.log.sets ?? [];
    if (!sets.length) return null;
    const text = sets
      .map((set) => {
        const reps = Number.isFinite(set.reps) ? `${set.reps}` : '—';
        const load = Number.isFinite(set.kg) ? ` @ ${displayWeight(set.kg, units)} ${wLabel}` : '';
        return `${reps}${load}`;
      })
      .join(', ');
    const heaviest = sets.reduce((m, x) => (Number.isFinite(x.kg) && x.kg > (m ?? 0) ? x.kg : m), undefined);
    return { when, text, kg: heaviest };
  }

  /** Only worth saying when it is not every day — the default says nothing. */
  function cadenceChip(item) {
    const c = cadenceOf(item);
    return c.kind === 'daily' ? null : cadenceLabel(c);
  }

  /**
   * "2 of 3 this week" — off unless the person asked for it (R17).
   *
   * PLAN §3.5 promised this number on screen; content law 2 bans completion
   * meters by name. Kevin's line settles it: neither answer is global, the
   * person chooses. Off by default keeps the law's posture, and when it is on
   * it is not the app grading anybody — it is their own target, which they set,
   * reflected back at them. The number is composer input either way.
   */
  function weeklyChip(item) {
    if (!showWeekly) return null;
    const due = dueToday(item, date, state.history);
    if (!Number.isFinite(due.doneThisWeek) || !Number.isFinite(due.target)) return null;
    return `${due.doneThisWeek} of ${due.target} this week`;
  }

  /** R16: stop asking, or start again. Both are one write and a re-sort. */
  function pauseOrResume(item, pause) {
    return guarded(
      () => (pause
        ? store.pauseItem(item.id, { name: item.name })
        : store.resumeItem(item.id)),
      {
        what: pause ? `Pausing ${item.name}` : `Starting ${item.name} again`,
        onOk: () => rerenderBlocks(),
      },
    );
  }

  /**
   * A group of the day: Now, missed earlier, anytime, later, done.
   *
   * Open groups are the ones you act on; closed ones are one line you can
   * reach for. The count on a closed group says how much is inside it — it is
   * a label on a drawer, not a score (content law 2: no meters, no commentary
   * about the person).
   */
  function groupSection(t, { key, title, note, closed, foldOver }) {
    const parts = t.groups[key];
    if (!parts.length) return null;
    const count = parts.reduce((n, p) => n + p.items.length, 0);
    const cards = parts.map((b) => blockCard(b, t, { flavour: key === 'now' ? '.now' : '' }));
    // A handful left from this morning is worth showing; a whole untouched day
    // is a wall, and a wall is what made this screen unusable. Over the fold
    // line it becomes one line you can open — present either way, never a
    // scroll you have to fight past to reach right now.
    if (foldOver && count > foldOver) closed = true;
    if (!closed) {
      return h('div', {},
        h('h2.group-title', {}, title),
        note ? h('p.muted', {}, note) : null,
        cards,
      );
    }
    return h('details.group', {},
      h('summary', {}, `${title} · ${count}`),
      note ? h('p.muted', {}, note) : null,
      cards,
    );
  }

  function renderBlocks(t) {
    if (t.blocks.length === 0) {
      // An empty screen must offer the way out of being empty. This used to
      // say "build a protocol, or bring one in" and point at another tab —
      // a dead end for anybody who just opened the app, and the exact screen
      // that made it look like there was nothing here.
      blocksHost.append(
        h('div.card', {},
          h('h2', {}, 'Nothing on today yet'),
          h('p.muted', {}, 'The app comes with a day to follow: two short routines, the body-work library, daily practices and a strength routine. Add them and Today fills in.'),
          h('button.btn.primary', {
            style: 'width:100%',
            onclick: (e) => {
              const btn = e.currentTarget;
              btn.disabled = true;
              guarded(
                async () => {
                  const res = await fetch(new URL('../../content/starter.json', import.meta.url));
                  if (!res.ok) throw new Error(`starter content: HTTP ${res.status}`);
                  const out = await store.importFile(await res.text());
                  if (!out.ok) throw new Error(out.errors?.map((x) => x.message).join('; ') || 'invalid');
                  await store.putSetting({ key: 'seed.applied', value: 'v1-by-hand', at: nowIso() });
                  return out;
                },
                {
                  what: 'Adding the starter content',
                  onOk: () => reload?.(),
                  onFail: () => { btn.disabled = false; },
                },
              );
            },
          }, 'Add what the app comes with'),
          h('p.muted', {}, 'Or build your own, or import a file, in Protocols.'),
        ),
      );
      return;
    }
    // The order is the day as it is lived: what is open right now, what is
    // still waiting from earlier, what has no time attached, then what is
    // coming and what is behind you — the last two folded away.
    const sections = [
      groupSection(t, { key: 'now', title: 'Now' }),
      groupSection(t, {
        key: 'missed',
        title: isToday ? 'Still open from earlier' : 'Not recorded',
        note: isToday
          ? 'Their time has passed. Tap them if you get to them — nothing here is counted against you.'
          : 'Nothing was recorded for these. Tick anything you did and forgot to mark.',
        foldOver: 8,
      }),
      groupSection(t, {
        key: 'anytime',
        title: 'Anytime today',
        note: 'Work with no clock on it — the library, and the practices you fit in where they fit.',
        // The anchors are the day; this is everything else, and on a fresh
        // device everything else is due at once because nothing has been done
        // yet. Folded, it is one line you open when you want it. (The composer
        // in FRAMEWORK is what will eventually deal a handful from here; until
        // that exists, folding is the honest version of the same idea.)
        foldOver: 6,
      }),
      groupSection(t, { key: 'later', title: 'Later today', closed: true }),
      groupSection(t, {
        key: 'asNeeded',
        title: 'When you need it',
        note: 'These are never due and never late. They are here when you want them.',
        closed: true,
      }),
      groupSection(t, {
        key: 'unavailable',
        title: "Not asking right now",
        note: 'Paused, or run out. Open one to start it again.',
        closed: true,
      }),
      groupSection(t, { key: 'done', title: 'Done', closed: true }),
    ].filter(Boolean);

    if (sections.length === 0) {
      blocksHost.append(h('div.card', {}, h('p.muted', {}, 'Everything scheduled for today is done.')));
      return;
    }
    for (const s of sections) blocksHost.append(s);
  }
  renderBlocks(today);

  // Tell the shell what this screen assumes, so it can notice when the day
  // has moved past it (see watchForStaleScreen in app.js).
  stamp?.(isToday ? { date, nextBoundaryHM: today.nextBoundaryHM } : null);

  root._beforeUnmount = () => {
    saveJournal();
    leaving.abort();
  };

  // Open on the block the person is actually in. Landing at the top of a
  // nine-block day means scrolling past the morning to find the afternoon.
  root._afterMount = () => {
    const nowCard = blocksHost.querySelector('.card.now');
    if (!nowCard) { scrollToY(0); return; }
    const top = nowCard.getBoundingClientRect().top + window.scrollY;
    scrollToY(Math.max(0, top - 12));
  };

  /* ------------------------------ journal ---------------------------- */
  const journalTa = h('textarea', {
    id: 'journal',
    placeholder: 'Anything worth keeping about today.',
    value: day.journal ?? '',
  });
  // The journal used to save on `change`, which is blur — and swiping to
  // another app does not blur a textarea on a phone. Typed thoughts sat in a
  // box that was never written. Now it saves as you type (settled), and again
  // the moment the page is hidden or unloaded, which is when a phone takes
  // the app away mid-sentence.
  let journalTimer = null;
  let lastSaved = day.journal ?? '';
  function saveJournal() {
    if (journalTimer) { clearTimeout(journalTimer); journalTimer = null; }
    if (journalTa.value === lastSaved) return;
    const text = journalTa.value;
    return guarded(
      // Read the field at write time (and at every retry) — what saves is
      // what the person sees in the box. The box is never cleared, so a
      // failure strands nothing (ruling B, point 2).
      () => store.mutateDay(writeKey(), (fresh) => setJournal(fresh, journalTa.value)),
      {
        what: 'The journal entry',
        copyText: () => journalTa.value,
        onOk: () => { lastSaved = text; },
      },
    );
  }
  journalTa.addEventListener('input', () => {
    if (journalTimer) clearTimeout(journalTimer);
    journalTimer = setTimeout(saveJournal, 800);
  });
  journalTa.addEventListener('change', saveJournal);
  // Page-level listeners belong to THIS drawing of the screen. Without the
  // signal they would pile up one per render, each holding a textarea that is
  // no longer on screen — and an old one could write its stale text over new.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveJournal();
  }, { signal: leaving.signal });
  window.addEventListener('pagehide', saveJournal, { signal: leaving.signal });
  root.append(
    h(
      'section.card',
      { 'aria-label': 'Journal' },
      h('div.field', {},
        h('label', { for: 'journal' }, 'Journal'),
        journalTa,
      ),
    ),
  );

  /* ------------------------------- food ------------------------------ */
  const foodList = h('div');
  function renderFood(d) {
    clear(foodList);
    for (const f of d.food) {
      const at = new Date(f.at);
      const hm = isNaN(at) ? '' : at.toTimeString().slice(0, 5);
      foodList.append(
        h('div.row', {},
          h('div.grow', {}, h('span.name', {}, f.text), h('span.why', {}, hm)),
          h('button.btn.quiet.small', {
            'aria-label': `Remove food entry: ${f.text}`,
            onclick: () =>
              guarded(
                () => store.mutateDay(writeKey(), (fresh) => removeFood(fresh, f.id)),
                {
                  what: `Removing the food entry "${f.text}"`,
                  onOk: (next) => renderFood(next),
                },
              ),
          }, 'Remove'),
        ),
      );
    }
  }
  renderFood(day);

  const foodInput = h('input', { type: 'text', id: 'food-entry', placeholder: 'What you ate.' });
  function submitFood() {
    const text = foodInput.value;
    if (!text.trim()) return;
    guarded(
      () => store.mutateDay(writeKey(), (fresh) => addFood(fresh, text)),
      {
        what: `The food entry "${text.trim()}"`,
        copyText: () => text,
        onOk: (next) => {
          // Clear only what was saved; if the field has since changed,
          // whatever's typed there now stays put.
          if (foodInput.value === text) foodInput.value = '';
          renderFood(next);
        },
      },
    );
  }
  foodInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitFood(); });

  root.append(
    h('section.card', { 'aria-label': 'Food log' },
      h('div.card-head', {}, h('h2', {}, 'Food')),
      foodList,
      h('div.field-row', {},
        h('div', { style: 'flex:3' }, h('label', { for: 'food-entry', class: 'visually-hidden' }, 'Add a food entry'), foodInput),
        h('button.btn', { onclick: submitFood, 'aria-label': 'Add food entry' }, 'Add'),
      ),
    ),
  );

  /* ------------------------------- water ----------------------------- */
  // Ounces (or millilitres), never "glasses" — a glass is not a unit, it is a
  // guess about the size of somebody's cup (K2). Storage is ml either way.
  //
  // Ruling A on screen: before the first log the box is empty and the label
  // says "not logged yet". Empty is not zero, and the screen must not blur
  // the two. Clearing the box puts the day back to never-logged.
  const unitLabel = volumeUnitLabel(units);
  const tap = stepMl(units);
  const shown = (d) => {
    const v = displayVolume(d.waterMl, units);
    return v === undefined ? '' : String(v);
  };
  const amount = h('input.count', {
    type: 'number',
    id: 'water-amount',
    min: '0',
    step: '1',
    inputmode: 'numeric',
    placeholder: '—',
    'aria-label': `Water today, in ${unitLabel}`,
    value: shown(day),
    style: 'flex:1;',
  });
  const provenance = h('p.muted', { style: 'margin-top:var(--sp-2)' }, '');
  function paint(d) {
    Object.assign(day, d);
    amount.value = shown(d);
    provenance.textContent = Number.isFinite(d.waterFromGlasses)
      ? `Converted from ${d.waterFromGlasses} glasses logged in the older version, at 8 oz a glass — not a number you typed. Correct it if it is wrong.`
      : '';
  }
  function water(deltaMl) {
    return guarded(
      // A minus-tap on nothing returns the same record, and mutateDay writes
      // nothing at all for it — no record is invented (ruling A).
      () => store.mutateDay(writeKey(), (fresh) => bumpWaterMl(fresh, deltaMl)),
      {
        what: 'The water amount',
        onOk: (next) => paint(next),
      },
    );
  }
  amount.addEventListener('change', () =>
    guarded(
      () => store.mutateDay(writeKey(), (fresh) => setWaterMl(fresh, parseVolume(amount.value, units))),
      {
        what: 'The water amount',
        copyText: () => amount.value,
        onOk: (next) => paint(next),
      },
    ),
  );
  root.append(
    h('section.card', { 'aria-label': 'Water' },
      h('div.card-head', {}, h('h2', {}, 'Water'), h('span.chip', {}, `${unitLabel} today`)),
      h('div.stepper', {},
        h('button.btn', { 'aria-label': `${displayVolume(tap, units)} ${unitLabel} less`, onclick: () => water(-tap) }, '−'),
        amount,
        h('button.btn', { 'aria-label': `${displayVolume(tap, units)} ${unitLabel} more`, onclick: () => water(+tap) }, '+'),
      ),
      provenance,
    ),
  );
  paint(day);

  return root;
}
