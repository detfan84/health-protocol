// app.js — the shell. Four tabs, one main region, no router library.
// All DOM work lives inside functions so every module imports cleanly in
// Node for tests; init runs only in a real browser.
//
// Fail-loudly (ruling B): boot and render failures paint a real screen — a
// blank page with a console error is exactly the silence decision 24 exists
// to end. On every launch, breadcrumbs from earlier failed writes are
// surfaced until dismissed, and a global net catches anything async the
// guards missed.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { viewToday } from './viewToday.js';
import { viewProtocols } from './viewProtocols.js';
import { viewEditor } from './viewEditor.js';
import { viewSupply } from './viewSupply.js';
import { viewData } from './viewData.js';
import { surfacePastFailures, installGlobalNet, plainReason } from './announcer.js';
import { hhmm } from '../todayModel.js';
import { localDateKey, nowIso } from '../../lib/core.js';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'supply', label: 'Supply' },
  { id: 'data', label: 'Data' },
];

// todayStamp: what the Today screen was drawn for — the date, and the next
// moment its grouping changes. Set by viewToday, read by watchForStaleScreen.
const state = { tab: 'today', editingId: null, todayStamp: null, currentView: null };

export function applyTheme(value) {
  const el = document.documentElement;
  if (value === 'light' || value === 'dark') el.dataset.theme = value;
  else delete el.dataset.theme;
}

function techLine(error) {
  return `${error?.name ?? 'Error'}: ${error?.message ?? String(error ?? 'unknown')}`;
}

/** A screen failed to load — say so where the screen would have been. */
function paintRenderFailure(main, error) {
  clear(main);
  main.append(
    h('div.card', {},
      h('h1', {}, "This screen couldn't load."),
      h('p.muted', {}, 'Reading from storage failed, so there was nothing true to draw. Nothing was written by this failure.'),
      plainReason(error) ? h('p.muted', {}, plainReason(error)) : null,
      h('p.tech', {}, techLine(error)),
      h('button.btn', { onclick: () => render() }, 'Try again'),
    ),
  );
}

/** Storage wouldn't open at all — the app says so instead of sitting blank. */
function paintOpenFailure(error) {
  const main = document.querySelector('main');
  clear(main);
  main.append(
    h('div.card', {},
      h('h1', {}, "Storage didn't open."),
      h('p.muted', {},
        "The app couldn't open its on-device database, so nothing can load or save yet. Opening doesn't write — this failure changed nothing already stored."),
      plainReason(error) ? h('p.muted', {}, plainReason(error)) : null,
      h('p.muted', {}, 'Private-browsing windows and very full devices are the usual causes.'),
      h('p.tech', {}, techLine(error)),
      h('button.btn', { onclick: () => location.reload() }, 'Try again'),
    ),
  );
}

async function render() {
  const main = document.querySelector('main');
  try {
    // Let the outgoing screen put its house in order — flush anything typed,
    // drop the page-level listeners it added.
    if (typeof state.currentView?._beforeUnmount === 'function') state.currentView._beforeUnmount();
    state.currentView = null;
    clear(main);

    let view;
    if (state.tab === 'protocols' && state.editingId) {
      view = await viewEditor({
        protocolId: state.editingId,
        done: () => { state.editingId = null; render(); },
      });
    } else if (state.tab === 'protocols') {
      view = await viewProtocols({
        openEditor: (id) => { state.editingId = id; render(); },
        reload: () => render(),
      });
    } else if (state.tab === 'supply') {
      view = await viewSupply();
    } else if (state.tab === 'data') {
      view = await viewData({ applyTheme });
    } else {
      view = await viewToday({
        reload: () => render(),
        stamp: (s) => { state.todayStamp = s; },
      });
    }
    main.append(view);
    state.currentView = view;
    renderTabs();
    // A view may want the screen somewhere other than the top — Today opens on
    // the block you are actually in, not on the first block of the morning.
    if (typeof view._afterMount === 'function') view._afterMount();
    else window.scrollTo(0, 0);
  } catch (error) {
    console.error('[protocol-app] render failed:', error);
    paintRenderFailure(main, error);
    renderTabs();
  }
}

function renderTabs() {
  const nav = document.querySelector('nav.tabs');
  clear(nav);
  for (const t of TABS) {
    nav.append(
      h('button', {
        'aria-current': state.tab === t.id ? 'page' : null,
        onclick: () => { state.tab = t.id; state.editingId = null; render(); },
      }, t.label),
    );
  }
}

export async function init() {
  installGlobalNet();
  try {
    await store.ready();
  } catch (error) {
    console.error('[protocol-app] storage failed to open:', error);
    paintOpenFailure(error);
    return;
  }
  // A theme-read failure is cosmetic — boot continues on the default, and
  // the failure still reaches the console. Writes are what must never fail
  // quietly; this is a read with a safe fallback.
  const theme = await store.getSetting('ui.theme').catch((e) => {
    console.error('[protocol-app] theme read failed:', e);
    return null;
  });
  applyTheme(theme?.value ?? 'auto');
  await render();
  watchForStaleScreen();
  surfacePastFailures();
  askToKeepTheData();
  registerWorker();
}

/**
 * Ask the browser to treat this data as worth keeping.
 *
 * Without it, a phone that has not opened the app for a week or two can clear
 * the origin — every check-off, every lab result, gone, with no warning and
 * nothing to retry. The request is free, silent, and either granted or not;
 * the answer is stored so the Data screen can say which, honestly, instead of
 * implying a durability nobody promised.
 *
 * This is not a substitute for exporting backups and the copy on Data says so.
 */
function askToKeepTheData() {
  const s = navigator?.storage;
  if (!s?.persist) return;
  const settle = (granted) =>
    store.putSetting({ key: 'storage.persisted', value: Boolean(granted), askedAt: nowIso() })
      .catch((e) => console.error('[protocol-app] could not record the storage answer:', e));

  s.persisted?.()
    .then((already) => (already ? true : s.persist()))
    .then(settle)
    .catch((e) => console.error('[protocol-app] persistent storage request failed:', e));
}

/**
 * The service worker: offline, and an icon on the home screen that opens
 * without browser chrome. It caches code only — never data (see sw.js).
 *
 * A failure here costs offline, not correctness, so it reports to the console
 * rather than to the announcer, which is reserved for writes that did not
 * happen.
 */
function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  navigator.serviceWorker
    .register(new URL('../../../sw.js', import.meta.url), { scope: './' })
    .catch((e) => console.error('[protocol-app] offline support unavailable:', e));
}

/**
 * A phone comes back from a pocket hours later showing breakfast at dinner
 * time. Today tells us the moment it stops being true — the next block edge —
 * and the date it was drawn for; when either has passed, redraw.
 *
 * Deliberately narrow: it redraws when the day has actually moved on, not on
 * every glance, because a redraw costs whatever is half-typed on screen.
 */
function watchForStaleScreen() {
  if (typeof document.addEventListener !== 'function') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (state.tab !== 'today') return;
    const s = state.todayStamp;
    if (!s) return;
    const stale = s.date !== localDateKey() || (s.nextBoundaryHM && hhmm() >= s.nextBoundaryHM);
    if (stale) render();
  });
}

if (typeof document !== 'undefined' && document.querySelector) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); });
  } else if (document.querySelector('main')) {
    init();
  }
}
