// viewAssessment.js — the first conversation, and the only one that seeds.
//
// Kevin, 31 Aug: "there should be a thing for me to take an initial assessment
// so it can know what my problem areas are."
//
// Five questions, each of which changes what gets dealt tomorrow morning. The
// question-earning rule (D16) is enforced in assessment.js and tested; this
// file's job is to ask them without making anybody feel sorted.
//
// So: no labels, no score, no result. The last screen is a receipt — what was
// heard and what it will do — which is D16's composed-start reveal: "why you're
// seeing this, in the person's own words." Provenance, not a verdict.
//
// It gates nothing. Skipping every question is a valid way through, and the
// library stays entirely browsable either way.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { nowIso, localDateKey } from '../../lib/core.js';
import { QUESTIONS, seedFrom, AREAS, capDial } from '../composer/assessment.js';
import { loadCatalog, dealtKey } from '../composer/day.js';
import { reachableNodes } from '../composer/ledger.js';

/** The wake block's name, once somebody has said when their day starts. */
const MORNING_NAMES = {
  'in-bed': 'Before your feet touch the floor',
  'on-feet': 'First thing, once you are up',
};

/**
 * Rename the first block to match the morning somebody actually has.
 *
 * FRAMEWORK: "the anchor ritual itself belongs to the user; the app schedules
 * around it, never inside it." The shipped name assumed a morning that starts
 * in bed, which is not Kevin's and was never asked.
 */
export async function applyMorning(morning) {
  const name = MORNING_NAMES[morning];
  if (!name) return false;
  const protocols = await store.loadProtocols();
  let changed = false;
  for (const p of protocols) {
    const block = p.blocks?.find((b) => b.id === 'arc-wake');
    if (!block || block.name === name) continue;
    block.name = name;
    await store.saveProtocol(p);
    changed = true;
  }
  return changed;
}

/**
 * Once sleep position is known, the wake block stops being fixed content.
 *
 * Kevin, 1 Sep: "the wake block should not be fixed content… it doesn't
 * necessarily need to be the same thing every day." The composed day now deals
 * "Unwind the night" per position — so the two fixed extras that shipped before
 * anybody was asked come out of the static block. What stays is the floor
 * (law 6): sixty seconds of rocking is still the whole block on a bad morning,
 * every morning, unmoved.
 *
 * Only the two seeded ids are removed. Anything a person added to this block
 * themselves is theirs and is not touched.
 */
export async function applySleep(position) {
  if (!position) return false;
  const SEEDED_EXTRAS = new Set(['arc-wake-lat', 'arc-wake-chest']);
  const protocols = await store.loadProtocols();
  let changed = false;
  for (const p of protocols) {
    const block = p.blocks?.find((b) => b.id === 'arc-wake');
    if (!block) continue;
    const kept = block.items.filter((i) => !SEEDED_EXTRAS.has(i.id));
    if (kept.length === block.items.length) continue;
    block.items = kept;
    await store.saveProtocol(p);
    changed = true;
  }
  return changed;
}

export async function viewAssessment({ done, reload } = {}) {
  const root = h('div');
  const previous = (await store.getSetting('composer.assessment'))?.value ?? {};
  const answers = {
    areas: [...(previous.areas ?? [])],
    pacing: previous.pacing ?? null,
    dial: previous.dial ?? 'standard',
    equipment: [...(previous.equipment ?? [])],
    morning: previous.morning ?? null,
    sleep: previous.sleep ?? null,
  };

  root.append(
    h('h1', {}, previous.areas ? 'Your assessment' : 'A few questions'),
    h('p.muted', {}, 'Six of them, and every one changes what the app deals you. Skip any of it — nothing here is required, nothing is a diagnosis, and none of it closes anything off.'),
  );

  const results = h('div');

  function multiField(q) {
    const list = h('div.card', {}, h('div.card-head', {}, h('h2', {}, q.ask)), h('p.muted', {}, q.note));
    for (const opt of q.options) {
      const id = `${q.id}-${opt.id}`;
      const box = h('input', {
        type: 'checkbox',
        id,
        checked: answers[q.id].includes(opt.id),
        onchange: (e) => {
          const on = e.target.checked;
          const at = answers[q.id].indexOf(opt.id);
          if (on && at < 0) answers[q.id].push(opt.id);
          if (!on && at >= 0) answers[q.id].splice(at, 1);
        },
      });
      list.append(h('div.row.compact', {},
        box,
        h('label.grow', { for: id },
          h('span.name', {}, opt.name),
          opt.also ? h('span.why', {}, opt.also) : null),
      ));
    }
    return list;
  }

  function oneField(q) {
    const card = h('div.card', {}, h('div.card-head', {}, h('h2', {}, q.ask)), h('p.muted', {}, q.note));
    for (const opt of q.options) {
      const id = `${q.id}-${opt.id}`;
      card.append(h('div.row.compact', {},
        h('input', {
          type: 'radio', name: q.id, id, checked: answers[q.id] === opt.id,
          onchange: () => { answers[q.id] = opt.id; },
        }),
        h('label.grow', { for: id },
          h('span.name', {}, opt.name),
          opt.also ? h('span.why', {}, opt.also) : null),
      ));
    }
    return card;
  }

  for (const q of QUESTIONS) {
    root.append(q.kind === 'multi' ? multiField(q) : oneField(q));
  }

  root.append(h('button.btn.primary', {
    style: 'width:100%',
    onclick: (e) => save(e.currentTarget),
  }, 'Save and compose my day'), results);

  function save(btn) {
    btn.disabled = true;
    return guarded(async () => {
      const catalog = await loadCatalog();
      const { events, settings, notes } = seedFrom(answers, {
        anatomy: catalog.anatomy,
        reachable: reachableNodes(catalog.items),
      });
      for (const event of events) await store.addFinding(event);
      for (const rec of settings) await store.putSetting({ ...rec, updatedAt: nowIso() });
      const renamed = await applyMorning(answers.morning);
      const rewoken = await applySleep(answers.sleep);
      // Today has already been dealt from the old state. Clear it so the next
      // look composes from what was just said rather than making somebody wait
      // until tomorrow to see any of this matter.
      // Overwritten without a `session`, which is what storedDeal reads — so
      // the next look at Today deals fresh instead of showing a day composed
      // from answers that have just been replaced.
      await store.putSetting({ key: dealtKey(localDateKey()), cleared: true, updatedAt: nowIso() });
      return { events, notes, renamed, rewoken };
    }, {
      what: 'Saving your answers',
      onOk: (out) => { btn.disabled = false; showReceipt(out); },
      onFail: () => { btn.disabled = false; },
    });
  }

  /**
   * The receipt — D16's composed-start reveal.
   *
   * What was heard and what it does, in the person's own words. Never a result,
   * never a category, and never anything they did not say themselves.
   */
  function showReceipt({ events, notes, renamed, rewoken }) {
    clear(results);
    const card = h('div.card', {}, h('div.card-head', {}, h('h2', {}, 'What that changes')));

    if (answers.areas.length) {
      const named = answers.areas.map((id) => AREAS.find((a) => a.id === id)?.name ?? id);
      card.append(h('p', {}, `You said ${named.join(', ').toLowerCase()}. Those go to the front of the rotation — the composer deals their release and their loading before anything it has no reason to pick.`));
    } else {
      card.append(h('p', {}, 'You named no problem areas, so the rotation starts even and spreads across everything the library can reach.'));
    }

    const dial = capDial(answers.dial, answers.pacing);
    if (answers.pacing === 'careful') {
      card.append(h('p', {}, `Because doing too much costs you later, the dial starts at ${dial} and climbs slowly. That is a pacing setting, not a label, and nothing in the app decides anything else about you from it.`));
    } else if (answers.pacing) {
      card.append(h('p', {}, `Sessions are set to ${dial}. Change it any day.`));
    }

    if (answers.equipment.length) {
      card.append(h('p', {}, `The app will stop offering work that needs anything beyond what you have. Most of the library needs nothing at all, so this narrows less than it sounds.`));
    }

    if (rewoken || answers.sleep) {
      const how = {
        side: "a side sleeper's night",
        back: "a back sleeper's night",
        stomach: "a stomach sleeper's night",
        mixed: 'the night — drawn from every position until you refine yours',
      }[answers.sleep];
      if (how) card.append(h('p', {}, `Your wake block stops being the same three things: each morning it deals movement that unwinds ${how}, and rotates day to day. The sixty-second floor stays put.`));
    }

    if (renamed) {
      card.append(h('p', {}, answers.morning === 'on-feet'
        ? 'Your first block no longer assumes you start the day in bed — it waits until you are up.'
        : 'Your first block stays where you wake up.'));
    }

    for (const note of notes) card.append(h('p.muted.tiny', {}, note));

    card.append(h('p.muted.tiny', {}, `${events.length} ${events.length === 1 ? 'note' : 'notes'} recorded, each one traceable to something you said — you can see them on any card that mentions the part, and change your answers here whenever.`));
    card.append(h('button.btn.primary', {
      style: 'width:100%',
      onclick: () => (done ? done() : reload?.()),
    }, 'See today'));
    results.append(card);
    card.scrollIntoView?.({ block: 'start' });
  }

  return root;
}
