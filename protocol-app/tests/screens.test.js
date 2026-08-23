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

test('a past day can be looked at and corrected, and writes land on that day', async () => {
  store._resetForTests();
  await store.ready({ name: 'screens-4' });
  await store.saveProtocol(dayLongProtocol());

  const { localDateKey } = await import('../src/lib/core.js');
  const { addDays } = await import('../src/lib/cadence.js');
  const yesterday = addDays(localDateKey(), -1);

  let asked = null;
  draw(await viewToday({ date: yesterday, reload: (o) => { asked = o; } }));
  await settled();

  const main = document.querySelector('main');
  assert.match(main.textContent, /already happened/, 'the screen says plainly that this is not today');
  assert.equal(main.querySelector('h1').textContent, 'That day');
  assert.equal(main.querySelector('.card.now'), null, 'nothing is "now" on a day that is over');

  // Ticking something off files it under THAT day, not under today.
  const btn = main.querySelector('button.check');
  btn.dispatchEvent(new Event('click'));
  await settled(10);

  const then = await store.loadDay(yesterday);
  const now = await store.loadDay(localDateKey());
  assert.equal(Object.keys(then.checks).length, 1, 'the correction landed on the day being corrected');
  assert.deepEqual(now.checks, {}, 'and today was left alone');

  // The date picker cannot reach into the future.
  const picker = main.querySelector('input[type=date]');
  assert.equal(picker.value, yesterday);
  assert.equal(picker.max, localDateKey(), 'there is no record of a day that has not happened');

  // The arrows ask the shell to move; they never navigate by themselves.
  [...main.querySelectorAll('button')].find((b) => b.textContent === '‹').dispatchEvent(new Event('click'));
  assert.deepEqual(asked, { date: addDays(yesterday, -1) });
});

test('a body-work card renders as a card: five fields, a warning, and photos', async () => {
  store._resetForTests();
  await store.ready({ name: 'screens-5' });
  await store.saveProtocol({
    id: 'p-card', name: 'Body work', active: true, phases: [],
    blocks: [{
      id: 'b', name: 'Release & load', order: 0,
      items: [{
        id: 'bw-hip',
        name: 'Front of hip',
        fields: {
          tool: 'Firm lacrosse ball',
          release: 'Lie face down, ball at the front-outside of the hip.',
          load: 'Glute bridge ×10 slow.',
          notice: 'Knee-to-chest goes further with less pinch.',
          careful: 'If a hip clicks or catches, do not chase depth.',
        },
        photos: [{ set: 'Kneeling_Hip_Flexor', caption: 'Half-kneeling hip flexor.' },
                 { set: 'Butt_Lift_Bridge', caption: 'The load.', approx: true }],
      }],
    }],
    createdAt: 'x', updatedAt: 'x',
  });

  draw(await viewToday({}));
  await settled();

  const row = [...document.querySelectorAll('.row')].find((r) => /Front of hip/.test(r.textContent));
  assert.ok(row, 'the card is on the screen');

  const labels = [...row.querySelectorAll('.field-label')].map((e) => e.textContent);
  assert.deepEqual(labels, ['Tool', 'Release', 'Load', 'Notice', 'Careful'],
    'five fields, as five fields — not one blob of notes');

  const careful = row.querySelector('.field-line.careful');
  assert.ok(careful, 'careful is drawn as a warning, not as another paragraph');
  assert.match(careful.textContent, /do not chase depth/);

  const imgs = [...row.querySelectorAll('img.photo')];
  assert.equal(imgs.length, 2, 'both photo sets are there');
  assert.match(imgs[0].getAttribute('src'), /Kneeling_Hip_Flexor_0\.jpg$/, 'starts on the first frame');
  assert.equal(imgs[0].getAttribute('loading'), 'lazy', 'a closed card costs no data');
  assert.match(row.textContent, /close, not exact/, 'an approximate photo says so');
});

test('the shipped starter content is real, valid, and free of one person’s regimen', async () => {
  const { readFile } = await import('node:fs/promises');
  const { validateFile } = await import('../src/lib/protocolFile.js');
  const text = await readFile(new URL('../src/content/starter.json', import.meta.url), 'utf8');

  const v = validateFile(text);
  assert.equal(v.ok, true, `starter content must import cleanly: ${JSON.stringify(v.errors)}`);

  const protocols = v.value.data.protocols;
  assert.ok(protocols.length >= 2);

  // What ships switched ON is the point: an app whose content arrives
  // disabled is the exact failure this content exists to fix. The only
  // exceptions are alternate strength routines — you do one of those on a
  // given day, not all five — and each must say so in its own notes.
  const onByDefault = ['seed-daily-flow', 'seed-support', 'seed-body-work'];
  for (const id of onByDefault) {
    const p = protocols.find((x) => x.id === id);
    assert.ok(p, `${id} must ship`);
    assert.equal(p.active, true, `${id} must arrive switched on`);
  }
  for (const p of protocols.filter((x) => x.active !== true)) {
    assert.match(p.id, /^seed-routine-/, `${p.name} ships switched off without being an alternate routine`);
    assert.match(p.notes ?? '', /switch this on/i, `${p.name} must say how to turn it on`);
  }
  assert.ok(
    protocols.some((p) => p.id.startsWith('seed-routine-') && p.active === true),
    'at least one strength routine is on, or strength is invisible again',
  );

  const items = protocols.flatMap((p) => p.blocks.flatMap((b) => b.items));
  assert.ok(items.length >= 50, `expected a real library, got ${items.length} items`);
  assert.ok(items.some((i) => i.fields?.release && i.fields?.careful), 'body-work cards survive the trip');
  assert.ok(items.some((i) => i.photos?.length), 'so do the photographs');
  assert.ok(items.some((i) => i.cadence?.kind === 'everyNDays'), 'and their frequencies');

  // Decision 3: no brand-name supplement content, and nobody else's regimen.
  const blob = JSON.stringify(protocols).toLowerCase();
  for (const word of ['rho ', 'boost blenz', 'methylene blue', 'parasite', 'binder', 'nattokinase']) {
    assert.equal(blob.includes(word), false, `shipped content must not carry "${word}"`);
  }
  // And no first-person laterality left over from one body.
  for (const phrase of ['the right hip', 'right shoulder subluxes', 'surgically altered']) {
    assert.equal(blob.includes(phrase), false, `shipped content still says "${phrase}"`);
  }
});

test('no screen ever prints the word "null" at a person', async () => {
  store._resetForTests();
  await store.ready({ name: 'screens-6' });
  await store.saveProtocol(dayLongProtocol());

  const { localDateKey } = await import('../src/lib/core.js');
  const { addDays } = await import('../src/lib/cadence.js');

  // append(null) renders the string "null" — h() drops nulls among children,
  // the raw DOM API does not, and the two are easy to mix up.
  for (const date of [undefined, addDays(localDateKey(), -1)]) {
    draw(await viewToday({ date, reload: () => {} }));
    await settled();
    const text = document.querySelector('main').textContent;
    assert.equal(/\bnull\b|\bundefined\b|\[object Object\]/.test(text), false,
      `a raw value reached the screen for date=${date ?? 'today'}: ${text.slice(0, 200)}`);
  }
});

test('sets and reps are recorded, shown back, and survive an un-tick', async () => {
  store._resetForTests();
  await store.ready({ name: 'screens-7' });
  const { localDateKey } = await import('../src/lib/core.js');
  const { addDays } = await import('../src/lib/cadence.js');
  const today = localDateKey();
  const lastWeek = addDays(today, -7);

  await store.saveProtocol({
    id: 'p-train', name: 'Strength', active: true, phases: [],
    blocks: [{
      id: 'b', name: 'Full Body', order: 0,
      items: [
        { id: 'ex-squat', name: 'Squat', tracking: 'sets', target: { sets: 3, reps: 10 } },
        { id: 'ex-plank', name: 'Plank', tracking: 'duration', target: { seconds: 30 } },
        { id: 'plain', name: 'Just a tick' },
      ],
    }],
    createdAt: 'x', updatedAt: 'x',
  });

  // Last week: 3 × 8 at 20 kg — the numbers today should be shown against.
  await store.saveDay({
    date: lastWeek, checks: { 'ex-squat': { at: 'x' } }, food: [],
    log: { 'ex-squat': { sets: [{ reps: 8, kg: 20 }, { reps: 8, kg: 20 }, { reps: 8, kg: 20 }] } },
    updatedAt: 'x',
  });

  draw(await viewToday({}));
  await settled();

  const row = [...document.querySelectorAll('.row')].find((r) => /Squat/.test(r.textContent));
  assert.match(row.textContent, /Last time/, 'training against last time is the point of writing it down');
  assert.match(row.textContent, /8 @ 44 lb/, 'shown in the person’s own units, from kilograms underneath');
  assert.match(row.textContent, /Asked for: 3 × 10/);

  const plain = [...document.querySelectorAll('.row')].find((r) => /Just a tick/.test(r.textContent));
  assert.equal(plain.querySelector('.training'), null, 'an ordinary item gets no logger — one tap is still the ask');

  // Log a set: it records, and it ticks the item, because doing it is doing it.
  const logBtn = [...row.querySelectorAll('button')].find((b) => /Log a set/.test(b.textContent));
  assert.ok(logBtn);
  logBtn.dispatchEvent(new Event('click'));
  await settled(12);

  let day = await store.loadDay(today);
  assert.equal(day.log['ex-squat'].sets.length, 1);
  assert.equal(day.log['ex-squat'].sets[0].reps, 10, 'the new set starts from what the plan asked for');
  assert.ok(day.checks['ex-squat'], 'logging work marks the work done');

  // Type real numbers into it.
  const inputs = [...document.querySelectorAll('.set-row input')];
  inputs[0].value = '12';
  inputs[0].dispatchEvent(new Event('change'));
  await settled(10);
  inputs[1].value = '95';
  inputs[1].dispatchEvent(new Event('change'));
  await settled(10);

  day = await store.loadDay(today);
  assert.equal(day.log['ex-squat'].sets[0].reps, 12);
  assert.ok(Math.abs(day.log['ex-squat'].sets[0].kg - 95 * 0.45359237) < 0.01, 'stored in kilograms');

  // Un-ticking must never destroy typed numbers (ruling B).
  const check = row.querySelector('button.check');
  check.dispatchEvent(new Event('click'));
  await settled(12);
  day = await store.loadDay(today);
  assert.equal(day.checks['ex-squat'], undefined, 'the tick came off');
  assert.equal(day.log['ex-squat'].sets[0].reps, 12, 'and the work you wrote down is still there');
});

test('the library is comprehensive, merged, and every item can be picked up', async () => {
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8');
  const lib = JSON.parse(text);

  // The point of the app: a large shelf people self-select from, not a
  // curated day for one person (Kevin, 23 Aug).
  assert.ok(lib.items.length >= 250, `the library should be comprehensive, got ${lib.items.length}`);

  const kinds = {};
  for (const it of lib.items) kinds[it.kind] = (kinds[it.kind] ?? 0) + 1;
  for (const kind of ['exercise', 'stretch', 'bodywork', 'practice', 'selftest']) {
    assert.ok(kinds[kind] >= 10, `${kind}: only ${kinds[kind] ?? 0} — a filter with nothing behind it is worse than no filter`);
  }

  // Merged, not discarded: a name that exists in two source files keeps what
  // both knew, and does not vanish from its own category.
  const names = lib.items.map((i) => i.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'the same movement must not appear twice');
  const dog = lib.items.find((i) => /downward dog/i.test(i.name));
  assert.ok(dog, 'a stretch that also exists in the exercise library survives as itself');
  assert.equal(dog.kind, 'stretch');
  assert.ok(dog.fields?.release, 'and keeps its how-to');

  // Everything a person can pick has enough to act on.
  for (const it of lib.items) {
    assert.ok(it.id && it.name, 'every item is identifiable');
    assert.ok(it.kind, `${it.name} has no kind`);
    const actionable = it.fields?.release || it.why || it.levels?.length;
    assert.ok(actionable, `${it.name} says nothing about what to do`);
  }

  // Searchable by the things people actually search by.
  assert.ok(new Set(lib.items.flatMap((i) => i.muscles ?? [])).size >= 40, 'muscles to filter by');
  assert.ok(new Set(lib.items.map((i) => i.equipment).filter(Boolean)).size >= 10, 'equipment to filter by');

  // And no brand-name supplement content or one person's laterality, same as
  // the shipped day (decision 3).
  const blob = text.toLowerCase();
  for (const word of ['rho ', 'boost blenz', 'the right hip', 'surgically altered']) {
    assert.equal(blob.includes(word), false, `the library must not carry "${word}"`);
  }
});
