// viewData.js — your data, in your hands. Export, import (merge, never
// delete), appearance, and the one and only erase button in the app.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { localDateKey, nowIso } from '../../lib/core.js';
import { STORES } from '../../lib/schema.js';
import { unitsOf } from '../../lib/units.js';
import { guarded } from './announcer.js';

const STORE_LABELS = {
  [STORES.PROTOCOLS]: 'Protocols',
  [STORES.DAYS]: 'Day records',
  [STORES.LABS]: 'Lab results',
  [STORES.SETTINGS]: 'Settings',
};

export async function viewData({ applyTheme }) {
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
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Import a backup')),
      h('p.muted', {}, 'Importing merges. Records you have that the file doesn\'t stay put; where both sides have a record, the newer one wins. An import can never delete anything.'),
      h('label', { for: 'import-file', class: 'visually-hidden' }, 'Choose a backup file'),
      fileInput,
      results,
    ),
  );

  /* ---------------------------- appearance ---------------------------- */
  const themeSetting = await store.getSetting('ui.theme');
  let persistedTheme = themeSetting?.value ?? 'auto';
  root.append(
    h('div.card', {},
      h('div.card-head', {}, h('h2', {}, 'Appearance')),
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
