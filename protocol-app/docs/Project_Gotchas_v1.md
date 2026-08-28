# Project Gotchas — v1

*Started 28 Aug 2026. Standing list, append-only in spirit: a gotcha stays until it is no longer
true, and then gets a line saying when it stopped being true rather than being deleted.*

**What belongs here:** the things that are true about this project and would waste somebody's
afternoon if they did not know them. Not bugs (those are `GAPS.md` §2 and the correction log),
not decisions (those are the ruling record) — traps in the terrain.

*Named as a destination in `Content_Library_Expansion_Strategy_v0_2.md` and again in
`CC_Task_S0b_Freeze_and_Housekeeping.md` step 1.3. Like `GAPS.md` before it, the file did not
exist and was written rather than located; the same precedent applies (Working Record §2,
23 Aug).*

---

## 1 · Two apps, two branches, and neither is merged

`master` is the **old React app** — last touched 15 Aug 2026. It is also the **content source**:
`src/data/{bodywork,stretching,exercises,movements,routines}.js` and `public/bodywork-images/`.

`protocol-app-v0.2` is the **real app** — the one at shoes-of-peace, the one FRAMEWORK describes,
and the home of every planning document. It contains all of `master` plus 27 commits.

A file that looks missing is usually on the other branch. Check before concluding it was lost.

## 2 · `BUILD-NOTES.md` and `body-work-reference.html` are not repo artifacts

They have never been tracked, on any branch, in any commit. They are prototype-era documents.
What they describe — the 33 cards, the `PHOTOS` map, the `NO_PHOTO` list — lives in
`src/data/bodywork.js` on `master`, ported there in commit `51e766d`.

**The tell this creates:** a project-file copy of a repo artifact can lag the repo, but it can
also describe a file the repo never had. Check that the file exists before deciding which copy
is authoritative. Numbers carried out of `BUILD-NOTES` have already been wrong once — its
"15 rejected images" does not match any state in the repo, whose lineage is 18 → 13.

## 3 · The catalogue is built, not edited

`src/content/library.json` is a **build artifact**. Hand-edit it and the next `npm run catalog`
destroys the edit without a word.

New content goes in `src/content/authored/<category>.json`. The legacy 258 items live frozen in
`src/content/imported-legacy.json` and are not edited either.

## 4 · `npm run library` no longer exists as a trap — closed 28 Aug 2026

**Was:** `scripts/build-library.mjs` wrote to `src/content/library.json`, which since the freeze is
the *merged* catalogue. Running `npm run library` therefore overwrote the merged shelf with the
legacy 258 alone, silently dropping every authored item — behind a success message.

**Closed the same day**, on Kevin's ruling that this is D24's own class ("no silent failure modes
anywhere"). The generator now writes to `src/content/imported-legacy.json`, which is its actual
product, and **refuses to run at all without `--re-freeze`**:

```
npm run catalog     builds the shelf the app reads     ← the routine command
npm run re-freeze   rebuilds the frozen legacy import  ← only if master changes
npm run library     refuses, and says which of the two you meant
```

A re-freeze stamps its own provenance — the `master` sha is read from git rather than typed — and
prints that the shelf is *not* updated until `npm run catalog` runs. Pinned by
`tests/catalog.test.js`, which asserts the refusal exits non-zero and leaves `library.json` byte
for byte unchanged.

## 5 · Adding a field to an item is a code change, not an authoring change

`src/lib/protocolFile.js` builds a fresh object and **silently discards every key it does not
recognise**. A field invented for a catalogue item survives browsing and vanishes the moment the
item lands in somebody's day.

Two consequences worth holding together:

- A catalogue-only field (`tier`, `role`, `evidence`, `muscles`, `equipment`, `levels`) is fine
  as long as nobody expects it in the day. It is not fine if a law depends on it being read.
  `carefulAudience` was exactly that case — D29's gating model could not work because its own
  input was filtered out — and it was taught to the validator on 28 Aug. It rides **beside**
  `fields`, not inside it; `build-catalog.mjs` halts on the old placement rather than shipping a
  field that does nothing.
- Every render path is a **fixed allowlist** — `FIELD_LABELS` in `viewLibrary.js` and
  `viewToday.js`, `FIELD_ORDER` in `viewSession.js`. No view iterates item keys. A new field
  ships as bytes that render nowhere until a line is added. `tier` and `evidence` got their line
  on 28 Aug, on the **library card only**: the tier sits on the closed card face and the grade
  and its basis open with the item. `role` has none and does not need one — it is composer
  machinery, not a label for a person.
- **Mostly closed, 28 Aug:** the *tier* travels into the day and the *grade* stays in the library.
  One word — "Exploratory" — rides on the day card and in the session runner; the graded basis is
  reference material and stays where it was. Kevin's re-pricing, and it is the half that matters
  in daily use: somebody on the fortieth repetition should still know the drill is exploratory.
  What remains is a convenience, not a law-5 hole: there is no tap-through from the day to the
  grade (see §15).

## 6 · `.claude/launch.json` was Windows-only

All four configurations hard-coded `C:/Program Files/nodejs/node.exe`. Fixed 28 Aug to resolve
`node` from PATH, so the configs work on both.

Note that the three vite-based configurations also need a **root** `npm install` — vite is a
dependency of the old app at the repo root, not of `protocol-app/`. The test suite and the
content build need only `protocol-app/`'s own install, and the content build needs no install
at all: the data files it reads have no imports.

## 7 · Verify on the deployed URL, not on localhost

Carried from `HANDOFF.md`, because it cost four days once. `scripts/stage-dist.mjs` has a
`SHIPPED` allowlist and anything outside it does not deploy. Content shipped with
`active: false` is invisible. A git push does **not** deploy; `npm run deploy` does.

If a claim is about what a person sees, open what they open.

## 8 · The library asks for what an item says, or for nothing

Closed 28 Aug 2026, recorded because the shape of the mistake recurs.

The add flow used to synthesise `3 × 10` for anything tracked in sets and `45 seconds` for anything
tracked by duration. Those numbers were nobody's: not derived, not cited, not chosen — and shown to
the person as the prescription. Canon 3.7's founding incident, in code.

It had teeth by the time it was found: Kevin's PT prescribed **30 seconds**, the authored item said
30 seconds, and the app would have said 45 — contradicting a clinician inside the one module built
to be shown to him.

The rule now: **use the item's target when it has one; when it does not, ask for nothing.** A blank
recruits attention. A confident wrong number repels it.

---

*Entries 9–13 come from the project-knowledge copy of this file, merged verbatim on 28 Aug 2026.
Two files had carried this name — the project copy, and this one, written the same day because the
repo had none. One entry is merged **corrected** rather than as written; the correction is shown
with it. Sections 1–8 above are about the repo; these five are about working in the project.*

## 9 · Browsers block ES-module apps opened by double-click

`file://` will not run an ES-module app — serve it locally instead. The build's own notes carry the
exact command.

## 10 · A session's project-file view is frozen at session start

Canon 1.11. Files uploaded mid-session may be invisible to that session; a fresh session sees them.
If a session claims a file is missing, that is one of the things it can mean.

## 11 · Chat is not storage

Canon 1.7. Until a conclusion lands in a project file *and* Kevin uploads it to the project, no
other session can see it. A conclusion that exists only in a transcript has not been recorded.

## 12 · Multiple roadmap versions can share one date

18 Aug produced v1.3 → v1.4 → v1.5. Trust the **"supersedes all in full"** line, not the date, to
identify which is current.

*(The same trap now runs beyond the roadmap: 28 Aug alone produced Content Library Expansion
Strategy v0.2 → v0.3 → v0.4 → v0.5. Same rule — read the supersedes line.)*

## 13 · The read-first chain is four files deep

Canon → ruling record → roadmap opener → **FRAMEWORK v3**.

**Merged corrected.** The project copy read *"three files deep as of Aug 18: canon → ruling record →
roadmap opener."* Roadmap v1.7 added FRAMEWORK v3 after the opener, so the entry was stale on
arrival. This was already known and never applied: `Working_Record_v1.md` §2 carries
`2026-08-21 — read-first-chain gotcha line stale ("three files deep"; now four with FRAMEWORK_v3.md)`,
pointing at this file. **That correction-log entry closes here.**

## 14 · A correction pointing at a file that does not exist can idle forever

`Working_Record_v1.md` §2 carried, from **21 Aug**, that the read-first-chain gotcha was stale.
It was closed on **28 Aug** — a week later — and only because the file it pointed at was finally
created and read. Nothing in the process noticed the delay, because nothing checks that a
correction's *target* exists.

The log worked exactly as designed: the entry was written at the moment of friction and it survived
until somebody acted on it. The failure mode is quieter than a lost entry — **an entry whose target
is missing has no natural moment of rediscovery.** A correction pointing at `src/lib/thing.js` gets
found the next time somebody opens that file. A correction pointing at a document nobody has written
gets found when somebody happens to write it.

Worth a periodic sweep of §2 for entries whose named target does not exist.

## 15 · The day cannot link back to the library, and the session deliberately cannot leave

Not a bug; a design boundary worth knowing before somebody prices a feature against it.

- **`viewLibrary` has no deep link.** It takes `{ reload }` and no initial query, so there is no way
  to open the library *at* a particular item. Adding one is small — an option plus a prefilled
  search — and `viewToday` already passes its row options through a single bag, so threading a
  callback there is one destructure and one call site.
- **A session owns the whole screen on purpose.** `app.js` returns early while `state.session` is
  set and clears the tab bar, with the reason in a comment: *"a session is one thing at a time, and
  a row of tabs under it is an invitation to stop."* So a link out of the session runner is not
  plumbing — it needs a ruling on what happens to the session when you take it: suspend and return,
  or discard.

The practical consequence: a tap-through from the day to a grade is cheap on the Today card and a
design question in the session runner. The session runner instead carries the sentence that says
where the grade is.

## 16 · The body-work port read five keys; the source uses eight — fixed 28 Aug 2026

**Was:** `build-library.mjs` built each body-work item from `tool · release · load · notice ·
careful`. Only 10 source cards use that shape. The other 23 use **`steps` / `dose` / `feels`**, and
none of those keys was read — so **22 of 33 shipped cards carried a tool, a notice and a careful
line and no instructions.** About 8,700 characters of how-to, 23 doses and 10 sensation notes sat
in `master` unused since the port.

**Fixed:** `steps → release`, `feels` appended to `notice`, `dose` to a real catalogue field,
ladders in steps to `levels`. Re-frozen (`53c4e786b5aa` → `adbc89d0808d`). 33 of 33 now have
instructions.

**The part worth keeping.** It stayed invisible because the screens test asserted each item has
`fields.release || why || levels`, and body-work items all carry a `why` — the *section note*,
identical across every card in the section. **A test that passes on a field which structurally
cannot hold instructions is a green light wired to nothing.** It could not fail for the reason it
existed, and the suite read green through the whole life of the defect.

The assertion now discounts any `why` shared by more than one item. Fixed *before* the content, on
purpose: it turned the defect red first, which is how anyone can tell the port fix worked rather
than taking a report's word for it.

## 17 · The shelf has no order but alphabetical

`build-catalog.mjs` sorts every item by name across the entire catalogue, and the library browser
filters by kind, muscle and equipment — there is no module or section view, and no ordering field
on an item.

The consequence is not cosmetic. The vestibular module's protective card, *"Two kinds of
dizziness — which one is yours?"*, is written to sit ahead of every drill because it changes
whether some of them are appropriate at all. It sorts under T and lands **tenth of fourteen**,
after six of the drills it exists to gate.

A file can specify an order. Nothing reads it.
