// UI import sanity. There's no browser in this test runner, so the UI's
// behavior is proven through the pure modules it delegates to (editorOps,
// trackerOps, todayModel, store — all tested directly). What CAN be verified
// here: every UI module parses, imports, and exports what the shell expects,
// with no module-scope DOM access. That class of typo never reaches Kevin.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('every UI module imports cleanly in Node and exports its view', async () => {
  const dom = await import('../src/app/ui/dom.js');
  assert.equal(typeof dom.h, 'function');
  assert.equal(typeof dom.clear, 'function');

  const today = await import('../src/app/ui/viewToday.js');
  assert.equal(typeof today.viewToday, 'function');

  const protocols = await import('../src/app/ui/viewProtocols.js');
  assert.equal(typeof protocols.viewProtocols, 'function');

  const editor = await import('../src/app/ui/viewEditor.js');
  assert.equal(typeof editor.viewEditor, 'function');

  const supply = await import('../src/app/ui/viewSupply.js');
  assert.equal(typeof supply.viewSupply, 'function');

  const data = await import('../src/app/ui/viewData.js');
  assert.equal(typeof data.viewData, 'function');

  // the shell must import without touching the (absent) DOM
  const app = await import('../src/app/ui/app.js');
  assert.equal(typeof app.init, 'function');
  assert.equal(typeof app.applyTheme, 'function');
});
