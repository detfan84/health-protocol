// announcer.js — failures speak here (ruling B, Aug 18 2026).
//
// Nothing in this app may fail into silence. Every storage write runs
// through guarded(); anything that rejects lands ON SCREEN, in plain words,
// persistent until addressed — with the one honest remedy (retry the real
// write) and never a fabricated success. The console keeps full technical
// detail, but the console is never the only witness.
//
// What is promised and what is not:
//   - UI paints success only after the write confirms (callers pass their
//     painting as onOk; it runs after the awaited write, never before).
//   - Typed content is never discarded on failure. Fields keep their text;
//     the card offers Copy as the last-resort escape hatch.
//   - No record is ever written to REPRESENT a failure (ruling A/B): the
//     stored data stays honestly unlogged until a write succeeds.
//   - A best-effort breadcrumb goes to the separate failLog channel and is
//     surfaced at next launch until dismissed.
//
// Like every UI module here: no module-scope DOM access, so it imports
// cleanly in Node for tests.

import { h, clear } from './dom.js';
import { recordFailure, pendingFailures, dismissFailures } from '../failLog.js';

/* ------------------------------ plumbing ------------------------------ */

let host = null;

function ensureHost() {
  if (host && document.body.contains(host)) return host;
  host = h('div.announcer');
  document.body.append(host);
  return host;
}

function hm(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toTimeString().slice(0, 5);
}

/** Plain-language reading of the storage errors browsers actually throw. */
export function plainReason(error) {
  switch (error?.name) {
    case 'QuotaExceededError':
      return 'The browser reports its storage is full.';
    case 'InvalidStateError':
      return 'The storage connection closed unexpectedly.';
    case 'NotFoundError':
      return 'Part of the storage is unavailable.';
    case 'VersionError':
      return 'Another tab has the database open at a different version.';
    default:
      return '';
  }
}

function techLine(error) {
  const name = error?.name ?? 'Error';
  const msg = error?.message ?? String(error ?? 'unknown');
  return `${name}: ${msg}`;
}

/* ------------------------------ the card ------------------------------ */

/**
 * Put a failure on screen. Persistent until addressed — no timers, nothing
 * vanishes on its own. Retry re-runs the REAL action; on success the card
 * clears and the caller's onOk paints, exactly as a first-try success would.
 */
export function announceFailure({ what, detail, error, action, onOk, copyText }) {
  const reasonEl = h('p', {}, plainReason(error));
  const techEl = h('p.tech', {}, techLine(error));
  const statusEl = h('p.tech', {});

  const card = h(
    'div.announce-card',
    { role: 'alert' },
    h('strong', {}, "This didn't save."),
    h('p', {}, detail ?? `${what ?? 'A change'} didn't reach the device's storage.`),
    reasonEl,
    techEl,
    statusEl,
  );

  const actions = h('div.announce-actions');

  if (typeof action === 'function') {
    const retryBtn = h('button.btn', {
      onclick: async () => {
        for (const b of actions.querySelectorAll('button')) b.disabled = true;
        retryBtn.textContent = 'Retrying…';
        try {
          const value = await action();
          onOk?.(value);
          card.remove();
        } catch (err2) {
          console.error('[protocol-app] retry failed:', what, err2);
          recordFailure({ what: `${what ?? 'A write'} (retry)`, error: err2 });
          reasonEl.textContent = plainReason(err2);
          techEl.textContent = techLine(err2);
          statusEl.textContent = `Tried again at ${hm(new Date().toISOString())} — still failing.`;
          for (const b of actions.querySelectorAll('button')) b.disabled = false;
          retryBtn.textContent = 'Retry';
        }
      },
    }, 'Retry');
    actions.append(retryBtn);
  }

  if (typeof copyText === 'function') {
    actions.append(
      h('button.btn.quiet', {
        onclick: async (e) => {
          const text = String(copyText() ?? '');
          try {
            await navigator.clipboard.writeText(text);
            e.target.textContent = 'Copied';
          } catch {
            // No clipboard access — show the text itself so nothing typed is ever stranded.
            if (!card.querySelector('textarea')) {
              card.append(
                h('label', {}, 'Copy it by hand:'),
                h('textarea', { readonly: true, value: text }),
              );
            }
          }
        },
      }, 'Copy the text'),
    );
  }

  actions.append(h('button.btn.quiet', { onclick: () => card.remove() }, 'Dismiss'));
  card.append(actions);
  ensureHost().append(card);
  return card;
}

/* ------------------------------- guarded ------------------------------ */

/**
 * The one door for UI writes. Runs the action; paints (onOk) only after it
 * confirms; on rejection announces loudly, drops a breadcrumb, and returns
 * { ok: false } so the caller paints nothing.
 *
 *   guarded(action, { what, detail?, copyText?, onOk?, onFail? })
 *
 * `action` must be safe to re-run whole (load fresh → change → save), so
 * Retry replays the real write, not a stale one.
 */
export async function guarded(action, opts = {}) {
  try {
    const value = await action();
    opts.onOk?.(value);
    return { ok: true, value };
  } catch (error) {
    console.error('[protocol-app] write failed:', opts.what, error);
    recordFailure({ what: opts.what, error });
    opts.onFail?.(error);
    announceFailure({ ...opts, action, error });
    return { ok: false, error };
  }
}

/* --------------------------- next-launch notes ------------------------ */

/**
 * Surface breadcrumbs from earlier sessions (ruling B, point 3). A quiet
 * status card, not an alert — the moment already had its alert. States the
 * facts and clears only when the person dismisses it.
 */
export function surfacePastFailures() {
  const entries = pendingFailures();
  if (entries.length === 0) return null;

  const list = h('div');
  for (const en of entries) {
    const d = new Date(en.at);
    const when = isNaN(d)
      ? ''
      : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${hm(en.at)}`;
    list.append(h('p.tech', {}, `${when} — ${en.what}${en.name ? ` (${en.name})` : ''}`));
  }

  const card = h(
    'div.announce-card.past',
    { role: 'status' },
    h('strong', {}, "Something didn't save earlier."),
    h('p', {},
      'These writes failed and were announced at the time. Whatever was being saved then may not be in the record — the screens show what actually stored.'),
    list,
    h('div.announce-actions', {},
      h('button.btn.quiet', {
        onclick: () => { dismissFailures(); card.remove(); },
      }, 'Dismiss'),
    ),
  );
  ensureHost().append(card);
  return card;
}

/* ----------------------------- safety net ----------------------------- */

let netInstalled = false;

/**
 * Ruling B point 5's backstop: if anything async escapes a guard, it still
 * reaches the screen. guarded() never lets its own rejections through, so
 * this only catches what the audit missed.
 */
export function installGlobalNet() {
  if (netInstalled || typeof window === 'undefined') return;
  netInstalled = true;
  window.addEventListener('unhandledrejection', (ev) => {
    console.error('[protocol-app] unhandled rejection:', ev.reason);
    announceFailure({
      what: 'A background operation',
      detail: 'A background operation failed. Anything it was saving did not save.',
      error: ev.reason,
    });
  });
}

/* Test hook: forget the host so a fresh document gets a fresh one. */
export function _resetForTests() {
  host = null;
  netInstalled = false;
}
