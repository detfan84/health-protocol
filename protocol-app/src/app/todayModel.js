// todayModel.js — builds the Today view from the plan(s), as pure data.
//
// Locked decisions carried here:
//   - Multiple active protocols: Today interleaves ALL active protocols'
//     blocks by time of day (Kevin, Aug 16).
//   - Time-aware block math (carried from the old build): timed blocks sort
//     by start; the block whose window contains "now" is marked. A block with
//     no end runs until the next timed block begins.
//   - Phases are optional. Items tagged to phases appear only in the current
//     phase; untagged items appear in every phase.
//
// Current phase is a pointer stored in SETTINGS ("phase:<protocolId>"), not on
// the protocol — the ratified protocol shape has no current-phase field, and
// the import validator would strip one, breaking the round trip. When no
// pointer is stored yet, the first phase (by order) is current, so a freshly
// built phased protocol works on day one with nothing to configure.
// (Automatic advancing by phase length is the next foundation item on the
// roadmap, not this session; the stored startedAt is what it will need.)

import { dueToday, daysBetween, addDays } from '../lib/cadence.js';
import { dateKeyFromIso } from '../lib/core.js';
import { unavailableReason } from './trackerOps.js';

/** The local date key for a Date — the same shape core.localDateKey uses. */
function localDateKeyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ------------------------------ phases ------------------------------ */

export function phaseKey(protocolId) {
  return `phase:${protocolId}`;
}

/**
 * Which phase is current for a protocol?
 * → { phase, stored } where phase is the phase object (or null when the
 *   protocol has no phases) and stored is whether a pointer record exists.
 */
export function currentPhase(protocol, phaseSetting) {
  const phases = [...(protocol.phases ?? [])].sort((a, b) => a.order - b.order);
  if (phases.length === 0) return { phase: null, stored: false };
  if (phaseSetting?.phaseId) {
    const found = phases.find((p) => p.id === phaseSetting.phaseId);
    if (found) return { phase: found, stored: true };
    // pointer refers to a phase that was edited away — fall through to default
  }
  return { phase: phases[0], stored: false };
}

/** The settings record that pins a protocol to a phase, starting today. */
export function makePhaseSetting(protocolId, phaseId, startedAt, nowIsoStr) {
  return {
    key: phaseKey(protocolId),
    protocolId,
    phaseId,
    startedAt, // local date key — what auto-advance counts from
    updatedAt: nowIsoStr,
  };
}

/**
 * Where a phased protocol has got to by `today` (decision 14).
 *
 * A phase with a length runs out; the next one starts the day after it does.
 * Nobody should have to remember to move the pointer along — a twelve-week
 * plan that still says "week one" in March is a plan the app has stopped
 * telling the truth about.
 *
 * Pure. It reports where things stand and leaves writing to the caller, so a
 * screen that merely looks at a past day cannot advance anybody's plan.
 *
 * Three deliberate limits:
 *   - **A phase with no length never expires.** Absence is "not configured",
 *     not zero (ruling A) — an open-ended phase waits for a person, forever.
 *   - **The last phase is the end.** It never rolls over or wraps.
 *   - **It counts from a real date or not at all.** With a stored pointer that
 *     is its startedAt; without one it is the day the plan was made, which is
 *     already recorded. Nothing is stamped just to have something to count from.
 *
 * → { phase, startedAt, moved } — `moved` is true when the pointer belongs
 *   somewhere other than where it is stored.
 */
export function phaseAsOf(protocol, phaseSetting, today) {
  const phases = [...(protocol.phases ?? [])].sort((a, b) => a.order - b.order);
  if (phases.length === 0) return { phase: null, startedAt: null, moved: false };

  let index = phases.findIndex((p) => p.id === phaseSetting?.phaseId);
  if (index < 0) index = 0; // no pointer, or one pointing at an edited-away phase

  let startedAt = phaseSetting?.startedAt ?? dateKeyFromIso(protocol.createdAt);
  if (!startedAt || !today) return { phase: phases[index], startedAt, moved: false };

  const from = startedAt;
  while (index < phases.length - 1) {
    const length = phases[index].days;
    if (!Number.isInteger(length) || length <= 0) break;
    if (daysBetween(startedAt, today) < length) break;
    // Step by exactly the phase's length rather than to today, so a plan looked
    // at three weeks late lands on the phase it would have reached anyway, with
    // its boundaries still where they belong.
    startedAt = addDays(startedAt, length);
    index += 1;
  }

  return {
    phase: phases[index],
    startedAt,
    moved: startedAt !== from || phases[index].id !== phaseSetting?.phaseId,
  };
}

/** How the current phase is going — for the screen, never for commentary. */
export function phaseProgress(phase, startedAt, today) {
  if (!phase || !startedAt || !today) return null;
  const elapsed = daysBetween(startedAt, today);
  if (elapsed < 0) return null;
  const total = Number.isInteger(phase.days) && phase.days > 0 ? phase.days : null;
  return { dayNumber: elapsed + 1, total };
}

/* --------------------------- today building -------------------------- */

function hhmmOfDate(d) {
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

function itemVisible(item, phase) {
  if (!item.phaseIds || item.phaseIds.length === 0) return true; // untagged → always
  if (!phase) return true; // tagged but protocol has no phases left → never hide data
  return item.phaseIds.includes(phase.id);
}

/**
 * buildToday({ protocols, phaseSettings, now, day })
 *   protocols:     all protocols (inactive ones are ignored here)
 *   phaseSettings: { [protocolId]: settingsRecord } — may be empty
 *   now:           Date (injected for testability)
 *   day:           today's record, for sorting done from not-done — optional;
 *                  without it everything is simply not-done yet
 * →
 * {
 *   blocks: [ { protocolId, protocolName, blockId, name, start?, end?,
 *               when: 'now'|'past'|'later'|'anytime', isNow, items: [item…] } ]
 *   groups: { now, missed, anytime, later, done }   // see below
 *   phasedProtocols: [ { protocolId, protocolName, phases, current } ]
 *   multipleActive: bool                     // show protocol names on blocks?
 * }
 *
 * The groups are the screen (PLAN §5): what is due now, what was missed
 * earlier, what is due sometime today, what is still coming, and what is
 * already done. Each group is a list of { …block, items } where `items` is
 * only the part of the block that belongs in that group, so an item appears
 * exactly once. A block with nothing left to show does not appear at all.
 *
 * `missed` is unchecked items whose block window has closed (R16, Kevin
 * Aug 22 — the answer to K4: a missed item stays on screen and stays
 * tappable). Nothing here counts, scores or scolds — a missed item is one
 * you can still do, listed where you can find it.
 */
export function buildToday({
  protocols,
  phaseSettings = {},
  now = new Date(),
  day = null,
  history = {},
  pauses = {},
  supplies = {},
} = {}) {
  const active = (protocols ?? []).filter((p) => p.active === true);
  const nowHM = hhmmOfDate(now);
  const todayKey = day?.date ?? localDateKeyOf(now);

  const phasedProtocols = [];
  const blocks = [];

  for (const p of active) {
    // Where the plan has got to, not where the pointer was last left (D14).
    const { phase, startedAt } = phaseAsOf(p, phaseSettings[p.id], todayKey);
    if ((p.phases ?? []).length > 0) {
      phasedProtocols.push({
        protocolId: p.id,
        protocolName: p.name,
        phases: [...p.phases].sort((a, b) => a.order - b.order),
        current: phase,
        startedAt,
        progress: phaseProgress(phase, startedAt, todayKey),
      });
    }
    for (const b of [...(p.blocks ?? [])].sort((a, b) => a.order - b.order)) {
      const items = b.items.filter((it) => itemVisible(it, phase));
      if (items.length === 0) continue; // an empty card teaches nothing
      blocks.push({
        protocolId: p.id,
        protocolName: p.name,
        blockId: b.id,
        name: b.name,
        start: b.start,
        end: b.end,
        isNow: false,
        items,
      });
    }
  }

  // Timed blocks first, by start time; untimed keep their protocol order after.
  const timed = blocks.filter((b) => b.start);
  const untimed = blocks.filter((b) => !b.start);
  timed.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  // "Now": window contains the current time. A block with no end runs until
  // the next timed block starts (or end of day for the last one).
  //
  // Real protocols overlap — a 05:00–07:00 block and a 06:00–08:00 block are
  // both genuinely open at 06:30 — so more than one block can be now. That is
  // the truth, and the screen groups them together under one heading rather
  // than tagging two cards "Now" and leaving the person to guess which.
  for (let i = 0; i < timed.length; i++) {
    const b = timed[i];
    const effectiveEnd = b.end ?? timed[i + 1]?.start ?? '24:00';
    if (b.start <= nowHM && nowHM < effectiveEnd) b.when = 'now';
    else if (effectiveEnd <= nowHM) b.when = 'past';
    else b.when = 'later';
    b.isNow = b.when === 'now';
  }
  for (const b of untimed) {
    b.when = 'anytime';
    b.isNow = false;
  }

  const ordered = [...timed, ...untimed];
  const checked = (it) => Boolean(day?.checks?.[it.id]);
  const part = (block, items) => ({ ...block, items });
  const groups = { now: [], missed: [], anytime: [], later: [], done: [], unavailable: [], asNeeded: [] };

  // Where each item goes. The order of these questions is the point:
  //
  //   1. Did you do it? Then it is done, whatever the plan says now. The
  //      record outranks the plan (decision 21).
  //   2. Can you do it? Paused, or run out — the app stops asking rather
  //      than listing something you cannot act on (R16).
  //   3. Is it due? A 3×-a-week item that has had its three is not on
  //      today's screen at all. "Not due" is hidden, not greyed out.
  //   4. Otherwise it belongs to its block's time of day.
  function place(item) {
    if (checked(item)) return { key: 'done' };
    const why = unavailableReason(item.id, { pause: pauses[item.id], supply: supplies[item.id] });
    if (why) return { key: 'unavailable', why };
    const due = dueToday(item, todayKey, history);
    if (due.reason === 'as-needed') return { key: 'asNeeded', due };
    if (!due.due) return { key: null, due }; // genuinely off the screen
    return { key: null, due, timed: true };
  }

  for (const b of ordered) {
    const buckets = { done: [], unavailable: [], asNeeded: [], open: [] };
    const notes = new Map();
    for (const it of b.items) {
      const p = place(it);
      if (p.why) notes.set(it.id, p.why);
      if (p.due) notes.set(it.id, notes.get(it.id) ?? p.due);
      if (p.key) buckets[p.key].push(it);
      else if (p.timed) buckets.open.push(it);
    }
    // 'past' with items left is the missed group — same items, found where a
    // person would look for them rather than hidden as a punishment.
    const openKey = b.when === 'past' ? 'missed' : b.when;
    if (buckets.open.length) groups[openKey].push(part(b, buckets.open));
    if (buckets.done.length) groups.done.push(part(b, buckets.done));
    if (buckets.unavailable.length) {
      groups.unavailable.push({ ...part(b, buckets.unavailable), why: notes });
    }
    if (buckets.asNeeded.length) groups.asNeeded.push(part(b, buckets.asNeeded));
  }

  // When does this screen stop being true? The earliest moment a block opens
  // or the current one closes — so a phone left on the counter can notice it
  // has gone stale instead of showing breakfast at dinner time.
  let nextBoundaryHM = null;
  for (let i = 0; i < timed.length; i++) {
    const b = timed[i];
    const effectiveEnd = b.end ?? timed[i + 1]?.start ?? '24:00';
    const edge = b.when === 'later' ? b.start : b.when === 'now' ? effectiveEnd : null;
    if (edge && edge > nowHM && (nextBoundaryHM === null || edge < nextBoundaryHM)) {
      nextBoundaryHM = edge;
    }
  }

  return {
    blocks: ordered,
    groups,
    nextBoundaryHM,
    phasedProtocols,
    multipleActive: active.length > 1,
  };
}

/** 'HH:MM' for a Date, in local time — the clock the blocks are written in. */
export function hhmm(d = new Date()) {
  return hhmmOfDate(d);
}

/* --------------------------- movement content ------------------------ */
//
// The four hard-coded prompts that used to live here ("take a walk", "gentle
// stretching"…) were removed on 22 Aug 2026 at Kevin's ruling: they are a
// placeholder standing in the way of the real thing. Movement is a program —
// the composed day arc, its own protocols — not four generic suggestions
// stapled to the bottom of every screen, and having both meant a person's
// actual body work was duplicated by a stub above it.
//
// Their ids (mv-walk, mv-stretch, mv-stand, mv-outside) are retired, never
// reused: check-offs recorded against them stay in the day records they were
// written into, because the plan changing never rewrites what happened.
//
// The movement safety line went with them, having been written to ride with
// those prompts. The PEM/capacity gate (decision 28) is where that teaching
// belongs, and it enters with the movement module rather than as orphaned
// copy on Today.
