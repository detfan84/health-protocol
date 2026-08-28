# Repo Inventory Report — 28 Aug 2026

*CC task S1, read-only. Nothing in the repo was changed. Facts and holes only; anything
I could not determine is written `[undetermined]` rather than guessed (canon 3.7).*

---

## 0 · Read this first: the task's map and the territory disagree

The task assumed a set of files and asked six questions about them. Before the six answers,
the thing that changes all of them:

**The app the strategy document is about is not on the branch you are standing on.**

There are two apps in one repository, on two branches that have never been merged:

| | `master` (your working copy right now) | `origin/protocol-app-v0.2` |
|---|---|---|
| What it is | The **old** React app — tabs for Today, Diet, Exercise, Episodes | The **new** app — the one at shoes-of-peace, the one FRAMEWORK describes |
| Last touched | **15 Aug 2026** | **23 Aug 2026** |
| Holds | `src/data/bodywork.js`, `exercises.js`, `stretching.js` — the content *source* | `protocol-app/` — FRAMEWORK.md, PLAN.md, GAPS.md, the roadmap, the working record, `schema.js`, `protocolFile.js`, **and the catalogue** |
| Checked out locally | yes | **no** |

`protocol-app-v0.2` is 27 commits ahead of `master` and `master` is 0 commits ahead of it —
so nothing is at risk, but **none of the new app's files exist as files on your disk right now.**
I read them out of git history. This is why every document the read-first chain names
(`FRAMEWORK.md`, `PLAN.md`, `GAPS.md`, `Working_Record_v1.md`, `Protocol_App_Roadmap_v1_7.md`)
looked missing: they are real, they are committed, they are one branch away.

Two related notes:

- `HANDOFF.md` records the code location as `C:\Users\kevin\Health App\protocol-app` — a
  **Windows** path. This machine is Linux. Whether the Windows copy holds work newer than the
  branch tip is `[undetermined]` and cannot be checked from here.
- The branch tip is **23 Aug**. The strategy document references an Aug 24 session, a
  `Bowie_Personal_Protocol_v1.md` dated Aug 24, a FRAMEWORK v3 markup, and a roadmap v1.8.
  **None of those reached this repository.** Whether they exist elsewhere is `[undetermined]`.

### The pre-registration line I did not write

The task said to write `2026-08-28 — expected: …` in `Working_Record_v1.md` §3 **before**
starting. I could not: that file is on the un-checked-out branch, and by the time that was
established the inventory was already underway. The Working Record's own §3 rule says a
backfilled expectation is fake pre-registration, so I have not written one. Recording the
miss instead is the honest version.

**Correction-log candidate:** `2026-08-28 — S1 inventory ran without its canon-4.1 expectation
line; the file lives on an un-checked-out branch and the requirement was not reachable at task
start — protocol-app/docs/Working_Record_v1.md §3`.

---

## 1 · Item shape as built

There are **two different item shapes** in the new app, and they are not the same shape.
This is the single most important thing in this report for the authoring work.

### 1a · The plan item — what a protocol holds, and what the validator enforces

`protocolFile.js` is the gatekeeper. Anything that arrives as a file — a backup, a shared
protocol, a module fragment, AI-produced content — passes through it. It is deliberately
forgiving: it trims, repairs, and warns rather than refusing. Here is every field it keeps.

| Field | Required? | What it holds |
|---|---|---|
| `id` | yes — **invented if missing** (with a warning) | permanent identity; names are labels |
| `name` | **yes — hard fail without it** | the label |
| `dose` | optional | free text, e.g. "200 mg" |
| `why` | optional | free text — the reason |
| `notes` | optional | free text |
| `phaseIds` | optional | which phases this belongs to |
| `fields.tool` | optional | K3 — what you need |
| `fields.release` | optional | K3 — what to do |
| `fields.load` | optional | K3 — what to load afterwards |
| `fields.notice` | optional | K3 — what to notice |
| `fields.careful` | optional | K3 — rendered as a warning downstream |
| `photos[].set` | optional | photo folder name; rejected if it contains a path character |
| `photos[].caption` | optional | the caption |
| `photos[].approx` | optional | true = "close, but not exactly this drill" |
| `tracking` | optional, defaults to a tick | `check`, `sets`, or `duration`. **Anything else becomes a tick, with a warning** |
| `target.sets` / `.reps` / `.seconds` | optional | whole numbers above zero; what the plan asks for |
| `cadence.kind` / `.n` | optional | daily · n× a week · every n days · when needed. **A cadence it does not recognise is dropped and the item becomes daily** |

**Everything else is silently discarded.** The validator builds a fresh object and copies
across only the fields above; it does not carry unknown keys through. That is a deliberate
policy stated in the file's own header ("drops unknown keys"), and it matters enormously for
the content work: **any new field invented for a catalogue item will vanish the moment that
item passes through a file.** Adding a field to an item template is therefore a code change
in `protocolFile.js`, not just an authoring decision.

The wider structure around items: a **Protocol** has an id, a name, optional notes, an
active flag, a list of **phases** (optional, may be empty), and a list of **blocks** (time
blocks with an optional `start`/`end` in HH:MM), each holding items. Records of what actually
happened live separately in **DayRecord** (one per date, holding check-offs, the training log,
journal, food, water) and **LabResult**. `schema.js` is at SCHEMA_VERSION 2 with a two-rung
migration ladder; rung 2 converted water from "glasses" to millilitres and kept a
`waterFromGlasses` marker on every converted record so a derived number can never be mistaken
for a logged one.

### 1b · The catalogue item — what the library actually holds

`library.json` items use a **different and larger** shape. Across all 258 items:

| Field | On how many of 258 | What it holds |
|---|---|---|
| `id`, `name`, `kind`, `category`, `tracking` | **258 — all** | identity, shelf, and how it is logged |
| `why` | 255 | one line of reason / form cue |
| `fields` | 239 | the K3 block (see below) |
| `equipment` | 226 | free text |
| `levels` | 193 | the progression ladder — `{level, name, note}` |
| `muscles` | 193 | a flat list of free-text muscle names |
| `categoryName` | 33 | display name of the shelf (body work only) |
| `photos` | 20 | photo sets with captions |
| `everyNDays` | 18 | how often |
| `sides` | 4 | left/right matters |

Inside the `fields` block:

| Field | Count | Which items have it |
|---|---|---|
| `notice` | 239 | everything except the 19 daily practices |
| `release` | 217 | all exercises, stretches and self-tests; **only 11 of 33 body-work cards** |
| `careful` | **33** | **the 33 body-work cards, and nothing else** |
| `tool` | 33 | the 33 body-work cards |
| `load` | **10** | the 10 release cards only |

**The seam, stated plainly:** `kind`, `category`, `categoryName`, `equipment`, `muscles`,
`levels`, `everyNDays` and `sides` are **all fields the plan-item validator does not know about.**
`viewLibrary.js` handles this today by *translating* on the way in — when you tap "Add to my
day" it builds a plain plan item from the library item, carrying across name, why, fields,
photos and tracking, turning `everyNDays` into a cadence, turning `levels[0].note` into a
`dose`, and hard-coding a target of 3×10 for anything tracked as sets or 45 seconds for
anything tracked by duration. **Muscles, equipment, category and the rest of the ladder are
dropped at that moment.** They exist for browsing and never make it into your day.

---

## 2 · Catalogue readiness — plainly stated

**A catalogue exists, it is built, it ships, and it has 258 items in it.** This is the answer
that most changes the strategy document, which describes Layer 2 "catalog-as-data + taxonomy"
as spec-and-unbuilt and several categories as zero-items-authored.

What is there:

| Kind | Count | Where it came from |
|---|---|---|
| Strength & movement (`exercise`) | 162 | the old app's `exercises.js` |
| Body work (`bodywork`) | **33** | the old app's `bodywork.js` — the 33 toolkit cards, ported |
| Stretches (`stretch`) | 31 | the old app's `stretching.js` |
| Daily practices (`practice`) | 19 | the old app's `movements.js` |
| Measure yourself (`selftest`) | 13 | the old app's `METRICS` |
| **Total** | **258** | |

The 33 body-work cards break down exactly as the strategy document's inventory says:
10 release · 5 range · 5 breath · 3 vagal · 3 ribs · 3 airway · 2 nerve · 2 balance.

It is generated, not hand-written: `npm run library` runs `build-library.mjs`, which reads the
old app's data files **on `master`**, rewrites the personal bits through a `GENERALISE` table,
merges duplicates by name, and writes `library.json` with a content hash as its version. It is
deployed as part of `npm run deploy`. There is a real browser for it (`viewLibrary.js`) with
search, filters by kind / muscle / equipment, and one-tap add.

So **S2 authors against an existing shape, not a blank page** — but three qualifications:

1. **The shape is a browsing shape, not the composer's shape.** It has no `role`, no
   `regions`, no primary/secondary target split, no `duration`, no `intensity`, no context
   tags, no reciprocal-pair or load-after links, no swap group, no anchoring, no capacity
   gate, no tier, no evidence field, no dose provenance, no introduced-on date, no
   technique-guide links, and no image status beyond the `approx` flag. Every one of those is
   absent from `library.json`, absent from the validator, and absent from the code —
   `GAPS.md` reaches the same conclusion by a different route and states it as "layer 2 is at
   zero."
2. **The library is generated from `master`'s data files.** Anything authored directly into
   `library.json` is overwritten the next time `npm run library` runs. Where new content is
   meant to be authored so it survives a rebuild is `[undetermined]` — no source file for
   hand-authored catalogue content exists.
3. **Two counts disagree.** `viewLibrary.js`'s own header comment says "287 items"; the file
   holds 258. 287 is the pre-merge total (190 + 31 + 33 + 19 + 14) and 29 duplicates were
   merged by name. The comment is stale, not the data.

### Coverage holes visible in the data

- **The 33 body-work cards carry no `muscles` field at all.** Neither do the 19 practices or
  the 13 self-tests. That is **65 of 258 items invisible to the library's "Muscle or area"
  filter** — including every release card. Filter by "glutes" and the glute release card does
  not appear.
- **The muscle names are not a controlled vocabulary.** 53 distinct free-text strings, with
  overlaps that a filter treats as unrelated: `thoracic` and `thoracic spine`; `abs`, `core`
  and `deep core`; `tibialis` and `tibialis anterior`; `traps` and `upper traps`;
  `hip internal rotation`, `hip external rotation` and `hip internal/external rotation`. This
  is not the ~44-muscle census from the vocabulary file; it is whatever the old app's data
  happened to say.
- **15 items have an `equipment` value 24 characters or longer**, and `viewLibrary.js`
  deliberately hides those from the equipment dropdown because the body-work "tools" are
  sentences rather than nouns. 24 usable equipment values remain in the filter.
- **The `careful` field exists on 33 items out of 258.** Every exercise, stretch, practice and
  self-test in the library ships with no careful text.
- **Vestibular and oculomotor: nothing.** Searching the whole branch for `vestibul`, `saccade`
  or `oculomotor` returns no hits in any source file, content file or document. Confirms the
  strategy document's zero.
- **Tender points: nothing authored.** The word "tender" appears only inside existing card
  text, not as items.
- **Supplements: no generic library items, confirmed.** `build-content.mjs` reads bodywork,
  stretching, movements, routines and exercises — it does **not** read `supply.js` or
  `blocks.js`. The brand-bound supplement content stays on `master` and in
  `starter-protocols.json`, which is gitignored, not shipped, and marked "Kevin's own — must
  not be." Nothing supplement-shaped is in the catalogue.

---

## 3 · Taxonomy diff — the possible silent drop

**I cannot run this diff, and the reason is itself the finding.**

`FRAMEWORK.md` has been committed to this repository **exactly once**, in commit `16bbd21`,
and that single version is already **v3**. There is no v2 in the repo, none in git history on
any branch, and no `FRAMEWORK_v2.md` anywhere on this machine. The v2 text exists only in your
project files.

What I can report, factually, from the v3 text that is in the repo:

- v3's masthead says it "supersedes v2 (19 Aug) in full."
- v3's **"The content system"** section is two short paragraphs: content tiers (established /
  exploratory) and "catalog as data" — items live as data files, the v1 seed is sized so every
  swap group has a real alternative in every common context, and the muscle vocabulary is part
  of the catalogue data.
- The taxonomy fields the task lists as v2's are **not enumerated anywhere in v3's content
  system section.** They do reappear, scattered, in v3's **"Data model summary (for CC)"**
  near the end, which lists: *"Items with the full taxonomy · day templates · coverage ledger
  (muscle × role × day/week) · findings + decaying weights · per-item-instance weekly targets ·
  ratings · activity log · training-log fields · pause annotations · quiz-seed provenance ·
  user profile · content tiers · technique-guide links."* The phrase **"the full taxonomy"** is
  doing all the work there — v3 refers to the list without restating it.
- `Protocol_App_Roadmap_v1_7.md` Layer 2 does still spell it out: *"Catalog-as-data + taxonomy
  (K3 five fields, roles, contexts, pairs, swap groups; muscle vocabulary as data) — spec."*
- There **is** a drop-check on file: `docs/PLAN_3-5_dropcheck.md`, run 22 Aug. But it diffed
  **PLAN.md §3–5** against v3 — a different question. It found three items dropped without a
  successor: **K4** (what happens to an item missed earlier in the day), **the "2 of 3" weekly
  count** colliding with the no-completion-meters law, and **water still in glasses** (since
  fixed). It did not examine the taxonomy list.

So: the taxonomy list is **not restated in v3's content system**, **is** referred to as "the
full taxonomy" in v3's data-model summary, and **is** still enumerated in roadmap v1.7. Whether
that constitutes a drop or a reference is a reading of the two documents, and per the task the
disposition is yours. To make the diff mechanical rather than interpretive, v2 would need to
land in the repo beside v3.

---

## 4 · The body-work prototype — which copy is current

**Neither copy. `body-work-reference.html` has never existed in this repository, and neither
has `BUILD-NOTES.md`.** I checked every commit on every branch and every object in git
history. They are not tracked, not deleted-and-recoverable, and not on this machine.

What actually happened: the prototype was **ported into JavaScript** in commit `51e766d`
("Add Body Work view to Exercise tab") on `master`, and lives at **`src/data/bodywork.js`**
(45 KB, 33 cards). Its header says so in the first line: *"Ported verbatim from
body-work-reference.html (the working prototype)."*

So `BUILD-NOTES.md` is describing something real — it is just describing it at the wrong
address:

- The **`PHOTOS` object exists**, in `src/data/bodywork.js`, mapping card ids to photo sets
  with captions and an `approx` flag. 20 entries.
- The **`NO_PHOTO` object exists**, in the same file. **13 entries**, not 15.
- The filename-convention loading that your project copy shows (`images/<id>.jpg`) is what the
  *older HTML prototype* did. The repo has moved past it entirely: the app now loads
  `./src/content/photos/<set>_0.jpg` from an explicit map.

Images on disk: **54 files, 27 photo sets × 2 frames**, at `public/bodywork-images/` on
`master` and mirrored to `protocol-app/src/content/photos/` on the branch. All 27 sets on disk
are referenced by the catalogue and all 27 referenced sets are on disk — **no orphans, no
missing files, in either direction.** They come from the Free Exercise DB (Unlicense, public
domain); `scripts/refresh-bodywork-images.sh` rebuilds the folder from scratch and lists all 27
set names.

**Project Gotchas candidate:** *`BUILD-NOTES.md` and `body-work-reference.html` are not repo
artifacts and never were — they are prototype-era documents describing content that now lives
in `src/data/bodywork.js` on `master`. A project-file copy that "lags the repo" here is
actually a file the repo never had.*

---

## 5 · Image inventory — all 33 cards, and the rejection reasons

**20 of 33 cards have an image. 13 do not, and every one of the 13 says why.** The reasons are
preserved in full, in `NO_PHOTO` in `src/data/bodywork.js`, with a long comment above it
explaining the two kinds. Nothing has been lost.

| Section | Card | Image status |
|---|---|---|
| Release | Front of hip | ✅ Kneeling_Hip_Flexor + Butt_Lift_Bridge |
| Release | Glute & back of hip | ✅ Piriformis-SMR + Iliotibial_Tract-SMR + Single_Leg_Glute_Bridge *(1 of 3 approx)* |
| Release | Feet | ✅ Foot-SMR |
| Release | Calves | ✅ Calves-SMR |
| Release | Hamstrings | ✅ Hamstring-SMR + Butt_Lift_Bridge |
| Release | Chest & front of shoulder | ✅ External_Rotation_with_Band *(approx)* |
| Release | Lat & back of armpit | ✅ Latissimus_Dorsi-SMR + Scapular_Pull-Up |
| Release | Mid & upper back | ✅ Rhomboids-SMR + Cat_Stretch |
| Release | Base of skull | ✅ Isometric_Neck_Exercise *(approx)* |
| Release | Front of thigh | ✅ Quadriceps-SMR |
| Breath | 90/90 hip lift | ✅ Pelvic_Tilt_Into_Bridge *(approx)* |
| Breath | All-fours belly lift | ✅ Stomach_Vacuum *(approx)* |
| Breath | CO2 tolerance | ❌ **absent** — a breath-hold measurement |
| Breath | Extended exhale | ❌ **absent** — a breathing ratio |
| Breath | Nose only, all day | ❌ **absent** — nose breathing |
| Range | Contract–relax | ✅ Seated_Hamstring + Seated_Floor_Hamstring_Stretch *(1 of 2 approx)* |
| Range | Contract–relax: hamstring | ✅ Leg-Up_Hamstring_Stretch |
| Range | Contract–relax: calf | ✅ Calf_Stretch_Hands_Against_Wall + Standing_Soleus_And_Achilles_Stretch |
| Range | Eccentric heel drops | ✅ Calf_Raise_On_A_Dumbbell *(approx)* |
| Range | Deep squat hang | ✅ Bodyweight_Squat *(approx)* |
| Ribs | Between the ribs | ❌ **misleading** — closest matches are loaded side bends: weighted oblique work on a card that says light pressure only |
| Ribs | Under the rib margin | ❌ **misleading** — nothing in an exercise library shows manual work under the rib arch |
| Ribs | Side-lying rib opener | ✅ Side-Lying_Floor_Stretch *(approx)* |
| Airway | Tongue posture | ❌ **absent** — tongue posture |
| Airway | Tongue press & suction | ❌ **absent** — tongue press and suction |
| Airway | Soft palate & throat | ❌ **absent** — soft palate work |
| Nerve | Sciatic glide | ❌ **misleading** — closest matches are held seated hamstring stretches, and this drill must never be held |
| Nerve | Median nerve glide | ✅ Side_Wrist_Pull *(approx)* |
| Balance | Single-leg progression | ✅ Balance_Board *(approx)* |
| Balance | Toe control | ❌ **misleading** — searching toes returns toe-touch hamstring work, a different thing entirely |
| Vagal | Acupressure mat | ❌ **absent** — an acupressure mat |
| Vagal | Humming & gargling | ❌ **absent** — humming and gargling |
| Vagal | Cold on the face | ❌ **absent** — cold on the face |

**Two kinds of "no", and the distinction is recorded deliberately:**

- **`absent` (9 cards)** — the source is an exercise library and these are not exercises.
  There is no photograph of nose breathing, tongue posture, humming or a breath-hold
  measurement to find. The comment says a photo would add nothing a sentence does not.
- **`misleading` (4 cards)** — near-misses exist and teach the wrong thing. These are the four
  the comment names as "the ones worth filming."

**On the number 15.** The task expected 15 rejections; the file holds 13. The comment above
`NO_PHOTO` explains the arithmetic: *"This list was pruned on a second pass. It used to hold
eighteen cards, several of which had a usable near-miss in the library that the first pass
rejected and then never replaced. Those are now mapped above."* So the lineage is 18 → 13, and
15 does not correspond to any state I can find in the repo. Where 15 came from is
`[undetermined]`.

**On what "rejected" means here.** These 13 are *"we looked and there is nothing honest to
show"* decisions, made while building. They are **not** the same thing as the amended-D38
"Kevin performed it and rejected the image" rejections. Whether any images were rejected in
that second sense is `[undetermined]` — there is no record of a performed-and-rejected image
anywhere in the repo, no rejection log, and no rejection field on any item. The only
image-quality signal that ships is the `approx` flag (11 of the 28 photo entries are marked
approximate) and its caption, which says in plain words what differs.

---

## 6 · The queued CC homework — status

**Both pieces are done, and both are on the branch.**

| Homework | Status |
|---|---|
| **PLAN.md §03–05 diff against FRAMEWORK** — assigned in FRAMEWORK v3 | ✅ **Done 22 Aug.** `protocol-app/docs/PLAN_3-5_dropcheck.md`. Eight PLAN sections found replaced-with-a-successor; three found dropped without one (K4, the "2 of 3" weekly count, water-in-glasses). |
| **GAPS.md read-in** — assigned in roadmap v1.7 Phase 2 and FRAMEWORK open item 4 | ✅ **Done 23 Aug**, but not as assigned: the file **did not exist to be read in**. The Working Record's 22 Aug entry records the search — not in the repo, not in git history, not on the machine. It was **written** rather than located, and is now `protocol-app/docs/GAPS.md`, a standing built-vs-specced register. |

`GAPS.md` also did work beyond its brief and it is worth knowing what it says, because it
overlaps this report:

- It declares itself the authority on what is **built** ("measured, not remembered"), with the
  roadmap authoritative on what is **intended**.
- It corrected four stale test counts across three documents (39 / 45 / 94 recorded; 97
  measured on the day).
- It found **four regressions** — Supply and Plans unreachable with no way to create a
  protocol; shipped content unable to reach an installed app; the weekly count computed and
  discarded; content builds churning their own timestamps — **all four closed the same day**.
- It found **five things `HANDOFF.md` claims as built that measured as not built** — D20
  check-off snapshots, D22 auto-decrement, D12 in-app delivery, D36 self-tests (content only,
  13 items all tracked as a tick), Q4/Q6 unstarted — **four closed the same day**, suite 97 →
  104 → 135.
- Its headline: **"layer 2 is at zero."**

**Phase 1's done-when — your daily use on the new build — was still unmet as of 23 Aug.** The
loop counter in `Working_Record_v1.md` §1 has exactly one entry: *week of 2026-08-17 — 0 loops.*
No entry has been added since. Whether daily use switched over in the weeks since is
`[undetermined]` from the repo; the counter would have to be updated by hand and was not.

---

## 7 · Holes — things this report could not close

- **Whether work exists newer than 23 Aug.** `HANDOFF.md` points at a Windows path; this is a
  Linux machine; the branch tip is 23 Aug and your documents describe Aug 24 and Aug 28
  sessions. `[undetermined]`.
- **FRAMEWORK v2** is not in the repo, so §3's diff cannot be made mechanical. `[undetermined]`.
- **Roadmap v1.8, Session_Rulings_2026-08-20_v2, the muscle vocabulary census file, the
  lymphatic protocol, the tailored movement program, the equipment status file, the personal
  protocol** — none are in the repo. The repo holds roadmap **v1.7** and
  `Session_Rulings_2026-08-22.md`. `[undetermined]` whether the newer ones exist elsewhere.
- **I did not run the test suite.** Doing so needs a branch checkout and a dependency install,
  both of which are writes. The 135-green figure is what `GAPS.md` records as of 23 Aug, not
  something I measured. `[undetermined]` at the current tip.
- **I did not open the deployed app.** Whether shoes-of-peace still serves the 23 Aug build is
  `[undetermined]`.
- **Where hand-authored catalogue content is meant to live** so it survives the next
  `npm run library` — no such file exists and no document names one. `[undetermined]`.
- **Whether any image was rejected in the D38 "Kevin performed it" sense** — no record exists
  either way. `[undetermined]`.

---

## 8 · Record entries this inventory produces

**Correction-log candidates (`Working_Record_v1.md` §2):**

- `2026-08-28 — S1 inventory ran without its canon-4.1 expectation line; the file lives on an un-checked-out branch and the requirement was unreachable at task start — docs/Working_Record_v1.md §3`
- `2026-08-28 — viewLibrary.js header says "287 items"; library.json holds 258 (287 is the pre-merge total, 29 duplicates merged by name) — src/app/ui/viewLibrary.js`
- `2026-08-28 — the 33 body-work cards carry no muscles field, so every release card is invisible to the library's muscle filter; 65 of 258 items are unfindable that way — src/content/library.json via scripts/build-library.mjs`
- `2026-08-28 — the catalogue's muscle names are free text (53 strings with overlapping duplicates), not the ~44-muscle vocabulary census — src/content/library.json`
- `2026-08-28 — library items carry eight fields the plan-item validator discards (kind, category, categoryName, equipment, muscles, levels, everyNDays, sides); viewLibrary translates on add and drops the rest — src/lib/protocolFile.js ↔ src/app/ui/viewLibrary.js`

**Project Gotchas candidates:**

- *Two apps, two branches. `master` is the old React app and the content source; `protocol-app-v0.2` is the real app and every planning document. Neither is merged into the other. A file that looks missing is probably on the other branch.*
- *`BUILD-NOTES.md` and `body-work-reference.html` are prototype-era documents, not repo artifacts — they were never tracked. What they describe now lives in `src/data/bodywork.js` on `master`.*
- *`library.json` is generated by `npm run library` from `master`'s data files. Anything hand-edited into it is overwritten on the next build.*
- *Adding a field to a catalogue item is a code change, not an authoring change: `protocolFile.js` silently drops every key it does not recognise.*

---

## 9 · Addendum — running it on this machine (checked after the branch was checked out)

`protocol-app-v0.2` is now checked out locally. Two things found on the way in:

- **No dependencies are installed.** Neither `node_modules/` nor `protocol-app/node_modules/`
  exists. Until `npm install` is run in `protocol-app/`, the suite cannot run, the content
  build (`npm run library` / `npm run content`) cannot run, and nothing can be deployed. This
  is why the 135-green figure in this report is quoted from `GAPS.md` rather than measured.
- **`.claude/launch.json` is Windows-only.** All four launch configurations hard-code
  `C:/Program Files/nodejs/node.exe` as the executable. None of them will start on this Linux
  machine. It is a tracked file and it changed when the branch was checked out.

**Correction-log candidate:** `2026-08-28 — .claude/launch.json hard-codes Windows node paths in all four configurations; the app cannot be launched from a non-Windows machine — .claude/launch.json`
