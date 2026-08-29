// viewData.js — your data, in your hands. Export, import (merge, never
// delete), appearance, and the one and only erase button in the app.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { localDateKey, nowIso, displayTime, timeFormatOf, deviceUses12Hour } from '../../lib/core.js';
import { STORES } from '../../lib/schema.js';
import { unitsOf, WEIGHTED_EQUIPMENT, cleanByEquipment } from '../../lib/units.js';
import { disclaimerBody } from './viewDisclaimer.js';
import { BUILD } from '../../lib/build.js';
import { remindersCard } from './viewReminders.js';
import { guarded } from './announcer.js';

const STORE_LABELS = {
  [STORES.PROTOCOLS]: 'Protocols',
  [STORES.DAYS]: 'Day records',
  [STORES.LABS]: 'Lab results',
  [STORES.SETTINGS]: 'Settings',
};

export async function viewData({ applyTheme, applyScheme, go }) {
  const root = h('div');
  root.append(
    h('h1', {}, 'Your data'),
    h('p.muted', {}, 'Everything lives on this device. Nothing is sent anywhere — there\'s no server to send it to.'),
  );

  /* ------------------------------ export ------------------------------ */
  const lastExport = await store.getSetting('backup.lastExportedAt').catch(() => null);
  const exportNote = h('p.muted', {},
    lastExport?.value
      ? `Last backup: ${new Date(lastExport.value).toLocaleDateString()} — ${lastExport.summary ?? 'exported'}.`
      : 'No backup taken from this device yet.',
  );
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Backup')),
      h('p.muted', {}, 'A backup is one file holding everything: protocols, day records, labs, settings. Keep a copy somewhere safe — phones do sometimes clear website storage.'),
      h('button.btn.primary', {
        style: 'width:100%',
        onclick: () =>
          guarded(
            async () => {
              const backup = await store.exportBackup();
              const text = JSON.stringify(backup, null, 2);
              const blob = new Blob([text], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `protocol-app-backup-${localDateKey()}.json`;
              // In the document, and revoked on a later tick: a detached
              // anchor does nothing in some browsers, and revoking the URL
              // in the same breath can cancel the download that was just
              // started — either way the click looks like it worked and no
              // file arrives.
              a.style.display = 'none';
              document.body.append(a);
              a.click();
              setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 30_000);

              const d = backup.data ?? {};
              const summary = `${d.protocols?.length ?? 0} protocols, ${d.days?.length ?? 0} days, ${d.labs?.length ?? 0} labs, ${Math.round(text.length / 1024)} KB`;
              await store.putSetting({ key: 'backup.lastExportedAt', value: nowIso(), summary });
              return summary;
            },
            {
              what: 'The backup export',
              detail: 'The backup file was not produced. Exporting only reads — nothing on the device changed.',
              // Say what was written. A download that silently never lands
              // looks exactly like one that did.
              onOk: (summary) => {
                exportNote.textContent = `Last backup: just now — ${summary}. Check your downloads; if nothing arrived, the browser blocked it.`;
              },
            },
          ),
      }, 'Export backup'),
      exportNote,
    ),
  );

  /* -------------------------- home screen ------------------------------ */
  // Shown only in a browser tab, because that is the only place it is useful.
  //
  // Two things hang off installing on iPhone, and neither is obvious: an
  // installed app is the only place the browser will consider keeping your
  // data indefinitely, and it is the only place a notification can ever
  // arrive while the app is closed. iOS gives a page no way to offer the
  // install, so the honest move is to say the steps plainly, once.
  //
  // The warning matters more than the pitch: a Home Screen app and a Safari
  // tab do not share storage. Somebody who builds a protocol in a tab and
  // then installs opens an empty app and thinks they lost everything.
  const standalone = typeof window.matchMedia === 'function'
    && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  if (!standalone) {
    root.append(
      h('div.card', {},
        h('div.card-head', {}, h('h2', {}, 'Put it on your home screen')),
        h('p.muted', {}, 'On iPhone: the Share button, then "Add to Home Screen". On Android: the browser menu, then "Install app" or "Add to Home screen".'),
        h('p.muted', {}, 'It opens like an app, works with no signal, and it is the only version a phone will keep long-term or ever notify you from.'),
        h('p.muted', {}, h('strong', {}, 'Before you do: export a backup and import it into the installed app.'), ' The installed app has its own separate storage — anything entered here in the browser will not be there.'),
      ),
    );
  }

  /* --------------------------- storage state --------------------------- */
  // Whether the browser has actually promised to keep this, said plainly.
  // The app asks once at startup; this is the answer, not a reassurance.
  const persisted = await store.getSetting('storage.persisted').catch(() => null);
  const keepLine = persisted == null
    ? 'This browser has not been asked yet, or does not offer the promise.'
    : persisted.value
      ? 'This browser has promised to keep your data until you delete it.'
      : 'This browser has NOT promised to keep your data. Phones clear storage for apps they think are idle — on iPhone, adding this to your home screen and opening it regularly is what keeps it.';
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Will this device keep it?')),
      h('p.muted', {}, keepLine),
      h('p.muted', {}, 'Either way, an exported backup is the only copy nothing on this device can take away.'),
    ),
  );

  /* ------------------------------ import ------------------------------ */
  const results = h('div.results', { 'aria-live': 'polite' });
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', id: 'import-file',
    onchange: (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      clear(results);
      guarded(
        async () => {
          const text = await file.text();
          return store.importBackup(text);
        },
        {
          what: 'The import',
          detail:
            'The import stopped before finishing. The whole import writes in one storage transaction, so nothing was partially applied — this device is exactly as it was.',
          onOk: (res) => showImportResult(res),
          onFail: () => {
            results.textContent =
              'The import stopped before finishing. Nothing on this device changed.';
            e.target.value = '';
          },
        },
      );
      function showImportResult(res) {
      const lines = [];
      if (res.ok) {
        lines.push('Imported. Nothing was deleted — imports only ever add or update.');
        for (const [storeName, s] of Object.entries(res.stats)) {
          lines.push(`${STORE_LABELS[storeName] ?? storeName}: ${s.added} added, ${s.updated} updated, ${s.kept} kept as-is (yours was newer).`);
        }
      } else {
        lines.push('That file couldn\'t be imported. Nothing on this device changed.');
        for (const err of res.errors) {
          lines.push(`• ${err.path}: ${err.message}${err.hint ? ` — ${err.hint}` : ''}`);
        }
      }
      for (const w of res.warnings ?? []) {
        lines.push(`Repaired on the way in — ${w.path}: ${w.message}`);
      }
      results.textContent = lines.join('\n');
      e.target.value = '';
      }
    },
  });
  // Pasting, as well as picking a file. Moving a JSON file from a laptop to a
  // phone is a small ordeal — mail it to yourself, find it in Downloads, hope
  // the file picker sees it — and the text is the same text either way. This
  // is also the door an AI-produced protocol comes through (decision 25: the
  // validator is the boundary, and pasting does not skip it).
  const pasted = h('textarea', {
    id: 'import-paste',
    rows: '4',
    placeholder: 'Or paste the contents of a protocol or backup file here.',
  });
  function showImportLines(res) {
    const lines = [];
    if (res.ok) {
      lines.push('Imported. Nothing was deleted — imports only ever add or update.');
      for (const [storeName, st] of Object.entries(res.stats ?? {})) {
        lines.push(`${STORE_LABELS[storeName] ?? storeName}: ${st.added} added, ${st.updated} updated, ${st.kept} kept as-is (yours was newer).`);
      }
    } else {
      lines.push("That couldn't be imported. Nothing on this device changed.");
      for (const err of res.errors ?? []) {
        lines.push(`• ${err.path}: ${err.message}${err.hint ? ` — ${err.hint}` : ''}`);
      }
    }
    for (const w of res.warnings ?? []) lines.push(`Repaired on the way in — ${w.path}: ${w.message}`);
    results.textContent = lines.join('\n');
  }
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Bring something in')),
      h('p.muted', {}, 'Importing merges. Records you have that the file doesn\'t stay put; where both sides have a record, the newer one wins. An import can never delete anything.'),
      h('label', { for: 'import-file', class: 'visually-hidden' }, 'Choose a backup file'),
      fileInput,
      h('div.field', { style: 'margin-top:var(--sp-3)' },
        h('label', { for: 'import-paste' }, 'Or paste it — easier than moving a file to a phone'),
        pasted,
      ),
      h('button.btn', {
        style: 'width:100%',
        onclick: () => {
          const text = pasted.value.trim();
          if (!text) return;
          clear(results);
          guarded(
            () => store.importFile(text),
            {
              what: 'The import',
              detail: 'The import stopped before finishing. The whole import writes in one storage transaction, so nothing was partially applied — this device is exactly as it was.',
              copyText: () => pasted.value,
              onOk: (res) => {
                showImportLines(res);
                // Clear only what actually went in; a rejected paste stays put
                // so nobody has to go and find it again.
                if (res.ok) pasted.value = '';
              },
            },
          );
        },
      }, 'Import pasted text'),
      results,
    ),
  );

  /* ---------------------------- reminders ----------------------------- */
  root.append(await remindersCard());

  /* ---------------------------- appearance ---------------------------- */
  const themeSetting = await store.getSetting('ui.theme');
  let persistedTheme = themeSetting?.value ?? 'auto';
  const schemeSetting = await store.getSetting('ui.scheme').catch(() => null);
  let persistedScheme = schemeSetting?.value ?? 'paper';
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Appearance')),
      h('div.field', {},
        h('label', { for: 'scheme' }, 'Colour scheme'),
        h('select', {
          id: 'scheme',
          onchange: (e) => {
            const chosen = e.target.value;
            guarded(
              () => store.putSetting({ key: 'ui.scheme', value: chosen, updatedAt: nowIso() }),
              {
                what: 'The colour scheme',
                onOk: () => { applyScheme?.(chosen); persistedScheme = chosen; },
                onFail: () => { e.target.value = persistedScheme; },
              },
            );
          },
        },
          [
            ['paper', 'Paper - warm neutrals'],
            ['slate', 'Slate - cool grey'],
            ['forest', 'Forest - deep green'],
            ['dusk', 'Dusk - warm dark, always'],
            ['contrast', 'Plain - maximum contrast'],
          ].map(([value, label]) =>
            h('option', { value, selected: persistedScheme === value }, label)),
        ),
      ),
      h('div.field', {},
        h('label', { for: 'theme' }, 'Theme'),
        h('select', {
          id: 'theme',
          onchange: (e) => {
            const chosen = e.target.value;
            guarded(
              () => store.putSetting({ key: 'ui.theme', value: chosen, updatedAt: nowIso() }),
              {
                what: 'The theme change',
                // Apply — and remember as reverting point — only what persisted.
                onOk: () => { applyTheme(chosen); persistedTheme = chosen; },
                onFail: () => { e.target.value = persistedTheme; },
              },
            );
          },
        },
          ['auto', 'light', 'dark'].map((t) =>
            h('option', { value: t, selected: (themeSetting?.value ?? 'auto') === t },
              t === 'auto' ? 'Match device' : t[0].toUpperCase() + t.slice(1)),
          ),
        ),
      ),
    ),
  );

  /* ------------------------------- units ------------------------------- */
  // K2: one global setting, imperial by default. It changes how numbers READ,
  // never what is stored — volumes live in millilitres underneath, so flipping
  // this re-reads history instead of reinterpreting it.
  const unitsSetting = await store.getSetting('ui.units');
  let persistedUnits = unitsOf(unitsSetting);
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Units')),
      h('p.muted', {}, 'How amounts are shown. Your records are stored in one form underneath, so switching this changes the reading, never the history.'),
      h('div.field', {},
        h('label', { for: 'units' }, 'Measurements'),
        h('select', {
          id: 'units',
          onchange: (e) => {
            const chosen = e.target.value;
            guarded(
              () => store.putSetting({ key: 'ui.units', value: chosen, updatedAt: nowIso() }),
              {
                what: 'The units change',
                onOk: () => { persistedUnits = chosen; },
                onFail: () => { e.target.value = persistedUnits; },
              },
            );
          },
        },
          [
            ['imperial', 'US — ounces, pounds'],
            ['metric', 'Metric — millilitres, kilograms'],
          ].map(([value, label]) =>
            h('option', { value, selected: persistedUnits === value }, label),
          ),
        ),
      ),
      await weightByEquipment(),
    ),
  );

  /**
   * Units that follow the equipment (Kevin, 29 Aug).
   *
   * One toggle cannot tell the truth about a rack with both on it. Kettlebells
   * are sold in kilograms nearly everywhere, including where everything else is
   * sold in pounds, so a person reads two scales and the app should not make
   * them convert one in their head every session.
   *
   * The default is "same as everything else" and stays absent until somebody
   * chooses — nobody is told their kettlebells are in kilos because kettlebells
   * usually are. Theirs might not be.
   */
  async function weightByEquipment() {
    const stored = await store.getSetting('ui.units.byEquipment');
    const prefs = cleanByEquipment(stored?.value);
    const LABEL = { dumbbell: 'Dumbbells', kettlebell: 'Kettlebells', mace: 'Steel maces' };

    const save = (eq, value) => {
      const next = { ...prefs };
      if (value) next[eq] = value; else delete next[eq];
      return guarded(
        () => store.putSetting({ key: 'ui.units.byEquipment', value: cleanByEquipment(next), updatedAt: nowIso() }),
        { what: `The units for ${LABEL[eq].toLowerCase()}`, onOk: () => { prefs[eq] = value || undefined; } },
      );
    };

    return h('div', { style: 'margin-top:var(--sp-3)' },
      h('p.muted', {}, 'Weights can read differently per piece of kit, because that is how they are sold. Nothing about your records changes — everything is stored one way underneath.'),
      ...WEIGHTED_EQUIPMENT.map((eq) => h('div.field', {},
        h('label', { for: `units-${eq}` }, LABEL[eq]),
        h('select', {
          id: `units-${eq}`,
          onchange: (e) => save(eq, e.target.value),
        },
          [
            ['', 'Same as everything else'],
            ['imperial', 'Pounds'],
            ['metric', 'Kilograms'],
          ].map(([value, label]) => h('option', { value, selected: (prefs[eq] ?? '') === value }, label)),
        ),
      )),
    );
  }

  /* ------------------------------- clock -------------------------------- */
  // Decision 23. The device's own convention is the default, because that is
  // what somebody's eyes already read without thinking. The override is for
  // the case the default cannot cover — a phone set one way by a person who
  // thinks the other way — and it changes the READING only: a block that
  // starts at 06:30 is stored as 06:30 either way, so a plan shared between
  // two people with differently-set phones is still the same plan.
  const timeSetting = await store.getSetting('ui.timeFormat');
  let persistedTime = timeFormatOf(timeSetting);
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Clock')),
      h('p.muted', {}, `How times are shown. Your device is set to ${deviceUses12Hour() ? 'AM and PM' : 'the 24-hour clock'} — following it is the default, and this only changes what you read, never what is stored.`),
      h('div.field', {},
        h('label', { for: 'time-format' }, 'Times'),
        h('select', {
          id: 'time-format',
          onchange: (e) => {
            const chosen = e.target.value;
            guarded(
              () => store.putSetting({ key: 'ui.timeFormat', value: chosen, updatedAt: nowIso() }),
              {
                what: 'The clock setting',
                onOk: () => { persistedTime = chosen; },
                onFail: () => { e.target.value = persistedTime; },
              },
            );
          },
        },
          [
            ['auto', `Follow this device (${displayTime('18:30', 'auto')})`],
            ['12', `AM and PM (${displayTime('18:30', '12')})`],
            ['24', `24-hour (${displayTime('18:30', '24')})`],
          ].map(([value, label]) =>
            h('option', { value, selected: persistedTime === value }, label),
          ),
        ),
      ),
    ),
  );

  /* -------------------------- the weekly count -------------------------- */
  // R17. PLAN promised "2 of 3 this week" on the item; content law 2 bans
  // completion meters by name. Kevin's ruling is that neither answer is
  // global — the person chooses. Off by default keeps the law's posture; on,
  // it is their own target reflected back, which some people find motivating
  // and others find is the app keeping score. The number is composer input
  // regardless of whether it is ever drawn.
  const weeklySetting = await store.getSetting('ui.weeklyCount');
  let persistedWeekly = weeklySetting?.value === true;
  const weeklyBox = h('input', {
    type: 'checkbox',
    id: 'weekly-count',
    checked: persistedWeekly,
    style: 'width:22px; height:22px; min-height:auto',
    onchange: () => {
      const want = weeklyBox.checked;
      guarded(
        () => store.putSetting({ key: 'ui.weeklyCount', value: want, updatedAt: nowIso() }),
        {
          what: 'The weekly-count setting',
          onOk: () => { persistedWeekly = want; },
          onFail: () => { weeklyBox.checked = persistedWeekly; },
        },
      );
    },
  });
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'The weekly count')),
      h('p.muted', {}, 'Anything set to a number of days a week can show how many of them you have had — "2 of 3 this week" — on the item itself. Off unless you want it. It is your own target, not a score, and the app never mentions it anywhere else.'),
      h('div.row', { style: 'border:none; align-items:center; gap:12px' },
        weeklyBox,
        h('label', { for: 'weekly-count' }, 'Show it on the item'),
      ),
    ),
  );

  /* ------------------------------ version ------------------------------ */
  // Two questions this answers, both of which came up the hard way: which
  // version is this phone actually running, and how do I make it not be an
  // old one. A phone can sit on cached code for days and look identical.
  const swInfo = 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistration().catch(() => null)
    : null;
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Version')),
      h('p.tech', {}, BUILD),
      h('p.muted', {},
        swInfo?.active
          ? 'Offline support is on, which means this device keeps a copy of the app. If the screen looks older than it should, use the button below.'
          : 'Offline support is not running on this device yet.'),
      h('button.btn', {
        style: 'width:100%',
        onclick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = 'Fetching the latest…';
          try {
            // Everything a stale phone can be holding: the worker, its caches,
            // and the browser's own copy of each file. User data is in
            // IndexedDB and is not touched by any of this.
            for (const reg of await navigator.serviceWorker?.getRegistrations?.() ?? []) {
              await reg.unregister();
            }
            for (const key of await caches?.keys?.() ?? []) await caches.delete(key);
          } catch (err) {
            console.error('[protocol-app] could not clear the cached app:', err);
          }
          // Cache-busted, so the reload cannot come back from the same copy.
          location.replace(`${location.pathname}?fresh=${Date.now()}`);
        },
      }, 'Get the latest version'),
      h('p.muted', {}, 'This only replaces the app’s code. Your protocols, records and settings are untouched.'),
    ),
  );

  /* ---------------------------- the warning ---------------------------- */
  // Re-readable, always. Consent that can only be read once is a dark pattern
  // with better manners.
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Safety and disclaimer')),
      h('details.notes', {},
        h('summary', {}, 'Read it again'),
        ...disclaimerBody(),
      ),
    ),
  );

  /* ------------------------------- erase ------------------------------ */
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Erase everything')),
      h('p.muted', {}, 'This erases everything on this device: protocols, day records, labs, settings. Imports can never do this — only this button can. If anything here matters to you, export a backup first.'),
      h('button.btn.danger', {
        style: 'width:100%',
        onclick: () => {
          const first = confirm('Erase everything on this device? Consider exporting a backup first.');
          if (!first) return;
          const second = confirm('Last check: this cannot be undone from inside the app. Erase everything?');
          if (!second) return;
          guarded(() => store.eraseEverything(), {
            what: 'The erase',
            detail:
              'The erase didn\'t finish. It runs as one storage transaction across every store, so nothing was partially removed — everything is still here.',
            onOk: () => {
              clear(results);
              alert('Erased. The app is back to a clean start.');
              location.reload();
            },
          });
        },
      }, 'Erase everything on this device'),
    ),
  );

  return root;
}
