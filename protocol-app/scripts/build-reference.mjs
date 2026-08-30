// build-reference.mjs — the reading material: food, spacing, symptoms.
//
// Three files from the old app that never came across. They are reference, not
// routine: nothing here goes on a day or gets ticked, it is what you look up.
//
// What gets changed on the way, and why — the same rule as everywhere else:
// keep the teaching, drop the fact that it was written to one person.
//
//   * Asides addressed to Kevin ("Your hard-boiled bowl is golden") are cut.
//     The food and the reason it is there survive; the aside does not.
//   * PRESCRIPTION MEDICATION is removed entirely — the old diet phases exist
//     partly to time fenbendazole and ivermectin absorption, and shipping
//     dosing-adjacent guidance for prescription antiparasitics to strangers is
//     not a thing this app does (content law 4: conditions for health, never
//     cures for conditions). The nutrition survives; the drug schedule does
//     not, and the reference says so out loud rather than quietly thinning it.
//   * Spacing rules that name one person's specific products become the
//     principle underneath them, which is the part that transfers.

import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OLD = resolve(here, '../../src/data');
const OUT_DIR = resolve(here, '..', 'src/content');
const load = (f) => import(pathToFileURL(resolve(OLD, f)).href);

const { DIET_PHASES } = await load('diet.js');
const { SPACING } = await load('spacing.js');
const { SYMPTOMS } = await load('symptoms.js');

/* --------------------------- the scrubbing --------------------------- */

const DRUGS = /fenbendazole|ivermectin|albendazole|praziquantel|mebendazole|nitazoxanide|prescription|pharmaceutical/i;

/** Cut sentences written to one particular person. */
function depersonalise(text) {
  if (!text) return text;
  const kept = String(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/\b(your|you're|you are|you've)\b/i.test(sentence) || /\byou\b.{0,40}\b(feel|need|want|can|should)\b/i.test(sentence))
    .join(' ')
    .trim();
  return kept || undefined;
}

/**
 * Take the drug out of a line without taking the line out.
 *
 * Phase 1's strategy is "starve pathogens, support liver detox, fuel gut
 * repair, provide fat for pharmaceutical absorption (fenbendazole)" — three
 * clauses of nutrition and one about timing a prescription. Dropping the whole
 * sentence loses the nutrition; keeping it ships drug guidance. So: drop the
 * clause, keep the sentence.
 */
function dropDrugClauses(text) {
  if (!text) return undefined;
  const withoutAsides = String(text).replace(/\s*\([^)]*\)/g, (m) => (DRUGS.test(m) ? '' : m));
  const kept = withoutAsides
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      const clauses = sentence.split(/,\s*/).filter((c) => !DRUGS.test(c));
      return clauses.join(', ').trim();
    })
    .filter((sentence) => sentence && sentence !== '.')
    .join(' ')
    .replace(/\s+([.,])/g, '$1')
    .replace(/,\s*\./g, '.')
    .trim();
  if (!kept) return undefined;
  return /[.!?]$/.test(kept) ? kept : `${kept}.`;
}

function scrubItem(it) {
  if (DRUGS.test(it.n ?? '') || DRUGS.test(it.w ?? '')) return null;
  const why = depersonalise(it.w);
  return { name: it.n, ...(why ? { why } : {}) };
}

function scrubGroup(g) {
  const items = (g.items ?? []).map(scrubItem).filter(Boolean);
  return items.length ? { category: g.cat, items } : null;
}

/* ------------------------------- diet -------------------------------- */
//
// NOT SHIPPED, from 29 Aug. `DIET_PHASES` is the 2025 app's four-phase detox
// diet, and the depersonalising pass above was never going to be enough for it:
// the problem is not the wording, it is the shape. Four numbered phases with
// day counts, whose strategies read "Starve pathogens, support liver detox",
// "Heavy killing is done", "Gut is repaired, pathogens cleared" — that is one
// person's treatment plan for one person's diagnosis, addressed to a stranger
// in the second person, on a public URL.
//
// Decision 3: a stranger gets an app, not somebody's regimen. A phased plan is
// a fine thing to BUILD, and phases exist in the editor for exactly that — as
// yours, on your device. It is not shipped reference.
//
// The scrubbing helpers stay because the food content is worth returning to.
// What it needs is not a scrub but a rewrite into principles that are true of
// anybody, which is a content job and not a pipeline flag. Until then the Learn
// tab carries the two things that already generalise: spacing and symptoms.
const diet = [];

/* ------------------------------ spacing ------------------------------ */
// The rules that are about a named product become the principle underneath.
// Anything left naming a specific supplement is dropped rather than shipped as
// advice about somebody else's bottle.

const SPACING_PRINCIPLES = [
  { rule: 'Binders, away from everything', detail: 'Activated charcoal, zeolite, clay and similar bind what is in the gut — including food, supplements and medication. Two hours clear on either side, or they bind the thing you meant to absorb.' },
  { rule: 'Fat-soluble things need fat', detail: 'Vitamins A, D, E and K, and anything oil-based, absorb with a meal that contains fat. On an empty stomach much of it passes through.' },
  { rule: 'Some things are hard on an empty stomach', detail: 'Anything that reliably causes nausea taken fasted is telling you something. With food is not a weaker dose, it is a tolerated one.' },
  { rule: 'Minerals compete', detail: 'Calcium, magnesium, zinc and iron all use overlapping transport. Split them across the day rather than stacking them in one handful.' },
  { rule: 'Stimulating in the morning, settling at night', detail: 'Anything that lifts energy belongs early; anything that downshifts belongs late. The same substance at the wrong end of the day works against you.' },
  { rule: 'Space it out, then check it', detail: 'When two things must not meet, two hours is the usual working answer — but the label, the pharmacist and the prescriber outrank a rule of thumb, every time.' },
];

/* ------------------------------ symptoms ----------------------------- */

const symptoms = (SYMPTOMS ?? []).map((s) => ({ id: s.id, name: s.name, low: s.low, high: s.high }));

/* -------------------------------- write ------------------------------- */

const reference = {
  format: 'protocol-app/reference-v1',
  diet,
  spacing: SPACING_PRINCIPLES,
  spacingSourceCount: (SPACING ?? []).length,
  symptoms,
};
reference.version = createHash('sha256').update(JSON.stringify(reference)).digest('hex').slice(0, 12);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, 'reference.json'), `${JSON.stringify(reference)}\n`);

const foods = diet.reduce((n, p) => n + p.groups.reduce((m, s) => m + s.groups.reduce((k, g) => k + g.items.length, 0), 0), 0);
console.log(`reference: ${diet.length} diet phases (${foods} foods), ${SPACING_PRINCIPLES.length} spacing principles, ${symptoms.length} symptoms`);
console.log(`wrote src/content/reference.json (${(JSON.stringify(reference).length / 1024).toFixed(0)} KB)`);
