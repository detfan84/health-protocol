// viewDisclaimer.js — the thing you read before the app does anything.
//
// PLAN §2 lists "no medical disclaimer" as a v0.2 failure and calls this
// mandatory the moment the app is shareable; FRAMEWORK v3 puts it as step one
// of first run, before the capacity gate and before any content. It lived in a
// README in a sibling repo, which is to say: nowhere a user would ever see it.
//
// The text is adapted from that README. The old app was one person's private
// log, so its wording said so; this one is a framework somebody else fills in,
// which changes who the warning is about — the risk is no longer "this is not
// written for you" but "nothing here has been checked by anyone, including
// what you type into it".
//
// Bump ACCEPTED_VERSION when the wording materially changes, and the gate
// asks again. Cosmetic edits do not count; a person re-consenting to a comma
// is consent theatre.

import { h } from './dom.js';
import * as store from '../store.js';
import { guarded } from './announcer.js';
import { nowIso } from '../../lib/core.js';

export const ACCEPTED_VERSION = 1;
export const ACCEPTED_KEY = 'legal.accepted';

const PARAGRAPHS = [
  ['This is not medical advice.',
    'This app is a place to write down a health routine and record what you actually did. It does not know anything about your body, it does not check what you put into it, and nothing in it is a diagnosis, a treatment plan, or a recommendation. It has not been reviewed, endorsed, or supervised by any physician, therapist, or health authority.'],
  ['Whatever is in here came from somebody.',
    'Content you import, a plan somebody shared with you, or a routine you built yourself — the app treats all of it the same way, which is to say it displays it. What suits one body can be useless or actively harmful for another. Do not follow something because it appeared on this screen.'],
  ['Talk to a professional first.',
    'Seek the advice of a physician or other qualified health provider about any medical condition, supplement, or exercise programme. Never disregard professional medical advice, or delay seeking it, because of something you read here. If you think you may be having a medical emergency, contact emergency services.'],
  ['Physical risk is real.',
    'Routines of this kind commonly include manual soft-tissue work, loaded stretching, eccentric loading, nerve mobilisation and breath holds. These carry genuine risk of injury, and several carry specific risks for people with connective tissue, cardiovascular, or autonomic conditions. Anything you do is done at your own risk.'],
  ['No warranty, no liability.',
    'This software and its content are provided "as is", without warranty of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. In no event shall the author be liable for any claim, damages, injury, or other liability arising from or in connection with this software or its use.'],
  ['Your data stays on this device.',
    "Everything you enter is stored in this browser, on this device. There is no account, no analytics, and no server to send it to — which also means nobody else is keeping a copy for you. Export a backup if it matters to you."],
];

/** The text itself, reusable — the gate and the Data screen show the same words. */
export function disclaimerBody() {
  return PARAGRAPHS.map(([title, text]) =>
    h('div', { style: 'margin-bottom:var(--sp-4)' },
      h('p', {}, h('strong', {}, title)),
      h('p.muted', {}, text),
    ),
  );
}

/**
 * The first-run gate. Resolves once the person has accepted AND the
 * acceptance has been written down — a gate that lets you through on a failed
 * write is a gate that asks again tomorrow and calls it a bug.
 */
export function viewDisclaimer({ onAccept }) {
  const root = h('div');
  root.append(
    h('div.card', {},
      h('h1', {}, 'Before you start'),
      h('p.muted', {}, 'Thirty seconds, once. It matters more here than in most apps.'),
      ...disclaimerBody(),
      h('button.btn.primary', {
        style: 'width:100%',
        onclick: (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          guarded(
            () => store.putSetting({
              key: ACCEPTED_KEY,
              value: { version: ACCEPTED_VERSION, at: nowIso() },
            }),
            {
              what: 'Recording that you have read this',
              detail: 'Your answer could not be written down, so the app has not opened. Nothing else was changed.',
              onOk: () => onAccept(),
              onFail: () => { btn.disabled = false; },
            },
          );
        },
      }, 'I understand — open the app'),
    ),
  );
  return root;
}

/** Has this person accepted the current wording? */
export async function accepted() {
  const rec = await store.getSetting(ACCEPTED_KEY);
  return Number(rec?.value?.version) >= ACCEPTED_VERSION;
}
