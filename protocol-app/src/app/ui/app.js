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
import { viewSession } from './viewSession.js';
import { viewLibrary } from './viewLibrary.js';
import { viewHome } from './viewHome.js';
import { viewArea } from './viewArea.js';
import { viewReference } from './viewReference.js';
import { viewDisclaimer, accepted } from './viewDisclaimer.js';
import { surfacePastFailures, installGlobalNet, plainReason } from './announcer.js';
import { recordFailure } from '../failLog.js';
import { hhmm } from '../todayModel.js';
import { localDateKey, nowIso } from '../../lib/core.js';
import { seedPlan, baselinesOf, refreshed } from '../../lib/seed.js';

// Five destinations, and the first one is a menu rather than a list. The
// structure the app now has is: menu → area → session. A tab bar with a
// screenful of items behind every tab is what it had before, and it read as
// one mile-long page no matter which tab you were on.
const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'library', label: 'Library' },
  { id: 'reference', label: 'Learn' },
  { id: 'track', label: 'Track' },
  { id: 'data', label: 'You' },
];

// todayStamp: what the Today screen was drawn for — the date, and the next
// moment its grouping changes. Set by viewToday, read by watchForStaleScreen.
const state = {
  tab: 'home',
  editingId: null,
  todayStamp: null,
  currentView: null,
  // Which day Today is showing. null = today itself; a date key = a day being
  // looked back at (decision 21). Reset whenever a tab is tapped, because
  // "Today" should always mean today when you come back to it.
  viewingDate: null,
  // A block being run rather than listed: { protocolId, blockId }. The session
  // owns the whole screen while it lasts — no tabs, no scrolling past it.
  session: null,
  // Which shelf the library opens on, when something sent you there for one.
  shelf: null,
  // Which area page is open, if any — an area is a protocol, and its page
  // lists that protocol's parts rather than everything in the app.
  areaId: null,
};

export function applyTheme(value) {
  const el = document.documentElement;
  if (value === 'light' || value === 'dark') el.dataset.theme = value;
  else delete el.dataset.theme;
}

/** The colour scheme — a different choice from light/dark, and it survives it. */
export function applyScheme(value) {
  const el = document.documentElement;
  if (value && value !== 'paper') el.dataset.scheme = value;
  else delete el.dataset.scheme;
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
    if (state.session) {
      view = await viewSession({
        ...state.session,
        done: () => { state.session = null; render(); },
      });
      main.append(view);
      state.currentView = view;
      // Deliberately no tab bar: a session is one thing at a time, and a row
      // of tabs under it is an invitation to stop.
      document.querySelector('nav.tabs').replaceChildren();
      window.scrollTo(0, 0);
      return;
    }
    const startSession = (protocolId, blockId) => {
      state.session = { protocolId, blockId };
      render();
    };
    const goHome = () => { state.areaId = null; state.tab = 'home'; render(); };

    if (state.editingId) {
      view = await viewEditor({
        protocolId: state.editingId,
        done: () => { state.editingId = null; render(); },
      });
    } else if (state.areaId) {
      view = await viewArea({
        areaId: state.areaId,
        back: goHome,
        startSession,
        openEditor: (id) => { state.editingId = id; render(); },
      });
    } else if (state.tab === 'library') {
      view = await viewLibrary({ reload: () => render(), openOn: state.shelf });
    } else if (state.tab === 'reference') {
      view = await viewReference();
    } else if (state.tab === 'plans') {
      view = await viewProtocols({
        openEditor: (id) => { state.editingId = id; render(); },
        reload: () => render(),
        back: goHome,
      });
    } else if (state.tab === 'supply') {
      view = await viewSupply({ back: goHome });
    } else if (state.tab === 'track' || state.tab === 'day') {
      view = await viewToday({
        date: state.viewingDate ?? undefined,
        mode: state.tab === 'track' ? 'track' : 'day',
        reload: (opts) => {
          if (opts && 'date' in opts) state.viewingDate = opts.date ?? null;
          render();
        },
        stamp: (s) => { state.todayStamp = s; },
        startSession,
      });
    } else if (state.tab === 'data') {
      view = await viewData({ applyTheme, applyScheme, go: (tab) => { state.tab = tab; render(); } });
    } else {
      view = await viewHome({
        startSession,
        open: ({ area, tab, shelf }) => {
          if (area) state.areaId = area;
          if (tab) state.tab = tab;
          // Which shelf the library should open on. A door that lands you on
          // the default view and leaves you to find the filter is not a door.
          state.shelf = shelf ?? null;
          render();
        },
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
        onclick: () => {
          state.tab = t.id;
          state.editingId = null;
          state.viewingDate = null;
          state.areaId = null;
          render();
        },
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
  const scheme = await store.getSetting('ui.scheme').catch(() => null);
  applyScheme(scheme?.value ?? 'paper');

  // Nothing before this: not the tabs, not a check-off, not a glimpse of
  // somebody's routine. PLAN §2 calls the disclaimer mandatory for a
  // shareable app, and a gate you can see past is not a gate.
  const ok = await accepted().catch((e) => {
    console.error('[protocol-app] could not read the acceptance record:', e);
    return false; // unreadable means unaccepted — err toward showing it again
  });
  if (!ok) {
    const main = document.querySelector('main');
    clear(main);
    main.append(viewDisclaimer({ onAccept: () => { init(); } }));
    document.querySelector('nav.tabs').replaceChildren();
    surfacePastFailures();
    return;
  }

  await seedContentOnce();
  await render();
  watchForStaleScreen();
  surfacePastFailures();
  askToKeepTheData();
  registerWorker();
}

/**
 * The content the app ships with — put in on the first run, and kept current
 * after it.
 *
 * Without this the app opens empty — a screen that says "nothing active yet"
 * over a journal and a water tracker, which is what it did for four days
 * while a full body-work library sat in the repo. Ship the content or the app
 * is a filing cabinet.
 *
 * "Kept current" is the 29 Aug repair. This used to offer only protocols the
 * device did not have, so a REVISION to one it held could never arrive: the
 * day arc's second block was renamed, shipped, deployed, and every installed
 * app went on saying "While the kettle boils" — while the applied-version
 * record claimed the new content was in. See `lib/seed.js` for the rule and
 * for what it deliberately will not touch.
 *
 * Everything goes through the ordinary import path, so the validator sees it
 * like any other file and a broken seed cannot write half of itself.
 */
async function seedContentOnce() {
  try {
    const res = await fetch(new URL('../../content/starter.json', import.meta.url));
    if (!res.ok) throw new Error(`starter content: HTTP ${res.status}`);
    const text = await res.text();
    const file = JSON.parse(text);
    // The version is a fingerprint of the content itself, written by
    // scripts/build-content.mjs — it changes exactly when the content does.
    // Its absence used to be papered over with a constant, which froze the
    // shipped content at whatever the first launch saw. A build that forgets
    // it is a build bug, and it says so out loud rather than going quiet.
    const version = file.seedVersion ? String(file.seedVersion) : null;
    if (!version) {
      const error = new Error('starter.json has no seedVersion — run `npm run content`');
      console.error('[protocol-app]', error.message);
      recordFailure({ what: 'The shipped content version', error });
    }

    const applied = await store.getSetting('seed.applied');
    // The version check is an optimisation, and it needs the second half. A
    // device from before baselines existed can hold the current version number
    // over stale content — that is exactly the state the rename got stuck in —
    // so it does one full pass to work out where it actually stands.
    if (version && applied?.value === version && applied?.baselines) return;

    const have = await store.loadProtocols();

    // What has this device ever been OFFERED? Not the same question as what it
    // has. Somebody who deleted a seeded protocol decided something, and an app
    // that hands it back at the next content update is arguing with them — so
    // the offer is remembered separately from the result.
    //
    // Installs from before this list existed have no record of what they were
    // offered, so what they currently hold is the best evidence there is. The
    // honest cost, stated rather than hidden: a protocol deleted before this
    // upgrade can return once, at the next content change, and then stay gone.
    const offered = new Set(Array.isArray(applied?.ids) ? applied.ids : have.map((p) => p.id));

    const shipped = file.data?.protocols ?? [];
    const baselines = applied?.baselines ?? null;
    const plan = seedPlan({ shipped, have, offered, baselines: baselines ?? {} });

    const stamp = nowIso();
    const incoming = [
      ...plan.fresh,
      ...plan.refresh.map(({ shipped: p, stored }) => refreshed(p, stored, stamp)),
    ];
    if (incoming.length) {
      const out = await store.importFile(JSON.stringify({
        ...file,
        data: { ...file.data, protocols: incoming },
      }));
      if (!out.ok) throw new Error(out.errors?.map((e) => `${e.path}: ${e.message}`).join('; ') || 'invalid');
      if (plan.fresh.length) console.info(`[protocol-app] added ${plan.fresh.length} protocol(s) from the shipped content`);
      if (plan.refresh.length) {
        console.info(`[protocol-app] brought ${plan.refresh.length} protocol(s) up to date: ${plan.refresh.map((r) => r.shipped.id).join(', ')}`);
      }
    }
    // Said out loud rather than silently skipped: a plan somebody has edited
    // stops tracking the shipped content, and that is a thing worth being able
    // to find out about when their copy is missing a correction everyone else
    // got.
    if (plan.kept.length) {
      console.info(`[protocol-app] left alone because you have edited them: ${plan.kept.join(', ')}`);
    }

    for (const p of shipped) offered.add(p.id);
    // A baseline is recorded only for content this device now actually holds at
    // the shipped version. The edited ones get none, so the next update asks
    // the same question again rather than assuming their current state was
    // ours.
    const nextBaselines = { ...(baselines ?? {}) };
    for (const [id, print] of Object.entries(baselinesOf(shipped))) {
      if (!plan.kept.includes(id)) nextBaselines[id] = print;
    }
    await store.putSetting({
      key: 'seed.applied',
      value: version ?? applied?.value ?? null,
      ids: [...offered],
      baselines: nextBaselines,
      at: stamp,
    });
  } catch (error) {
    // Loud, not fatal: the app still works, and the person can import
    // anything themselves — but they should know why it is empty.
    console.error('[protocol-app] the starter content did not load:', error);
    recordFailure({ what: 'The starter content', error });
  }
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
  // When a new worker takes over, the page in front of the person is still the
  // old one. Reload once, so a deploy actually arrives instead of waiting for
  // them to close every tab — which on a phone means never.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker
    .register(new URL('../../../sw.js', import.meta.url), { scope: './' })
    .then((reg) => {
      // Ask on every launch. A phone that sits on an old copy for days is the
      // failure this whole path exists to prevent.
      reg.update?.().catch(() => undefined);
    })
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
    if (state.tab !== 'home') return;
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
