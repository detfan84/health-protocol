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
    startedAt, // local date key — what auto-advance will count from
    updatedAt: nowIsoStr,
  };
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
export function buildToday({ protocols, phaseSettings = {}, now = new Date(), day = null }) {
  const active = (protocols ?? []).filter((p) => p.active === true);
  const nowHM = hhmmOfDate(now);

  const phasedProtocols = [];
  const blocks = [];

  for (const p of active) {
    const { phase } = currentPhase(p, phaseSettings[p.id]);
    if ((p.phases ?? []).length > 0) {
      phasedProtocols.push({
        protocolId: p.id,
        protocolName: p.name,
        phases: [...p.phases].sort((a, b) => a.order - b.order),
        current: phase,
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
  const groups = { now: [], missed: [], anytime: [], later: [], done: [] };

  for (const b of ordered) {
    const open = b.items.filter((it) => !checked(it));
    const done = b.items.filter(checked);
    if (open.length) {
      // 'past' with items left is the missed group — same items, found where
      // a person would look for them rather than hidden as a punishment.
      const key = b.when === 'past' ? 'missed' : b.when;
      groups[key].push(part(b, open));
    }
    if (done.length) groups.done.push(part(b, done));
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
