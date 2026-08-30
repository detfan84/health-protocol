// Supplements as a shelf, not as somebody's protocol.
//
// Kevin, 29 Aug, stopping a port that was halfway out of the old app: "it's not
// to be transferred over as it was. The supplements should be like any other
// library, just a big list of commonly taken supplements that can be adjusted
// by bottle/dose size, with the reorder tracking and stuff… Just let me select
// my supplements. It could be smart enough to have some education as to what
// each supplement does and suggest when it should be taken, so that supplements
// can fit naturally into the day arc and not riding in an awkward side car."
//
// Every rule below comes out of that sentence, plus the two laws this content
// is most likely to break: a claim travels with its grade (law 5), and a brand
// is not a substance (decision 3 — the library must read to a stranger).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lib = JSON.parse(await readFile(new URL('../src/content/library.json', import.meta.url), 'utf8'));
const supplements = lib.items.filter((i) => i.type === 'intake');

// A moment in the day, not a clock time. The whole point is that choosing a
// supplement puts it where it belongs instead of in a side car.
const TIMING = ['fasted', 'with-food', 'evening', 'before-bed', 'anytime'];

test('supplements are in the same shelf as everything else', () => {
  assert.ok(supplements.length >= 8, `only ${supplements.length} intake items — the shelf is not stocked`);
  // Not a separate file, not a separate screen, not a protocol: they are
  // catalogue items and Browse slices them like anything else.
  for (const s of supplements) {
    assert.equal(s.type, 'intake');
    assert.ok(s.name && s.why, `${s.id} says nothing about itself`);
  }
});

test('a supplement carries no movement effect', () => {
  // `effect` is release / lengthen / load / calm — the vocabulary the coverage
  // ledger counts in (TAXONOMY §2.3, "short and closed on purpose"). Magnesium
  // is not a `calm` the way a breathing drill is, and filing it as one would
  // put it in the ledger competing for the same slot. What a supplement is FOR
  // lives in its own facet.
  for (const s of supplements) {
    assert.equal(s.effect, undefined, `${s.id} claims a movement effect`);
    assert.ok(Array.isArray(s.supports) && s.supports.length, `${s.id} does not say what it is for`);
  }
});

test('every supplement says when it wants to be taken', () => {
  // The "awkward side car" clause. A substance with no timing cannot be placed
  // in the day, so it would need a screen of its own — which is the thing this
  // is not.
  for (const s of supplements) {
    assert.ok(TIMING.includes(s.timing), `${s.id} has timing "${s.timing}", which is not a moment in the day`);
  }
});

test('bottle and dose are real numbers, so reorder tracking has something to count', () => {
  for (const s of supplements) {
    const b = s.bottle;
    assert.ok(b, `${s.id} has no bottle`);
    assert.ok(Number.isInteger(b.units) && b.units > 0, `${s.id}: bottle units`);
    assert.ok(Number.isInteger(b.unitsPerDose) && b.unitsPerDose > 0, `${s.id}: units per dose`);
    assert.ok(b.unitName, `${s.id}: a unit needs a name, or the count means nothing`);
    // The supply record this seeds is { count, unitsPerDose, unitName } — the
    // same shape the existing supply screen already decrements on a tick.
    assert.ok(b.units >= b.unitsPerDose, `${s.id}: a bottle that cannot cover one dose`);
  }
});

test('every claim travels with its grade, and the grade is not decoration', () => {
  // Law 5. This is the content most likely to overclaim, and the honest half of
  // a supplement entry is the sentence about what the evidence actually is.
  for (const s of supplements) {
    assert.ok(s.evidence?.grade, `${s.id} makes a claim with no grade`);
    assert.ok((s.evidence.basis ?? '').length > 80, `${s.id}: the basis has to say something`);
  }
  // And they are not all "established", which would mean the grade is doing no
  // work — a shelf where everything is proven is a shop.
  const grades = new Set(supplements.map((s) => s.evidence.grade));
  assert.ok(grades.size > 1, `every supplement has the same grade (${[...grades]}) — that is a marketing claim`);
});

test('a brand is not a substance', () => {
  // Decision 3: the library reads to a stranger. The old app's supplement list
  // was brand names end to end — a brand belongs in `offers`, where somebody is
  // choosing where to buy, and never in the record of what a thing IS.
  const brands = ['rho ', 'boost blenz', 'silver fern', 'meraki', 'kinoko', 'standard process', 'qunol', 'naked '];
  for (const s of supplements) {
    const blob = JSON.stringify(s).toLowerCase();
    for (const b of brands) {
      assert.equal(blob.includes(b), false, `${s.id} names the brand "${b.trim()}"`);
    }
    assert.ok(s.substance, `${s.id} does not say what substance it actually is`);
  }
});

test('the risky half is not left out', () => {
  // A supplement shelf without cautions is the failure mode of every supplement
  // shelf. Interactions and "not without asking" are the part a person cannot
  // look up once they have already taken it.
  for (const s of supplements) {
    assert.ok((s.fields?.careful ?? '').length > 40, `${s.id} has no caution worth reading`);
  }
});
