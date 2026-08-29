// The catalogue: a frozen legacy import plus authored files, merged onto one
// shelf. These tests pin the two things that make the arrangement safe — the
// frozen import stays frozen and says where it came from, and a mistake in an
// authored file stops the build instead of quietly shrinking the library.
//
// The lesson underneath them is written in HANDOFF.md: content that does not
// ship is content that does not exist. The variant this file guards against is
// worse, because it leaves no empty screen to notice — content that ships
// minus one item, because two files claimed the same id and the build picked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { mergeCatalog, readSource, collectSources, applyFoldin, versionOf } from '../scripts/build-catalog.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const url = (p) => new URL(p, import.meta.url);

/* --------------------------- fixture helpers --------------------------- */

let tmpCount = 0;
async function fixtureDir(files) {
  const dir = resolve(tmpdir(), `catalog-test-${process.pid}-${++tmpCount}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(resolve(dir, name), typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  return dir;
}

const src = (file, items) => ({ file, items });
const item = (id, name, extra = {}) => ({ id, name, kind: 'practice', ...extra });

/* ------------------------------- the merge ------------------------------ */

test('merge: every source lands on one shelf, sorted, with the sources recorded', () => {
  const catalog = mergeCatalog([
    src('imported-legacy.json', [item('a', 'Zebra pose'), item('b', 'Apple pose')]),
    src('authored/vestibular.json', [item('c', 'Middle pose')]),
  ]);
  assert.deepEqual(catalog.items.map((i) => i.name), ['Apple pose', 'Middle pose', 'Zebra pose']);
  assert.deepEqual(catalog.sources, [
    { file: 'imported-legacy.json', items: 2 },
    { file: 'authored/vestibular.json', items: 1 },
  ]);
  assert.ok(catalog.version, 'the catalogue is versioned by its contents');
});

test('merge: no field is filtered — an authored field survives whether or not anything renders it', () => {
  // The loader's job is to put files on a shelf, not to decide which of an
  // author's fields deserve to live. A field with no render path is a review
  // finding, never a silent deletion.
  const catalog = mergeCatalog([
    src('authored/vestibular.json', [item('x', 'Eye jumps', {
      tier: 'exploratory',
      role: 'awareness-cue',
      evidence: { grade: 'established', basis: 'standard VRT literature' },
      carefulAudience: 'orthostatic',
      fields: { release: 'Head still.', careful: 'Stop on a climbing ramp.' },
    })]),
  ]);
  const [only] = catalog.items;
  assert.equal(only.tier, 'exploratory');
  assert.equal(only.role, 'awareness-cue');
  assert.equal(only.evidence.grade, 'established');
  assert.equal(only.carefulAudience, 'orthostatic', 'carried as authored — the validator is what normalises it');
});

test('merge: two files claiming one id stops the build and names both', () => {
  assert.throws(
    () => mergeCatalog([
      src('imported-legacy.json', [item('bw-neck', 'Base of skull')]),
      src('authored/release.json', [item('bw-neck', 'Something else')]),
    ]),
    (err) => {
      assert.match(err.message, /bw-neck/, 'says WHICH id');
      assert.match(err.message, /imported-legacy\.json/, 'names the first file');
      assert.match(err.message, /authored\/release\.json/, 'names the second file');
      assert.match(err.message, /do not let the build pick/i, 'says what to do');
      return true;
    },
  );
});

test('merge: two items with the same name stop the build too', () => {
  // The shelf lists by name. Two identical labels is a person unable to tell
  // which one they are adding, and a screens test that fails later and further
  // from the cause.
  assert.throws(
    () => mergeCatalog([
      src('imported-legacy.json', [item('one', 'Deep squat hang')]),
      src('authored/release.json', [item('two', 'deep squat hang')]),
    ]),
    /share the name "deep squat hang"/i,
  );
});

test('merge: an item without an id or a name stops the build rather than being skipped', () => {
  assert.throws(
    () => mergeCatalog([src('authored/broken.json', [{ name: 'No id here', kind: 'practice' }])]),
    /has no id[\s\S]*No id here/,
  );
  assert.throws(
    () => mergeCatalog([src('authored/broken.json', [{ id: 'nameless', kind: 'practice' }])]),
    /"nameless" in authored\/broken\.json has no name/,
  );
});

/* ------------------------------ reading files ---------------------------- */

test('read: a malformed authored file halts with the filename and the parse error', async () => {
  const dir = await fixtureDir({ 'bad.json': '{ "items": [ {"id":"x" ' });
  await assert.rejects(
    () => readSource(resolve(dir, 'bad.json'), 'authored/bad.json'),
    (err) => {
      assert.match(err.message, /authored\/bad\.json is not valid JSON/);
      assert.match(err.message, /not skipped/, 'and says why it is not skipped');
      return true;
    },
  );
  await rm(dir, { recursive: true, force: true });
});

test('read: a file with no items list halts rather than contributing nothing', async () => {
  const dir = await fixtureDir({ 'empty.json': { format: 'protocol-app/authored-v1' } });
  await assert.rejects(
    () => readSource(resolve(dir, 'empty.json'), 'authored/empty.json'),
    /has no "items" list/,
  );
  await rm(dir, { recursive: true, force: true });
});

test('read: a missing legacy import halts and says how to regenerate it', async () => {
  await assert.rejects(
    () => collectSources({ legacy: resolve(tmpdir(), 'nope-not-here.json'), authored: resolve(tmpdir(), 'nope') }),
    /is missing[\s\S]*npm run re-freeze/,
  );
});

/* --------------------------- the shipped article ------------------------- */

test('the frozen import says where it came from and has not been edited', async () => {
  const legacy = JSON.parse(await readFile(url('../src/content/imported-legacy.json'), 'utf8'));
  assert.equal(legacy.items.length, 258, 'the legacy catalogue is the 258 items that were generated once');
  assert.match(legacy._meta.generatedFrom, /master@4f631ae/, 'it records the exact commit it came from');
  assert.match(legacy._meta.doNotEdit, /authored/, 'and points at where new content goes instead');
  assert.equal(legacy._meta.generatorVersionHash, legacy.version, 'the generator hash it was frozen at');
});

test('the shipped catalogue is exactly its sources, and the authored file is in it', async () => {
  // The version is taken AFTER the anatomy fold-in, because the fold-in is part
  // of what ships. Hashing the merge alone left library.json carrying the
  // version string of the untagged catalogue for one build — a cache key
  // pointing at content that no longer existed.
  const nodes = new Map(JSON.parse(await readFile(url('../src/content/vocab/anatomy.json'), 'utf8')).nodes.map((n) => [n.id, n]));
  const foldin = JSON.parse(await readFile(url('../src/content/vocab/anatomy-foldin.json'), 'utf8'));
  const built = mergeCatalog(await collectSources());
  built.items = applyFoldin(built.items, foldin, nodes).items;
  built.version = versionOf(built.items);
  const shipped = JSON.parse(await readFile(url('../src/content/library.json'), 'utf8'));

  assert.equal(shipped.version, built.version, 'library.json is up to date — run `npm run catalog`');
  assert.equal(
    shipped.items.length,
    shipped.sources.reduce((n, s) => n + s.items, 0),
    'nothing was lost or invented between the sources and the shelf',
  );
  assert.ok(shipped.sources.some((s) => s.file === 'authored/vestibular.json'), 'the authored path is real, not just possible');

  const laser = shipped.items.find((i) => i.id === 'laser-path-trace');
  assert.ok(laser, 'the PT module landed in the catalogue');
  assert.equal(laser.levels.length, 3, 'and kept its three rungs');
  assert.equal(laser.levels[0].name, 'Hand-held', 'starting at the regressed rung the clinic actually used');

  // The fold-in ran, and the messiest string in the catalogue came out clean.
  const ninety = shipped.items.find((i) => i.id === 'st-ninety_ninety');
  assert.deepEqual(ninety.muscles, ['hip internal/external rotation', 'hips', 'hip internal rotation', 'hip external rotation'],
    'the source strings are kept — this is a translation, not a replacement');
  assert.deepEqual(ninety.anatomy, ['hip', 'hip-external-rotation', 'hip-internal-rotation'],
    'and the ids beside them say what it meant');
});

test('a muscle name with no fold-in row stops the build rather than shipping untranslated', () => {
  // Authoring a new muscle name is easy and silent. A catalogue that carried it
  // untranslated would drift straight back to the ninety-four-strings problem
  // the graph replaces, so it fails loudly instead (D24).
  const nodes = new Map([['hip', { id: 'hip' }]]);
  const foldin = { entries: [{ from: 'hips', to: ['hip'] }] };
  assert.throws(
    () => applyFoldin([item('a', 'A', { muscles: ['hips', 'the bit that clicks'] })], foldin, nodes),
    /the bit that clicks/,
  );
});

test('a notAnatomy row contributes nothing rather than inventing a node', () => {
  const nodes = new Map([['upper-back', { id: 'upper-back' }]]);
  const foldin = { entries: [{ from: 'posture', notAnatomy: true, why: 'a quality' }, { from: 'upper back', to: ['upper-back'] }] };
  const { items } = applyFoldin([item('a', 'A', { muscles: ['posture', 'upper back'] })], foldin, nodes);
  assert.deepEqual(items[0].anatomy, ['upper-back']);
});

test('an item with nothing to translate is left exactly as it was', () => {
  const nodes = new Map([['hip', { id: 'hip' }]]);
  const only = item('a', 'A');
  const { items } = applyFoldin([only], { entries: [] }, nodes);
  assert.equal(items[0], only, 'not even copied — untouched');
});

test('merge: an audience tag left inside fields stops the build rather than shipping inert', () => {
  // Inside `fields` it validates, ships, renders nowhere and gates nothing.
  // A field that silently does nothing is the failure this build exists to
  // catch, so it is an error and not a warning.
  assert.throws(
    () => mergeCatalog([src('authored/entry-points.json', [item('point-jaw-cheek', 'The jaw muscle in the cheek', {
      fields: { careful: 'Outside the mouth only.', carefulAudience: 'hypermobile' },
    })])]),
    (err) => {
      assert.match(err.message, /point-jaw-cheek/, 'names the item');
      assert.match(err.message, /authored\/entry-points\.json/, 'names the file');
      assert.match(err.message, /sibling of fields/, 'says where it goes instead');
      return true;
    },
  );
});

test('the frozen generator refuses to run without an explicit re-freeze', async () => {
  // It used to write library.json. One `npm run library` would then overwrite
  // the merged shelf with the legacy 258 and every authored item would vanish
  // behind a success message — a silent-data-loss path, which is the class D24
  // forbids outright.
  const before = await readFile(url('../src/content/library.json'), 'utf8');
  const appDir = new URL('..', import.meta.url);

  await assert.rejects(
    () => run(process.execPath, ['scripts/build-library.mjs'], { cwd: appDir }),
    (err) => {
      assert.equal(err.code, 1, 'it exits non-zero');
      assert.match(err.stderr, /refusing to run/i);
      assert.match(err.stderr, /npm run catalog/, 'and points at the command that was actually meant');
      assert.match(err.stderr, /npm run re-freeze/, 'and at the one that does this on purpose');
      return true;
    },
  );

  assert.equal(await readFile(url('../src/content/library.json'), 'utf8'), before, 'the shelf is untouched');
});

test('the shipped catalogue gates its careful text on an audience, beside fields not inside it', async () => {
  const shipped = JSON.parse(await readFile(url('../src/content/library.json'), 'utf8'));
  const laser = shipped.items.find((i) => i.id === 'laser-path-trace');
  assert.deepEqual(laser.carefulAudience, ['orthostatic', 'hypermobile']);
  assert.equal(laser.fields.carefulAudience, undefined, 'not in the old place');
  assert.ok(laser.fields.careful, 'and the careful text itself is still there');

  for (const it of shipped.items) {
    assert.equal(it.fields?.carefulAudience, undefined, `${it.id} still has the tag inside fields`);
  }
});

test('merge: a family-inherited evidence grade is followed, not left dangling', () => {
  // The release library grades once per technique family and points items at it.
  // A pointer is not a grade until something follows it — and an unfollowed one
  // rendered as "not graded", which is a claim about the evidence rather than a
  // gap in it. Law 5 inverted is worse than law 5 unenforced.
  const catalog = mergeCatalog([
    src('authored/release-techniques.json', [item('tech-x', 'A technique', {
      role: 'technique-guide',
      evidence: { family: 'fam-x', grade: 'Moderate, short-term.', basis: 'Reviews say so.' },
    })]),
    src('authored/release-arm.json', [item('rel-x', 'A release item', {
      evidence: { inheritsFrom: 'tech-x' },
    })]),
  ]);
  const inherited = catalog.items.find((i) => i.id === 'rel-x');
  assert.equal(inherited.evidence.grade, 'Moderate, short-term.', 'the grade is on the item');
  assert.equal(inherited.evidence.basis, 'Reviews say so.');
  assert.equal(inherited.evidence.inheritsFrom, 'tech-x', 'and where it came from is still visible');
});

test('merge: an evidence grade inherited from nowhere stops the build', () => {
  assert.throws(
    () => mergeCatalog([src('authored/release-arm.json', [item('rel-y', 'Orphan', {
      evidence: { inheritsFrom: 'tech-does-not-exist' },
    })])]),
    (err) => {
      assert.match(err.message, /rel-y/);
      assert.match(err.message, /tech-does-not-exist/);
      assert.match(err.message, /not graded/, 'and says why a dangling one is worse than none');
      return true;
    },
  );
});

test('every shipped item that claims an evidence block carries a real grade', async () => {
  const shipped = JSON.parse(await readFile(url('../src/content/library.json'), 'utf8'));
  const ungraded = shipped.items.filter((i) => i.evidence && !i.evidence.grade).map((i) => i.id);
  assert.deepEqual(ungraded, [], 'an evidence block with no grade renders as a claim about the evidence');
});

test('every loadAfter id resolves, including across category files', async () => {
  // Law 1 has no teeth if its links point at nothing. These are not read by any
  // code yet — the composer is unbuilt — but a reference that is wrong now will
  // still be wrong when something finally follows it.
  const shipped = JSON.parse(await readFile(url('../src/content/library.json'), 'utf8'));
  const byId = new Set(shipped.items.map((i) => i.id));
  const broken = [];
  let refs = 0;
  for (const it of shipped.items) {
    for (const la of it.loadAfter ?? []) {
      if (la.id == null) continue;          // a deliberate hole, named not invented
      refs += 1;
      if (!byId.has(la.id)) broken.push(`${it.id} -> ${la.id}`);
    }
  }
  assert.ok(refs > 20, `expected real load-after coverage, got ${refs} references`);
  assert.deepEqual(broken, [], 'a load partner that does not exist is law 1 with nothing behind it');
});
