// Same guarantee ui-imports gives the original modules, extended to the
// fail-loudly layer: announcer and failLog import in bare Node — no DOM, no
// localStorage — with no module-scope access to either. This file must NOT
// set up jsdom; its whole point is the absence of a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('fail-loudly modules import cleanly in Node and export their surface', async () => {
  const log = await import('../src/app/failLog.js');
  assert.equal(typeof log.recordFailure, 'function');
  assert.equal(typeof log.pendingFailures, 'function');
  assert.equal(typeof log.dismissFailures, 'function');

  // With no localStorage at all, the breadcrumb channel reports honestly
  // instead of throwing — best-effort by ruling, even here.
  assert.equal(log.recordFailure({ what: 'x' }), false);
  assert.deepEqual(log.pendingFailures(), []);
  assert.equal(log.dismissFailures(), false);

  const ann = await import('../src/app/ui/announcer.js');
  assert.equal(typeof ann.guarded, 'function');
  assert.equal(typeof ann.announceFailure, 'function');
  assert.equal(typeof ann.surfacePastFailures, 'function');
  assert.equal(typeof ann.installGlobalNet, 'function');
  assert.equal(typeof ann.plainReason, 'function');
});
