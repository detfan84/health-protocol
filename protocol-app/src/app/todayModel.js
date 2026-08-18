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
 * buildToday({ protocols, phaseSettings, now })
 *   protocols:     all protocols (inactive ones are ignored here)
 *   phaseSettings: { [protocolId]: settingsRecord } — may be empty
 *   now:           Date (injected for testability)
 * →
 * {
 *   blocks: [ { protocolId, protocolName, blockId, name, start?, end?,
 *               isNow, items: [item…] } ]   // sorted for display
 *   phasedProtocols: [ { protocolId, protocolName, phases, current } ]
 *   multipleActive: bool                     // show protocol names on blocks?
 * }
 */
export function buildToday({ protocols, phaseSettings = {}, now = new Date() }) {
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
  for (let i = 0; i < timed.length; i++) {
    const b = timed[i];
    const effectiveEnd = b.end ?? timed[i + 1]?.start ?? '24:00';
    b.isNow = b.start <= nowHM && nowHM < effectiveEnd;
  }

  return {
    blocks: [...timed, ...untimed],
    phasedProtocols,
    multipleActive: active.length > 1,
  };
}

/* --------------------------- movement prompts ------------------------ */
//
// Ported from the old build: a small daily set of gentle movement
// suggestions with check-offs — not a workout program. Checks store in the
// day record like any item check; the ids below are permanent so history
// survives future wording changes. The Phase 2 movement module will bring
// the real content; this is the seed, not the ceiling.
//
// The safety line ships in the same breath as the prompts (roadmap PEM gate).

export const MOVEMENT_PROMPTS = [
  { id: 'mv-walk', name: 'Take a walk', why: 'Rhythmic motion settles the nervous system and gets the gut moving.' },
  { id: 'mv-stretch', name: 'Gentle stretching', why: 'Slow stretch, easy breath — find the edge and stay kind to it.' },
  { id: 'mv-stand', name: 'Stand up and move for a minute', why: 'Long stillness stiffens; a minute of motion pushes back.' },
  { id: 'mv-outside', name: 'Get outside', why: 'A change of light and air counts as movement too.' },
];

export const MOVEMENT_SAFETY_LINE =
  'For most bodies, gently nudging the edge builds capacity. If exertion tends to crash you, grow from a stable baseline instead — never through a crash.';
