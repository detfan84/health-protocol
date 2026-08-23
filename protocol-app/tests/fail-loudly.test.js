// Fail-loudly layer tests (rulings A + B, Aug 18 2026).
//
// What these prove: a write that fails cannot pass silently — it lands on
// screen with a working Retry, drops a breadcrumb for the next launch,
// paints no success, and fabricates no record. And the three-state law:
// absence stays absence, everywhere.
//
// Honest scope (no pass bars on underpowered tests): failures here are
// injected — a closed database connection and actions built to reject.
// That exercises OUR handling end to end through the real store and real
// DOM (jsdom); it does not reproduce real-browser failure modes like quota
// pressure or eviction. The five-minute device spot-check covers those.

import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

/* ----------------------------- browser shim ---------------------------- */

const dom = new JSDOM(
  '<!doctype html><html><body><main></main><nav class="tabs"></nav></body></html>',
  { url: 'http://localhost/' },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
// jsdom's EventTarget only accepts jsdom's AbortSignal, so the shim has to be
// coherent: Node's global AbortController would be rejected at addEventListener.
globalThis.AbortController = dom.window.AbortController;
globalThis.AbortSignal = dom.window.AbortSignal;
globalThis.localStorage = dom.window.localStorage;
// deliberately NOT wiring navigator.clipboard — the copy fallback is under test

const tick = () => new Promise((r) => setTimeout(r, 0));
async function settled(n = 6) { for (let i = 0; i < n; i++) await tick(); }
const cards = () => [...document.querySelectorAll('.announce-card')];
const buttonIn = (card, label) =>
  [...card.querySelectorAll('button')].find((b) => b.textContent === label);

/* Import AFTER the globals exist — these modules stay DOM-free at module
   scope (proven separately in fail-loudly-imports), but the tests below use
   them WITH a document. */
const { recordFailure, pendingFailures, dismissFailures } = await import('../src/app/failLog.js');
const { guarded, surfacePastFailures, _resetForTests: resetAnnouncer } = await import('../src/app/ui/announcer.js');
const { blankDay, normalizeDay, bumpWaterMl } = await import('../src/app/trackerOps.js');
const store = await import('../src/app/store.js');
const { viewToday } = await import('../src/app/ui/viewToday.js');
const { getOne, put } = await import('../src/lib/db.js');

function cleanSlate() {
  dismissFailures();
  for (const c of cards()) c.remove();
  resetAnnouncer();
}

/* ------------------------------ breadcrumbs ----------------------------- */

test('failLog: record → pending → dismiss; a broken channel is swallowed, not thrown', () => {
  cleanSlate();
  assert.equal(recordFailure({ what: 'The journal entry', error: new Error('boom') }), true);
  assert.equal(recordFailure({ what: 'The water count', error: { name: 'QuotaExceededError', message: 'full' } }), true);
  const pend = pendingFailures();
  assert.equal(pend.length, 2);
  assert.equal(pend[0].what, 'The journal entry');
  assert.equal(pend[1].name, 'QuotaExceededError');
  assert.ok(pend[0].at);
  assert.equal(dismissFailures(), true);
  assert.deepEqual(pendingFailures(), []);

  // best-effort by ruling: a channel that throws yields false/[], never a crash
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };
  assert.equal(recordFailure({ what: 'x' }), false);
  assert.deepEqual(pendingFailures(), []);
  assert.equal(dismissFailures(), false);
  globalThis.localStorage = real;
});

/* ------------------------------- guarded -------------------------------- */

test('guarded: success paints through onOk and announces nothing', async () => {
  cleanSlate();
  let painted = null;
  const r = await guarded(async () => 42, { what: 'A test write', onOk: (v) => { painted = v; } });
  assert.deepEqual(r, { ok: true, value: 42 });
  assert.equal(painted, 42);
  assert.equal(cards().length, 0);
});

test('guarded: failure announces persistently, records a breadcrumb, paints nothing', async () => {
  cleanSlate();
  let painted = false;
  const r = await guarded(
    async () => { throw Object.assign(new Error('disk says no'), { name: 'QuotaExceededError' }); },
    { what: 'The journal entry', onOk: () => { painted = true; } },
  );
  assert.equal(r.ok, false);
  assert.equal(painted, false);

  const [card] = cards();
  assert.ok(card, 'a card is on screen');
  assert.equal(card.getAttribute('role'), 'alert');
  assert.match(card.textContent, /This didn't save\./);
  assert.match(card.textContent, /The journal entry/);
  assert.match(card.textContent, /storage is full/); // plain-language reason
  assert.match(card.textContent, /QuotaExceededError/); // console is not the only witness

  await settled();
  assert.equal(cards().length, 1, 'nothing vanishes on its own');

  const pend = pendingFailures();
  assert.equal(pend.length, 1);
  assert.equal(pend[0].what, 'The journal entry');

  buttonIn(card, 'Dismiss').dispatchEvent(new Event('click'));
  assert.equal(cards().length, 0);
});

test('announcer: Retry re-runs the real write; success clears the card and paints', async () => {
  cleanSlate();
  let attempts = 0;
  let painted = null;
  await guarded(
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('first try fails');
      return 'second try value';
    },
    { what: 'The check-off for Take a walk', onOk: (v) => { painted = v; } },
  );
  assert.equal(painted, null, 'no paint before a confirmed write');
  const [card] = cards();
  buttonIn(card, 'Retry').dispatchEvent(new Event('click'));
  await settled();
  assert.equal(attempts, 2, 'retry ran the same real action again');
  assert.equal(painted, 'second try value', 'success painted through the same onOk');
  assert.equal(cards().length, 0, 'the card cleared itself on success');
});

test('announcer: a failed retry says so on the same card and keeps the breadcrumb trail', async () => {
  cleanSlate();
  await guarded(async () => { throw new Error('still down'); }, { what: 'The water count' });
  const [card] = cards();
  buttonIn(card, 'Retry').dispatchEvent(new Event('click'));
  await settled();
  assert.equal(cards().length, 1, 'still the one card — no stacking');
  assert.match(card.textContent, /Tried again at \d\d:\d\d — still failing\./);
  assert.equal(pendingFailures().length, 2, 'first failure + the failed retry');
});

test('announcer: with no clipboard, Copy shows the text itself — typed content is never stranded', async () => {
  cleanSlate();
  const typed = 'Calves finally quiet today. Slept 9 hours.';
  await guarded(async () => { throw new Error('nope'); }, { what: 'The journal entry', copyText: () => typed });
  const [card] = cards();
  buttonIn(card, 'Copy the text').dispatchEvent(new Event('click'));
  await settled();
  const ta = card.querySelector('textarea');
  assert.ok(ta, 'fallback text box appears');
  assert.equal(ta.value, typed);
});

test('surfacePastFailures: states when and what, and clears only on dismiss', () => {
  cleanSlate();
  recordFailure({ what: 'The check-off for Box breathing', error: { name: 'InvalidStateError', message: 'closed' } });
  const card = surfacePastFailures();
  assert.ok(card);
  assert.equal(card.getAttribute('role'), 'status', 'quiet card — its moment already had its alert');
  assert.match(card.textContent, /Something didn't save earlier\./);
  assert.match(card.textContent, /The check-off for Box breathing/);
  assert.match(card.textContent, /InvalidStateError/);
  assert.equal(pendingFailures().length, 1, 'surfacing alone does not clear');
  buttonIn(card, 'Dismiss').dispatchEvent(new Event('click'));
  assert.deepEqual(pendingFailures(), []);
  assert.equal(cards().length, 0);
  assert.equal(surfacePastFailures(), null, 'nothing pending → nothing shown');
});

/* ----------------------------- db context ------------------------------- */

test('db: operations reject with the operation and store named, original error kept as cause', async () => {
  const { openDb } = await import('../src/lib/db.js');
  const db = await openDb({ name: 'fl-ctx-1' });
  db.close();
  await assert.rejects(() => getOne(db, 'days', '2026-08-18'), (e) => {
    assert.match(e.message, /Loading \("days"\) failed/);
    assert.ok(e.cause, 'original browser error rides along');
    return true;
  });
  await assert.rejects(() => put(db, 'days', { date: '2026-08-18', updatedAt: 'x' }), /Saving \("days"\) failed/);
});

/* ------------------------- ruling A: three-state ------------------------ */

test('ruling A: absence stays absence — no write path invents a zero, no reader coerces one', () => {
  const day = blankDay('2026-08-18');
  assert.equal('waterMl' in day, false, 'a fresh record carries no water number at all');

  const n1 = normalizeDay({ date: '2026-08-18', checks: {}, food: [] }, '2026-08-18');
  assert.equal('waterMl' in n1, false, 'normalize leaves absence alone');
  const n2 = normalizeDay({ date: '2026-08-18', waterMl: Number.NaN }, '2026-08-18');
  assert.equal('waterMl' in n2, false, 'junk is absence, not zero');
  const n3 = normalizeDay({ date: '2026-08-18', waterMl: 0, updatedAt: 'x' }, '2026-08-18');
  assert.equal(n3.waterMl, 0, 'a stored, explicit zero passes through untouched');

  const same = bumpWaterMl(day, -237);
  assert.equal(same, day, 'a minus-tap on nothing changes nothing — not even updatedAt');
  const one = bumpWaterMl(day, +237);
  assert.equal(one.waterMl, 237);
  const zero = bumpWaterMl(one, -237);
  assert.equal(zero.waterMl, 0, 'tapped down to zero is a real, user-made zero — and it stays');
});

test('ruling A: a day without water survives the round trip without growing a zero', async () => {
  store._resetForTests();
  await store.ready({ name: 'fl-roundtrip-1' });
  await store.saveDay({ date: '2026-08-18', checks: { 'mv-walk': { at: '2026-08-18T08:00:00.000Z' } }, food: [], updatedAt: '2026-08-18T08:00:00.000Z' });

  const backup = await store.exportBackup();
  await store.eraseEverything();
  const res = await store.importBackup(backup);
  assert.equal(res.ok, true);

  const back = await store.loadDay('2026-08-18');
  assert.ok(back.checks['mv-walk'], 'the check survived');
  assert.equal('water' in back, false, 'and absence survived AS absence');
});

/* --------------------- the whole loop, fault-injected ------------------- */

test('a failed tap announces, paints nothing, fabricates nothing; Retry completes the real write', async () => {
  cleanSlate();
  store._resetForTests();
  const db = await store.ready({ name: 'fl-integration-1' });

  // Something has to be tappable, so give the day one real item. (The four
  // hard-coded movement prompts used to serve this purpose; they were removed
  // on 22 Aug — an empty plan is now an honestly empty day.)
  await store.saveProtocol({
    id: 'p-fl', name: 'Under test', active: true, phases: [],
    blocks: [{ id: 'b-fl', name: 'Anytime', order: 0, items: [{ id: 'i-fl', name: 'One thing' }] }],
    createdAt: 'x', updatedAt: 'x',
  });

  const main = document.querySelector('main');
  while (main.firstChild) main.removeChild(main.firstChild);
  main.append(await viewToday());

  const btn = main.querySelector('button.check');
  assert.ok(btn);
  assert.equal(btn.getAttribute('aria-pressed'), 'false');

  const waterAmount = main.querySelector('#water-amount');
  assert.equal(waterAmount.value, '', 'unlogged water reads as empty, not 0');
  assert.equal(waterAmount.placeholder, '—', 'and the empty box says so');

  // Injected failure: the storage connection dies under the app.
  db.close();
  btn.dispatchEvent(new Event('click'));
  await settled();

  assert.equal(btn.getAttribute('aria-pressed'), 'false', 'no paint without a confirmed write');
  const [card] = cards();
  assert.ok(card, 'the failure is on screen');
  assert.match(card.textContent, /This didn't save\./);
  assert.ok(pendingFailures().length >= 1, 'breadcrumb dropped for the next launch');

  // Reconnect (as a reload would), and confirm nothing was fabricated…
  store._resetForTests();
  await store.ready({ name: 'fl-integration-1' });
  const before = await store.loadDay(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));
  assert.deepEqual(before.checks, {}, 'no record was written to represent the failure');

  // …then Retry runs the SAME real write against the recovered connection.
  buttonIn(card, 'Retry').dispatchEvent(new Event('click'));
  await settled();
  assert.equal(cards().length, 0, 'card cleared on confirmed success');
  assert.equal(btn.getAttribute('aria-pressed'), 'true', 'the receipt painted after the write');

  const after = await store.loadDay(before.date);
  assert.equal(Object.keys(after.checks).length, 1, 'the tap is now truly in the record');
  cleanSlate();
});
