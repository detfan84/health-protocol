// The post-item sheet (D42, amended by R25) — where findings actually get made,
// and the sided findings Kevin asked for on 1 Sep.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

const dom = new JSDOM('<!doctype html><html><body><main></main><nav class="tabs"></nav></body></html>', { url: 'http://localhost/' });
for (const k of ['window', 'document', 'HTMLElement', 'Event', 'AbortController', 'AbortSignal', 'localStorage']) {
  globalThis[k] = k === 'window' ? dom.window : dom.window[k];
}
const libText = await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8');
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(libText), text: async () => libText });

const store = await import('../src/app/store.js');
const { findingSheet } = await import('../src/app/ui/findingSheet.js');
const { makeEvent, weighFindings, sideOf, weightOf, BASELINE } = await import('../src/app/composer/findings.js');
const settled = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const fire = (el) => el.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

const ITEM = {
  id: 'pt-figure4-press', name: 'Figure-4 with the knee pressed away',
  type: 'practice', sides: true,
  target: ['deep-hip-rotators', 'glutes', 'hip', 'groin'],
};

/* ------------------------------ sided weights ----------------------------- */

test('a finding can carry a side, and the weight table can read it back', () => {
  const NOW = new Date('2026-09-02T12:00:00Z');
  const right = [makeEvent({ kind: 'hot-spot', nodes: ['hip'], side: 'right', at: '2026-09-01T09:00:00Z' })];
  const table = weighFindings({ events: right, now: NOW });
  assert.ok(weightOf(table, 'hip') > BASELINE);
  assert.equal(sideOf(table, 'hip'), 'right');

  // Strict: one unsided report and the claim drops back to the whole node.
  const mixed = weighFindings({
    events: [...right, makeEvent({ kind: 'hot-spot', nodes: ['hip'], at: '2026-09-01T10:00:00Z' })],
    now: NOW,
  });
  assert.equal(sideOf(mixed, 'hip'), null, 'a side was claimed that not every report made');
  // And conflicting sides likewise.
  const both = weighFindings({
    events: [...right, makeEvent({ kind: 'hot-spot', nodes: ['hip'], side: 'left', at: '2026-09-01T11:00:00Z' })],
    now: NOW,
  });
  assert.equal(sideOf(both, 'hip'), null);
  assert.throws(() => makeEvent({ kind: 'hot-spot', nodes: ['hip'], side: 'both' }), /left or right/);
});

test('the dealt why names the side when every report agrees on it', async () => {
  const { scoreCandidates } = await import('../src/app/composer/dealer.js');
  const { buildLedger } = await import('../src/app/composer/ledger.js');
  const lib = JSON.parse(libText);
  const itemsById = Object.fromEntries(lib.items.map((i) => [i.id, i]));
  const NOW = new Date('2026-09-02T12:00:00Z');
  const ledger = buildLedger({ days: [], itemsById, now: NOW });
  const weights = weighFindings({
    events: [makeEvent({ kind: 'muscle-gave-out', nodes: ['glutes'], side: 'right', at: '2026-09-01T09:00:00Z' })],
    now: NOW,
  });
  const gluteWork = scoreCandidates({ items: lib.items, ledger, weights })
    .find((c) => c.node === 'glutes');
  assert.ok(gluteWork, 'nothing scored against the glutes');
  assert.match(gluteWork.why, /right side/, 'the why lost the side the person reported');
});

/* -------------------------------- the sheet ------------------------------- */

async function freshSheet(name) {
  store._resetForTests();
  await store.ready({ name });
  const sheet = findingSheet(ITEM);
  document.querySelector('main').replaceChildren(sheet);
  sheet.open = true;
  return sheet;
}

test('the sheet is optional, quiet, and absent where nothing could attach', () => {
  assert.equal(findingSheet({ id: 'x', name: 'A supplement', type: 'intake' }), null);
  const sheet = findingSheet(ITEM);
  assert.equal(sheet.open, false, 'the sheet must start folded — check-off alone is complete');
  assert.match(sheet.textContent, /check on its own is complete/i);
});

test('a middling rating asks nothing; a 5 asks once, with the ruled chips', async () => {
  const sheet = await freshSheet('sheet-rate');
  const rate = (n) => fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === String(n)
    && /felt like/.test(b.getAttribute('aria-label') ?? '')));
  rate(3);
  await settled();
  assert.doesNotMatch(sheet.textContent, /What stopped you/, 'a 3 was treated as a problem');
  rate(5);
  await settled();
  assert.match(sheet.textContent, /What stopped you/);
  const labels = [...sheet.querySelectorAll('button')].map((b) => b.textContent);
  assert.ok(labels.includes('The muscle gave out'));
  assert.ok(labels.includes('I ran out of steam'));
  assert.ok(labels.includes('It gave way or felt unstable'));
  assert.ok(labels.includes('Leave it'), 'no explicit way to skip the follow-up');
  const events = await store.loadFindings();
  assert.deepEqual(events.map((e) => e.kind).sort(), ['rating', 'rating']);
  assert.equal(events.find((e) => e.rating === 5).itemId, ITEM.id);
});

test('muscle gave out charges the muscle, on the side the person picked', async () => {
  const sheet = await freshSheet('sheet-gave-out');
  fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === 'Right'));
  fire([...sheet.querySelectorAll('button')].find((b) => /a 5 of 5/.test(b.getAttribute('aria-label') ?? '')));
  await settled();
  fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === 'The muscle gave out'));
  await settled();
  const events = await store.loadFindings();
  const gave = events.find((e) => e.kind === 'muscle-gave-out');
  assert.ok(gave, 'the chip recorded nothing');
  assert.deepEqual(gave.nodes, ITEM.target);
  assert.equal(gave.side, 'right');
  assert.match(sheet.textContent, /strengthening rides along/, 'no receipt read back');
  assert.doesNotMatch(sheet.textContent, /What stopped you/, 'the one follow-up did not close');
});

test('ran out of steam and gave way charge nothing, and say so honestly', async () => {
  for (const [chip, kind, receipt] of [
    ['I ran out of steam', 'ran-out-of-steam', /system limit/],
    ['It gave way or felt unstable', 'gave-way', /stop-and-look/],
  ]) {
    const sheet = await freshSheet(`sheet-${kind}`);
    fire([...sheet.querySelectorAll('button')].find((b) => /a 4 of 5/.test(b.getAttribute('aria-label') ?? '')));
    await settled();
    fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === chip));
    await settled();
    const events = await store.loadFindings();
    const it = events.find((e) => e.kind === kind);
    assert.ok(it, `${kind} recorded nothing`);
    assert.equal(it.nodes, undefined, `${kind} was given anatomy to charge`);
    assert.match(sheet.textContent, receipt);
    const table = weighFindings({ events, now: new Date() });
    assert.deepEqual(table, {}, `${kind} moved a weight`);
  }
});

test('leaving the follow-up is itself recorded, without arithmetic', async () => {
  const sheet = await freshSheet('sheet-skip');
  fire([...sheet.querySelectorAll('button')].find((b) => /a 5 of 5/.test(b.getAttribute('aria-label') ?? '')));
  await settled();
  fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === 'Leave it'));
  await settled();
  const events = await store.loadFindings();
  assert.ok(events.some((e) => e.kind === 'follow-up-skipped'));
  assert.deepEqual(weighFindings({ events, now: new Date() }), {});
});

test('hot spot, eased up, and deal-this-less all work from the sheet', async () => {
  const sheet = await freshSheet('sheet-taps');
  fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === 'Left'));
  fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === 'Found a hot spot'));
  fire([...sheet.querySelectorAll('button')].find((b) => b.textContent === 'It eased up'));
  fire([...sheet.querySelectorAll('button')].find((b) => /Deal this one less/.test(b.textContent)));
  await settled();
  const events = await store.loadFindings();
  const kinds = events.map((e) => e.kind).sort();
  assert.deepEqual(kinds, ['eased-up', 'hot-spot', 'not-helpful']);
  assert.equal(events.find((e) => e.kind === 'hot-spot').side, 'left');
  assert.equal(events.find((e) => e.kind === 'not-helpful').nodes, undefined,
    'helpfulness reached anatomy — difficulty is not helpfulness');
});
