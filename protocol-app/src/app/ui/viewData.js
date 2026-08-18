// viewData.js — your data, in your hands. Export, import (merge, never
// delete), appearance, and the one and only erase button in the app.

import { h, clear } from './dom.js';
import * as store from '../store.js';
import { localDateKey, nowIso } from '../../lib/core.js';
import { STORES } from '../../lib/schema.js';
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
              const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `protocol-app-backup-${localDateKey()}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            },
            {
              what: 'The backup export',
              detail: 'The backup file was not produced. Exporting only reads — nothing on the device changed.',
            },
          ),
      }, 'Export backup'),
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
