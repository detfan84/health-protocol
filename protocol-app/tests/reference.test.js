// The Learn tab, and the thing it was shipping.
//
// Kevin, 29 Aug, listing what still needed fixing: "the learning tab and
// phases, no supplements."
//
// The Learn tab's food section was `DIET_PHASES` from the 2025 app — four
// numbered phases with durations, whose strategies read "Starve pathogens,
// support liver detox", "Heavy killing is done", "Gut is repaired, pathogens
// cleared". That is one person's treatment protocol for one person's diagnosis,
// on a public URL, told to a stranger in the second person.
//
// Decision 3 and PLAN §1 are explicit that a stranger gets an app, not somebody
// else's regimen, and tests/screens.test.js has guarded the LIBRARY against
// exactly this since the five that got past a wordlist. It never looked at
// reference.json. A guard that covers one file is a guard for one file — the
// same lesson as the null check that only ever drew Today.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ref = JSON.parse(await readFile(new URL('../src/content/reference.json', import.meta.url), 'utf8'));

/** Every string a reader sees on this screen, wherever it is nested. */
function allText(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) allText(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) allText(v, out);
  return out;
}

test('the reference does not tell a stranger what is wrong with them', () => {
  // A wordlist cannot catch the phrase nobody thought of — this codebase has
  // learned that twice. It is here for the specific vocabulary that shipped,
  // and the structural rule below is the guard that actually holds.
  const presumes = [
    /\bstarve pathogens\b/i,
    /\bpathogens? (are )?cleared\b/i,
    /\bheavy killing\b/i,
    /\byour (?:parasites|pathogens|infection|candida|biofilm)\b/i,
    /\bwhile you detox\b/i,
  ];
  const offenders = [];
  for (const line of allText(ref)) {
    for (const p of presumes) if (p.test(line)) offenders.push(line.slice(0, 90));
  }
  assert.deepEqual(offenders, [], 'the reference presumes the reader has an infection to treat');
});

test('the reference is reference, not a staged treatment plan', () => {
  // This is the rule that holds when a wordlist will not. Reference is what you
  // look up while deciding something. A numbered sequence of phases with day
  // counts is a PROTOCOL — it tells you where you are supposed to be and when,
  // which requires knowing what you are being treated for.
  //
  // Somebody's own phased plan is a fine thing for them to build in the editor,
  // where phases exist and are theirs. It is not shipped content.
  for (const section of ref.diet ?? []) {
    assert.equal(
      Boolean(section.duration), false,
      `"${section.name}" carries a duration — shipped reference does not put the reader on a schedule`,
    );
    assert.doesNotMatch(
      section.name ?? '', /^phase \d/i,
      'numbered phases in shipped reference are somebody else\'s protocol',
    );
  }
});

test('what remains is genuinely general', () => {
  // Spacing and symptoms survive because they are true of anybody: what not to
  // take within two hours of what, and where a pain can come from.
  assert.ok((ref.spacing ?? []).length >= 5, 'spacing principles are general and worth keeping');
  assert.ok((ref.symptoms ?? []).length >= 10, 'the symptom map is general and worth keeping');
});
