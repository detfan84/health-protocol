// Screen tests (jsdom): the two things the day depends on being drawn right —
// Today grouped rather than listed, and an editor that cannot eat the
// instructions it is used to edit.

import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

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

const store = await import('../src/app/store.js');
const { viewToday } = await import('../src/app/ui/viewToday.js');
const { viewEditor } = await import('../src/app/ui/viewEditor.js');

const tick = () => new Promise((r) => setTimeout(r, 0));
async function settled(n = 6) { for (let i = 0; i < n; i++) await tick(); }

function draw(view) {
  const main = document.querySelector('main');
  while (main.firstChild) main.removeChild(main.firstChild);
  main.append(view);
  return main;
}

const NOTES = 'Tool: a soft ball.\n\nCareful: never force the range. Stop at sharp pain.';

function dayLongProtocol() {
  const hour = (h) => `${String(h).padStart(2, '0')}:00`;
  return {
    id: 'p-day', name: 'All day', active: true, phases: [],
    blocks: Array.from({ length: 6 }, (_, i) => ({
      id: `b${i}`, name: `Block ${i}`, start: hour(i + 5), end: hour(i + 6), order: i,
      items: [
        { id: `b${i}-x`, name: `Item ${i}a`, notes: NOTES },
        { id: `b${i}-y`, name: `Item ${i}b` },
      ],
    })),
    createdAt: 'x', updatedAt: 'x',
  };
}

test('Today draws the day in groups, and a tap moves an item to Done', async () => {
  store._resetForTests();
  await store.ready({ name: 'screens-1' });
  await store.saveProtocol(dayLongProtocol());

  draw(await viewToday({}));
  await settled();

  const titles = [...document.querySelectorAll('.group-title, details.group > summary')]
    .map((e) => e.textContent);
  assert.ok(titles.length > 0, 'the day is grouped, not one flat list');
  assert.ok(
    titles.some((t) => t.startsWith('Now')) || titles.some((t) => t.startsWith('Still open')),
    'whatever the clock says, there is a group for what is open',
  );
  assert.ok(
    titles.every((t) => !/%|\bof\b/.test(t)),
    'group labels count what is inside a drawer — they never score the person',
  );
  assert.equal(document.querySelectorAll('.card.now').length <= 3, true, 'only open blocks read as now');

  // Tap the first check on screen; it should leave its group for Done.
  const btn = document.querySelector('.card:not(.announce-card) button.check');
  const label = btn.getAttribute('aria-label');
  btn.dispatchEvent(new Event('click'));
  await settled(10);

  assert.equal(btn.getAttribute('aria-pressed'), 'true', 'the receipt paints on the button');
  const done = [...document.querySelectorAll('details.group > summary')]
    .find((s) => s.textContent.startsWith('Done'));
  assert.ok(done, 'a Done group appears once something is done');
  assert.match(done.textContent, /Done · 1/);
  const inDone = [...done.parentElement.querySelectorAll('button.check')]
    .some((b) => b.getAttribute('aria-label') === label);
  assert.ok(inDone, 'the item that was tapped is the one inside Done');
});

test('the editor keeps multi-paragraph instructions instead of flattening them', async () => {
  store._resetForTests();
  await store.ready({ name: 'screens-2' });
  await store.saveProtocol(dayLongProtocol());

  draw(await viewEditor({ protocolId: 'p-day', done: () => {} }));
  await settled();

  const fields = [...document.querySelectorAll('textarea')];
  const notes = fields.find((t) => t.value === NOTES);
  assert.ok(notes, 'notes are edited in a textarea — a text input strips every newline');
  assert.ok(notes.value.includes('\n\n'), 'and the paragraph break survives being drawn');
});

test('the disclaimer gates the app until it is accepted, and the acceptance is written down', async () => {
  const { viewDisclaimer, accepted, ACCEPTED_VERSION, ACCEPTED_KEY } =
    await import('../src/app/ui/viewDisclaimer.js');

  store._resetForTests();
  await store.ready({ name: 'screens-3' });

  assert.equal(await accepted(), false, 'a fresh device has agreed to nothing');

  let opened = false;
  draw(viewDisclaimer({ onAccept: () => { opened = true; } }));
  const text = document.querySelector('main').textContent;
  assert.match(text, /not medical advice/i);
  assert.match(text, /Physical risk is real/i, 'the specific risks are named, not implied');
  assert.match(text, /stays on this device/i);

  const btn = [...document.querySelectorAll('button')].find((b) => /I understand/.test(b.textContent));
  assert.ok(btn, 'there is exactly one way past it');
  btn.dispatchEvent(new Event('click'));
  await settled(10);

  assert.equal(opened, true, 'accepting opens the app');
  assert.equal(await accepted(), true);
  const rec = await store.getSetting(ACCEPTED_KEY);
  assert.equal(rec.value.version, ACCEPTED_VERSION, 'the version is recorded, so new wording can ask again');
  assert.ok(rec.value.at, 'and when');
});
