# TAXONOMY.md — how content is categorised, searched and joined

*First written 29 Aug 2026, out of the 28–29 Aug design conversation. **Draft for markup, not a
ruling.** The facet model is settled enough to build against; the vocabularies inside it are
proposals and are expected to change. Kevin's line: "we just need to keep it open to change
things up if necessary" — §10 is how that is kept true mechanically rather than by good intentions.*

**Precedence.** `Protocol_App_Roadmap_v1_7.md` governs intent; `GAPS.md` governs what is built.
This file governs **how an item says what it is**. Where it disagrees with `FRAMEWORK.md`'s data-
model summary, that summary is the older sketch ("items with the full taxonomy" — never expanded)
and this is the expansion.

**Everything numbered below was measured on 29 Aug 2026 at HEAD, not remembered.** The commands
are in §12 so any figure here can be re-checked rather than trusted.

---

## 1 · The problem, stated as data

The catalogue holds **376 items** (258 frozen legacy + 118 authored). They are filed by two
fields, and neither is a category system.

**`kind` (5 values) is provenance.** bodywork · stretch · exercise · practice · selftest — the
five source files of the 2025 app. It is already lying: `release` splits 76 bodywork / 11
exercise, `mobility` splits 31 stretch / 6 exercise, `vestibular` splits 10 practice / 4
exercise. Same work, different shelf, because of which file it arrived in.

**`category` (26 values) answers seven different questions at once:**

| Question | Values |
|---|---|
| What does it do to you? | release · vagal · recovery · detox · range · mobility · core |
| What body part? | legs · ribs · airway · nerve · vestibular |
| What movement pattern? | push · pull |
| What equipment? | kettlebell · mace · jump_rope |
| What tradition? | martial_arts · athletic |
| Where does it sit in the UI? | entry-points |
| Is it even a practice? | measure |

The cost is not tidiness. A kettlebell swing and a mace 360 are filed under their tools, so
nothing can see that both are **load** — and law 1 (release is never scheduled alone) cannot be
enforced against content the composer cannot classify.

**The same failure has already reached the anatomy field.** 94 distinct free-text `muscles`
strings across 293 items, with live synonym collisions (`quads`/`quadriceps` ·
`traps`/`upper traps`/`upper trapezius`/`mid/lower trapezius` · `glutes`/`gluteus maximus`/`glute
med/min` · `piriformis`/`deep hip rotators`/`deep hip rotators (piriformis group)` ·
`tibialis`/`tibialis anterior`/`tibialis posterior`), twelve values that are not muscles at all
(`posture`, `nervous system`, `full body`, `grip`, `anti-rotation`, `ankle stability`, `cervical
movement sense`, `oculomotor`, `core`, `back`, `legs`, `spine`), and three that are fascia sitting
in the muscle field because there is nowhere else to put them (`IT band`, `plantar fascia`,
`thoracolumbar fascia`).

---

## 2 · The model: facets, not a list

**One field per question.** An item answers each question once, some questions not at all. There
is no single "category" and no category tree.

Why not a tree: dry needling is `release`, and it acts on **muscle, fascia and nerve**. A tree
forces one parent, so the first thing anyone would do is create a duplicate entry — which is
exactly how `bodywork/release` and `exercise/release` became two shelves for one kind of work.
Multi-valued facets have no such pressure.

**The test that keeps a facet a facet:** it answers one question you can state in five words.
"Kettlebell" answers *what do I need*, not *what is it*. Anything that fails the test is a bin
wearing a category's clothes.

### 2.1 The facets

Nine, plus anatomy — which is a graph rather than a flat vocabulary and so lives in its own file
(§3). `src/content/vocab/facets.json` is the register; this table is a reading of it.

| Facet | Required | Multi | Closed | The one question it answers |
|---|---|---|---|---|
| **type** | yes | no | yes | What kind of record is this? |
| **effect** | yes | yes | yes | What does it do to the body? |
| **tissue** | no | yes | yes | What is it acting on? |
| **technique** | no | no | no | How is it done? |
| **context** | no | yes | no | Where can you do it? |
| **equipment** | no | yes | no | What does it need? |
| **performedBy** | no | no | yes | Who performs it? |
| **tradition** | no | no | no | What school is it from? |
| **tier** | no | no | yes | How well established is it? |
| **target** (§3) | no | yes | no | Where in the body does it act? |

Two required, the rest optional. Authoring a new item stays cheap; precision is added when it is
honestly known rather than guessed.

**Closed means a value is a decision; open means a value is authoring.** `type`, `effect`,
`tissue` and `performedBy` are closed because something downstream spends them — the ledger, the
pairing law, the schedule. `equipment`, `tradition`, `technique` and anatomy are open because the
world keeps supplying more of them, which is the point.

### 2.2 type — what kind of record is this?

`practice` · `measurement` · `teaching` · `intake` · `record`

This facet is the growth room, and it is the one that lets non-movement content in without
disturbing anything else. Supplements and food rules enter as `intake`; labs and progress photos
as `record`; connection cards, technique guides and awareness cues as `teaching`.

It is not speculative. **13 self-tests** already ship mislabelled as practices, and 31 items carry
`role: technique-guide` or `role: awareness-cue` — teaching content wearing a practice's clothes
because `type` did not exist.

### 2.3 effect — what does it do to the body?

`release` · `lengthen` · `load` · `activate` · `mobilise` · `calm` · `circulate` · `control` ·
`condition`

**Short and closed on purpose.** This is the vocabulary the coverage ledger counts in and the
pairing law spends, so every value added here is a new column in the ledger. It is the most
expensive facet to change later and the one that most deserves argument now.

Multi-valued: contract–relax is `release` + `load`. That is the point of law 1, expressed in one
item rather than a scheduling rule.

### 2.3.1 Settled, 29 Aug

**Nine values. No merges, no cuts** — and the argument was settled by the tagging rather than by
preference, because by the time the question came back the whole catalogue had answered it.

| Question asked in §11.1 | What the data said |
|---|---|
| Are `mobilise` and `lengthen` one thing? | **No.** The mobility shelf split 23 held positions from 11 driven through range (§10.2). One shelf, two effects, and the ledger would have counted every static stretch as movement. |
| Is `condition` in v1 at all? | **Yes.** 37 items, and `full body` was four items with no other tag in the world — this is where they live. |
| Is `activate` just light `load`? | **No.** 16 items and **zero overlap** with `load`. A chin nod finds something offline; it does not load it. Keeping them apart is what law 1 needs. |
| Is anything missing? | **Almost.** Dead Hang reads as `load` where it is really decompression, and it is one item. A value earns its place when something can target it distinctly — same guard as §3. Recorded, not built. |

### 2.3.2 What actually needed deciding: `counts`

Not the list — whether the coverage ledger counts a value **against an anatomy node** or only
records that it happened. Measured across every tagged item, by the kind of node each effect
points at:

```
release 0% systemic · lengthen 0% · load 0% · activate 0% · mobilise 0% · condition 0%
control 38% · calm 57% · circulate 73%
```

`perTarget` — **release · lengthen · load · activate · mobilise · control**
`systemic` — **calm · circulate · condition**

This reconciles `FRAMEWORK.md` with the measured list. The framework names four roles the ledger
counts per muscle — *released, strengthened, stretched, balanced*. The content demanded two more of
exactly that kind (`activate`, `mobilise`) and three that are not per-muscle at all.

**`condition` is the one worth explaining**, because it measures 0% systemic and is systemic
anyway. A rope session tags the calves, and counting that as *coverage of the calves* would let the
pairing law believe a debt was paid that was not. What an effect touches and what it covers are
different questions, and `counts` is the field that keeps them apart.

Every value now carries its own note citing the count behind it, and `check-vocab` refuses an
effect with no `counts` and no reason. The argument is in the file rather than in somebody's memory.

### 2.4 tissue — what is it acting on?

`muscle` · `fascia` · `nerve` · `joint` · `tendon` · `lymph` · `skin`

Multi-valued, and this is where the muscle-versus-fascia distinction lives — as a property, never
as a sub-category. Dry needling: `effect: [release]`, `tissue: [muscle, fascia, nerve]`.

### 2.5 technique — how is it done?

**Already exists and is already good.** 14 values on 77 items: `sustained-pressure` (25) ·
`nerve-glide` (14) · `pin-and-move` (5) · `breath-coupled` (5) · `contract-relax` (4) ·
`skin-glide` (4) · `long-hold` (2) · `fold-and-hold` · `positional-rest` · `percussion` ·
`scrape` · `decompression-cup` · `broad-roll` · `compression-floss`.

Dry needling is a fifteenth **value** in this field. It is not a new category, and the fact that
it looked like one is the clearest evidence the facets were missing.

Nothing renders this field today. Eleven items carry `technique: null` explicitly — every one of
them a `load-*` item, the loading partner in a release-and-load pair. That is an explicit "has no
technique" rather than an unanswered question, which is D24's three-state discipline already being
kept by hand in the content. The facet model keeps it: absent, explicitly none, and a value are
three different things.

### 2.6 needs — what does it require?

Two lists under one question:

- **context** — `floor` · `bed` · `chair` · `standing` · `desk` · `travel` (already on 92 items)
- **equipment** — ball · band · roller · mat · kettlebell · mace · rope · wall · doorway · none

Kettlebell, mace and jump rope move here from `category`, which dissolves 24 items that currently
have their own shelves and turns "what can I do in a hotel room with nothing" into a query.

### 2.7 provenance — where does it come from and who does it?

- **tier** — `established` · `exploratory` (on 118 items; ships and renders today)
- **evidence** — the graded basis (on 102 items)
- **tradition** — martial arts · yoga · Pilates · PT · qigong. **A label, never a shelf**, so
  anything from any school can enter as `load` and still say where it came from.
- **performedBy** — `self` · `practitioner`

`performedBy` is new and small and earns its place: cupping, acupuncture and needling are
currently indistinguishable in the data from a hamstring stretch. "What can I do tonight" and
"what should I book" are different questions and the app cannot presently tell them apart.

### 2.8 demands — what does it occupy?

`hands` · `one-hand` · `eyes` · `attention` · `floor` · `room` · `quiet`

What the item needs **available** in order to be done at all. Small, closed, and the other half
of §6 — the thing that decides whether a movement can ride along on an ordinary moment or needs
a moment of its own.

Not the same question as `context`. Context asks *where you are*; demands asks *what is taken up*.
Standing in front of the television and standing at the sink are the same context and completely
different opportunities.

---

## 3 · Anatomy is a graph, not a list

The 94 free-text strings become nodes in **region → group → structure**, each with a parent.

**Depth follows what can be targeted, and search walks both ways.** Kevin, 29 Aug: *"Glutes should
map to the whole group, but we should also be specific when available. Searching for glutes pulls
up all glutes, and searching glute medius or hip abductors will also fall under glutes."*

That is two walks, and a graph needs both:

- **Tagging rolls UP.** An item tagged `glute-med-min` is found by a query for *hip* — the tag
  implies every ancestor.
- **Search expands DOWN.** A query for *glutes* returns `glute-max` and `glute-med-min` — the
  query implies every descendant.

With only the first, asking for "glutes" misses every specific. With only the second, an item
tagged at the region disappears from a specific query. `rollUp()` and `expand()` are the two
directions, and both are tested.

**Actions are nodes too**, with a second edge kind. `hip-abduction` sits **at** the hip
(`parents`) and is produced **by** glute med/min and TFL (`producedBy`), so a search for *hip
abductors* reaches the muscles that abduct, and those muscles still roll up under *glutes*.
Collapsing the two relations into one loses exactly the half the search needs. Thirteen actions
are seeded — the six at the hip, two at the ankle, two at the shoulder, two at the scapula, and
grip — chosen because the catalogue already refers to them or a self-test measures them
(*Knee to wall* measures `ankle-dorsiflexion`, which is what §5 needs to route anybody anywhere).

**Items tag at the precision they honestly have.** Tag `glute-med` and a search for *hip* finds it
by roll-up. Tag only `hip`, because that is all the item honestly targets, and it still works.
Precision becomes optional rather than a guess — which is the same three-state discipline (D24)
the rest of the app already applies to absent values.

**Every node carries plain-language aliases.** `also: ["butt", "backside"]`, `also: ["shoulder
blade"]`, `also: ["side of the neck"]`. The average user types "butt", not "gluteus medius", and
should not have to learn the word to find the thing. Plain name first in the UI, anatomical name
second. Three of the existing values are `SCM`, `TFL` and `QL` — nobody searches for those.

**The guard against the opposite failure.** A node earns its existence when something in the
catalogue can target it distinctly. If no item, test or referral edge can tell two structures
apart, they are one node until something can. An anatomy textbook nobody can act on is as useless
as a silo, and considerably more work.

### 3.1 What is seeded, 29 Aug

`src/content/vocab/anatomy.json` — **136 nodes**: 6 regions, 22 areas, 4 groups, 5 joints, 78
structures, 14 actions, 7 systems. The 21 `regions` values already tagged on 78 items are all present as nodes, so nothing
existing is invalidated; they gain parents and aliases and keep working.

`src/content/vocab/anatomy-foldin.json` — the 94 catalogue strings mapped onto it. **A worklist,
not a migration: nothing reads it.** 88 map cleanly. Four need a human, none carrying more than one
item tag:

| String | Proposed | Item tags | The call |
|---|---|---|---|
| `tibialis` | tibialis-anterior | 1 | Unqualified; posterior is a real and different target |
| `outer thigh` | it-band, tfl | 1 | The band, the muscle that tensions it, or both |
| `ankle stability` | ankle | 1 | The ankle is the place; the stability belongs in `effect: control` |
| `cervical movement sense` | neck | 1 | Tagged so the item is findable; the capacity half is a measurement |

### 3.2 `core` was not an ambiguous string

The heaviest review row read *"the catalogue uses it for both the canister and the abdominal
wall."* Reading the 36 items says otherwise, and the earlier note was wrong.

All 36 are exercises — kettlebell swings, mace 360s, carries, planks, boxing strikes, Bird Dog,
Pallof Press — and in every one of them **"core" means holding the trunk still while force passes
through it.** A function, not a structure. Three things in the data settle it:

- Items that mean the abdominal wall already say so: Dragon Flag carries `abs`, Woodchop and
  Suitcase Carry and Mace Grave Digger carry `obliques`. `core` is added *on top* of those.
- `ex-pallof-press` carries `core` **and** `anti-rotation` — the item pairs them itself.
- **No release or bodywork item uses `core` at all.** The canister content uses `deep core`.

So `core` and `anti-rotation` both resolve to a new action, `trunk-bracing`, produced by the
transverse abdominis, obliques, multifidus, diaphragm, pelvic floor, erectors and rectus. Searching
"core" reaches all of them — which is why the word belongs to the action rather than to the
`deep-core` area node, and the checker made that choice explicit by refusing to let both claim it.

`traps` closed the same way `glutes` did: a missing `trapezius` group node, with upper and
mid/lower beneath it. And `deep hip rotators (piriformis group)` stopped needing a decision once
the group had children — the mapping now demonstrably returns piriformis by expansion.

**Two rows were never anatomy and stay that way.** `posture` (1 tag — Wall Slide, which already
tags upper back and shoulders) belongs to the awareness curriculum. `full body` (4 tags — Jump Rope
Tabata, Turkish Get-Up, Mace Flow, Shadowbox Round, none carrying any other muscle tag) belongs in
`effect: condition` — and those four items are the evidence that `condition` should survive the
open question in §11.1.

**The limit worth naming.** Expansion runs one way: an action reaches the muscles that produce it,
and a muscle does not reach the actions it produces. So a search for *the canister* does not return
the Pallof Press. Chaining the other direction over-broadens fast — asking for the glute max would
drag in hip extension and from there the hamstrings — so if this matters, the fix is a single-hop
muscle-to-action lookup, not transitive expansion.

**Eight review rows closed by adding depth rather than by deciding.** `glutes` was the biggest —
41 item tags read as the big glute alone — and it stopped being a judgment call once the group
node existed to hold both. `hip abductors`, `grip` and the three rotation strings stopped being
judgment calls once actions were nodes: they now land exactly, on the thing they always named.
That is the general lesson, and it is worth more than the six rows: **a review row is often a
missing node rather than an ambiguous string.**

Two rows were never anatomy and are recorded rather than dropped, because a vocabulary that
deletes what it cannot classify teaches nothing about why it could not. Both are covered in §3.2.

**Three alias collisions were caught by the checker during authoring**, which is the argument for
having written it: *"between the shoulder blades"* claimed by both `upper-back` and `rhomboids`,
*"calf"* by both `lower-leg` and `calves`, and *"core"* by both `deep-core` and `trunk-bracing`.
None of them is a tidiness problem — each is a search that silently returns one of two right
answers. The third was the review row itself, surfacing as a collision the moment the graph could
hold both readings.

Scale, honestly: the seed covers what the catalogue references today and stops there. Growing it
is the largest content-authoring job in the project, and the ten review rows need a human eye
each. `deep hip rotators (piriformis group)` versus `piriformis` is a judgment call, not a string
match.

### 3.3 The releases nobody could find

**Kevin, 29 Aug:** *"I looked earlier for a calf release and found none."* There are four:
Calf Roll · Calves · *The deeper calf muscle — the one a straight-leg stretch misses* · *Wrapping
the calf, then moving it*.

He could not find them because `bw-calf` — a release card **called "Calves"** — carried no
`muscles` field at all, like every body-work card. The 28 Aug correction log recorded exactly this
("65 of 258 items are unfindable that way") and it was never closed. The anatomy fold-in did not
close it either: **a translation needs something to translate**, and these cards had nothing.

`src/content/vocab/anatomy-tags.json` tags them directly — 49 items, plus 15 that record
`noTarget` **with a reason**, because "this has no anatomical site" is a real answer and leaving it
blank makes the next person derive the silence again. Coverage went 289 → **338 of 376**, and the
self-tests got their wires: *Knee to wall* now says it measures `ankle-dorsiflexion` and `soleus`.

The library filter had to move too. It read the free-text `muscles` field, so it could show a tag
and not walk one; picking *Glutes* missed everything tagged `glute-max`. It reads the graph now,
and the graph ships with the catalogue.

**What this surfaced:** filtering on `hamstrings` returned 22 items and **one** release, against
four for the calf — a content gap that was a feeling until the graph made it a number. **Closed
29 Aug**: `src/content/authored/release-hamstring.json` brings it to four, and the gap being
countable is what made it fixable.

---

## 4 · Referred pain is an edge between anatomy nodes

"Elbow pain often comes from the back and shoulders" is not a property of any exercise, so it
cannot live on an item. It lives in its own file of directed edges:

```
site: elbow-lateral
  → forearm-extensors    (local)            test: grip-pain-on-resisted-extension
  → radial-nerve         (neural)           test: radial-glide-reproduces
  → scalenes, pec-minor  (thoracic outlet)  test: …
  → thoracic-spine, shoulder-girdle (postural chain)
```

Each edge carries a confidence tier, the test that discriminates it, and nothing else. The item
catalogue never mentions referral — it tags anatomy, and the map does the routing. This is D37's
reverse-referral lookup, which `FRAMEWORK.md` specs and `GAPS.md` lists as unbuilt.

---

## 5 · Tests are the router, and they have no wires

Thirteen self-tests ship — Knee to wall · Wall angel · Chest expansion · Forward fold · Chin nod
hold · Big toe lift · Single leg eyes closed · Assisted hang · Squat support needed · Neck-crack
urge · Nose-only walk · Waking dry mouth · Knee-to-chest pinch.

**All thirteen carry zero `regions` and zero `muscles`.** Not sparse — empty. Knee to wall does
not record that it measures ankle dorsiflexion, so it cannot route anybody anywhere. And per
`GAPS.md` §3 every one is `tracking: 'check'`, so it does not produce the number it exists to
produce.

A test needs two things it does not have:

- **discriminates** — which anatomy nodes its result speaks to
- **routes** — which referral edge each outcome supports, and what follows

This closes the loop a person actually walks: **pain site → referral edges → tests → items.**

### 5.1 The first one that routes

All thirteen imported tests got anatomy on 29 Aug (§3.3), so *Knee to wall* now records that it
measures `ankle-dorsiflexion` and `soleus`. That is the first half. The second half is `outcomes`:
a list of readings, each saying what it looks like, what it means, which anatomy it implicates, and
what to do about it.

`test-hipflexor-length` is the first item with both, and it exists because a prerequisite needed
it — the one-leg-down wall stretch says *"only if your hip flexor is tight"* and nothing in the
catalogue could tell anybody whether theirs was.

Four readings from one position, and the shape is the point:

| The tell | Implicates | Sends you to |
|---|---|---|
| Thigh rests level or below, knee near 90°, back flat | *nothing* | *nothing* |
| Thigh sits above the line of the trunk | `psoas` `iliacus` | Front of hip |
| Thigh rests down but the knee straightens | `rectus-femoris` | Front of thigh |
| Thigh drifts out to the side | `tfl` `it-band` | The front corner of the hip |

"Tight hip flexors" is three muscles wearing one complaint, released in three different places —
and the first row is the reading nobody expects and the reason the test earns its place: *nothing
here is short, and stretching it would be work aimed at nothing.*

`build-catalog` refuses an outcome that points at a node or an item that does not exist. A test
with no outcomes at least does not promise; one whose reading drops you somewhere that is not there
promises and then fails.

**Still true: 1 of 14 self-tests can route**, and the build prints that ratio every time.

### 5.2 The tick box, ended

`tracking: 'measure'` — the D36 defect `GAPS.md` §3 named, closed. **All fourteen self-tests now
record a real reading, on a stated interval.**

The specs were **parsed, not invented**, and that is the part worth keeping. Every imported test
already said what it records and which way was progress, in prose, in a field nothing could read:
`notice` said *"Recorded in cm."* and `why` said *"Re-test: Every 2 weeks. Higher is better."* So
`scripts/measure-specs.mjs` reads those two sentences and a measurement whose card says neither
**stops the build** — a unit guessed there would look exactly like a unit somebody chose (canon
3.7).

Three shapes, because the tests are three shapes: `number` (cm, sec, min, /day), `scale` (0–3,
0–10, with the anchors already written into the instructions), and `choice`, whose options are the
item's own `outcomes`.

The sentences are then **removed from `why`**, because a fact in two places drifts and *"Re-test:
Every 2 weeks. Higher is better."* was never a why — it is a cadence and a direction wearing the
reason field's clothes (§10.1 again). Deriving the cadence also closed GAPS §3's other half:
fourteen tests had no re-test interval, and now all fourteen do.

**Where the answer goes:** `log[itemId].readings.{left|right|both}`, beside the checks and never
inside them, so an accidental tap cannot erase it (ruling B). Per side, because a left ankle and a
right ankle are two measurements rather than one averaged. Zero is a real reading — a big toe that
does not lift is a result — and a cleared one is absent, not nought (ruling A).

A `choice` reading stores the outcome's id **and the words it had at the time** (D20). Reword the
card next year and the record still says what was seen, rather than quietly starting to mean the
new sentence.

### 5.3 The delta

`GAPS.md` §3 asked for three things and this is the third: **a number recorded and never shown
back is a number nobody has any reason to record again.**

`src/lib/readings.js` is pure and does three things it refuses to overstate:

- **One reading is not a trend.** It says *"First reading, 2026-08-15: 8 cm. Nothing to compare it
  to yet"* rather than drawing a flat line through a single dot.
- **Which way is better is per item.** Knee-to-wall going up is progress; fingertips-to-floor going
  up is not. **Without a stated direction the change is reported and not judged** — no `better`, no
  verdict.
- **The dates are carried.** *"8 cm → 11 cm over 14 days"*, so three readings across six months
  cannot present themselves as steady progress.

**The picture does not claim to be a timeline.** Readings are plotted evenly by position, and the
words carry the dates — spacing six months and a fortnight identically along an axis would be a lie
told by a picture, so the picture does not make the claim and the sentence does. The line is
`aria-hidden`; everything it shows is in the text beside it. A flat run sits in the middle of the
box rather than along the floor, where a straight line reads as zero.

A choice does not subtract. What changed is which reading you got: *"The thigh sits above the
trunk — 31 days later: The thigh rests level."*

Nothing here compares one person to anybody else, and nothing scores. It is your own number, read
back to you.

---

## 6 · Ordinary moments are matched, not enumerated

**Kevin, 29 Aug:** *"'While the kettle boils' was an example that is part of my routine but it
wasn't necessarily meant to be its own thing... it's more about teaching awareness and engagement
— any normal daily activity that I can turn into an exercise, even an isometric hold."*

Seated. Washing your hands. Doing the dishes. Standing in front of the television. The principle
is that ordinary time is available, and the app's job is to teach the noticing that makes it so.

### 6.1 How it was lost

`FRAMEWORK.md` law 7 — *attach to existing rituals; the app colonises dead time* — and §2 of the
same document: **"The anchor ritual itself belongs to the user; the app schedules around it, never
inside it."**

`scripts/day-arc.mjs` says so too, in its own header comment: *"The app never schedules inside
somebody's coffee; it schedules alongside it."* Seventy lines further down it named the block
**"While the kettle boils"** — one person's ritual, handed to every reader as structure. The law
was stated and broken in the same file.

It is law 11 in a second costume. *Nobody's case earns schema* — including the founder's, and
including when the case is a kettle rather than a diagnosis.

Fixed 29 Aug: the block is **"While you're already up"**. The kettle survives where it was always
correct — in `fields.tool`, as an example a person can read past: *"Whatever you already do first
— coffee brewing, the shower warming up."*

### 6.2 Why the block name mattered more than it looked

`FRAMEWORK.md` §4 — *Through the day, three layers* — is the whole of this principle:

- **Awareness layer** (trained, not scheduled): stack up, reverse the joint, squeeze and hold.
- **Movement snacks** (scheduled, swappable): bite-size doses with alternatives per context.
- **Ambient practices** (opportunistic): balance in front of the TV, seated twists, ball underfoot.

`day-arc.mjs` shipped parts 1, 2, 5 and 6 of the six-part arc and deferred 3 and 4 to the composer.
**Part 4 is this layer, and it is at zero.** So the only place the principle appeared in the
shipped app was as a hard-coded example in a block title — the example promoted to structure
precisely because the structure was missing.

### 6.3 Enumeration is the wrong shape

The obvious build is a list of moments with items assigned to each. It fails twice: 376 items ×
N moments is a curation burden nobody finishes, and adding *waiting for the bus* means re-tagging
the catalogue. That is the silo failure this document exists to avoid, in a new place.

So the moment and the item describe themselves, and the **fit is computed**:

- an item declares its `demands` (§2.8) — what it needs available
- an opportunity declares what it `occupies` — what is already taken
- **it fits when the two do not intersect**

```
hand-wash   occupies: hands, one-hand           → glute squeeze · pelvic floor · jaw release
dishes      occupies: hands, one-hand, room, floor      → calf raises · posture stack
teeth       occupies: hands, room, floor        → the above, plus anything one-handed
phone call  occupies: hands, attention, quiet   → hip shifts · foot work · one-handed release
television  occupies: eyes, attention           → single-leg balance · anything on the floor
seated      occupies: room, floor               → seated twist · isometric hold · chin nod
kettle      occupies: nothing at all            → anything that fits in ninety seconds
```

`occupies` is what a moment makes **unavailable**, not what is literally busy, and the two hand
values are ordered: brushing your teeth takes one hand, so it blocks two-handed work and leaves
one-handed work alone. Authored the other way round it reads perfectly and matches everything —
so `check-vocab` refuses a moment that occupies `one-hand` without also occupying `hands`. That
mistake was made once, in this file's first draft, and caught by writing the rule down.

A new moment is **one row**, and it matches the whole catalogue the day it is added. Nothing gets
re-tagged. That is the same property §7 gives search: one join, many questions.

`src/content/vocab/opportunities.json` holds the moments; `demands` is a facet on the item; the
checker refuses an `occupies` value that is not a real demand, so the two halves cannot drift.

### 6.4 What this layer is not

It is **not a schedule**. Law 7 stands: the app does not put anything inside somebody's coffee.
An opportunity is a filter a person reaches for — *I'm at the sink, what fits* — and, later, the
substrate for D12's opt-in nudges. The teaching half is ordinary catalogue content: `type:
teaching` awareness cues, 16 of which already ship.

### 6.5 A held position is an opportunity too

**Kevin, 29 Aug:** *"I will do a horse stance, or horse stance with pelvic thrusts, or different hip
rotations, side to side twists, partial squat hold + calf raises — and these are just things I make
up on the fly. It would be nice if the app presented more opportunities and helped me identify how
to include more muscles and joints into the work I'm already doing."*

A horse stance and a sink full of dishes are **the same kind of thing**: a base that occupies some
of you and leaves the rest free. Washing up leaves your hips, spine and breath; a horse stance
leaves your pelvis, spine, arms, neck and breath. Both are moments something else can ride on.

So stacking is not a new subsystem. It is §6.3's match with the base supplied by the catalogue
instead of by the day — which means every held position in the library becomes an opportunity the
moment it declares what it occupies. **Forty items already look like bases** by name alone (Deep
Squat Hold · Dead Hang · Lateral Lunge Hold · Hollow Body Hold · L-Sit · Wall Sit · the horse
stance in the day arc), and none of them declares anything.

**What this needs that §2.8 has not got.** The current `demands` values are the vocabulary of
household moments — hands, eyes, attention, room, floor, quiet. Stacking needs body resources in
the same field: pelvis · spine · arms · neck · breath · stance (whether your feet can move). Then
*horse stance + pelvic thrusts* is a fit computed from two rows rather than a combination somebody
had to think of, and *partial squat hold + calf raises* falls out of the same arithmetic.

**Why it is worth building rather than listing.** A list of good combinations is a list somebody
maintains and a reader memorises. The match teaches the rule instead — here is what this position
leaves free, here is what fits in it — which is the thing that transfers. The mission in
`FRAMEWORK.md` is that the app's success is measured by how much of itself becomes unnecessary; a
person who can improvise a stack has stopped needing to be told one.

### 6.7 Variations: the knowledge that lives around a movement

**Kevin, 29 Aug**, on Legs Up the Wall — which the shelf had filed under mobility and which §10.2
had just re-tagged as `calm` + `circulate`:

> *It can be turned into a stretch of sorts by putting one leg up and one leg down. It's helpful
> to do a psoas release first or the leg that is supposed to lie on the ground will torque the hip
> and try to pull your lower back off the floor. To add extra stretch something can be placed under
> the heel or calf that is up the wall, or a lacrosse ball can be placed on the hamstring where it
> meets the glute — I tried it and felt the extra intensity with the ball but have not achieved a
> release yet.*

That is **four different kinds of thing**, and the catalogue has a field for one of them:

| What it is | Example | Where it goes |
|---|---|---|
| A harder or easier rung | prop under the heel | `levels` — exists, on 312 items |
| A **variation** that changes what the movement DOES | one leg down: `calm` becomes `lengthen` | nothing |
| A **prerequisite** — do this first or it goes wrong | psoas release, or the down leg torques the hip | nothing |
| An **addition** with its own honest status | ball at the hamstring–glute junction: *tried, no release yet* | nothing |

`levels` is a ladder: same movement, more or less of it. A variation is a **different movement
sharing a parent** — and the one-leg-down version has a different `effect`, which means the
coverage ledger must count it differently. Filing it as rung 4 of Legs Up the Wall would have the
ledger record a stretch as downregulation.

**The prerequisite is the fourth relation** (§6.6 named three). It is not `loadAfter` reversed:
law 1 pairs release with loading for the *body's* sake, while this is *"skip it and the movement
does not work"*. Legs Up the Wall with one leg down and a tight psoas is not a lesser version of
the stretch, it is a lower back being pulled off the floor.

**And a prerequisite carries a condition, or it is a caution that presumes one.** Kevin's second
correction, an hour after the first: *"the psoas release is only a prerequisite if your psoas is
tight, and if you are dropping one leg. If both are up the psoas isn't a factor."*

The first half was already right — `before` sits on the variation, not on the parent, so nobody
doing the both-legs-up version is told to release anything. The second half was a modelling error:
`before: ["bw-hip"]` says *do this first* to every reader, including everyone whose hip flexors are
fine. That is the same shape as the five cards that told the reader which conditions they have
(commit `043f266`), and it costs the same thing — friction handed to people it is not for, who then
skip the whole movement.

So a prerequisite is `{ item, when? }`, and the `when` says who it is for **and how they would
know**:

> *Only if the hip flexor on the side you are dropping is tight. The tell is in the movement
> itself: the lower back lifts off the floor, or the pelvis turns with the down leg. If the back
> stays flat and the pelvis stays square, this step is not for you.*

`build-catalog` reports every prerequisite with no condition by name. Unconditional is sometimes
right and usually not, and a build that says nothing about it is how *do this first* quietly becomes
an instruction to everybody.

**Where the tell should eventually live** is a test (§5). There isn't one here: the catalogue has
no hip-flexor-length test — `test-hipflex` measures hip flexion range, which is a different
question — so the condition names the observation instead. The `test` field on a prerequisite
exists and is empty, which is the honest state: the wire is specified, and the thing it should
point at has not been written.

And the honest status matters more here than anywhere. *"I felt the extra intensity but have not
achieved a release yet"* is exactly the epistemic state law 5 exists to carry. An addition that has
not worked yet ships saying so, or the fortieth reader takes it for a technique that works.

### 6.6 Three relations between items, of which two exist

The catalogue already carries two item-to-item relations and is missing the third:

| Relation | Means | In data today |
|---|---|---|
| **pair** | do this, then load it | `loadAfter`, 67 items — law 1 written down |
| **swap** | do this instead | `swapGroup`, 42 groups |
| **stack** | do this *during* | nothing |
| **before** | do this first or it will not work | nothing (§6.7) |

Stack is the one that turns a catalogue into a vocabulary somebody can speak. It should be derived
from §6.5's match rather than authored per pair, or it becomes 376² of curation nobody finishes.

---

## 7 · One join key is the whole integrative claim

Four datasets, one shared anatomy vocabulary:

| Dataset | Tags anatomy as | Answers |
|---|---|---|
| Items | targets | what to do |
| Tests | discriminates | what is actually going on |
| Referral map | site → source | why it hurts over there |
| Coverage ledger | touched × effect | what has been neglected |
| Opportunities (§6) | occupies × demands | what fits the moment you are in |

Because they share a key, this is **one index, not four search features**. A query for *elbow*
returns things that release it, things that load it, the tests for it, and "elbow pain often comes
from here" with the chain and the test that tells you which. Search by tool, by muscle, by symptom
or by minutes free is the same query against a different facet.

The ledger counting against the same nodes the items tag is what keeps coverage honest.

---

## 8 · Browse categories are a view, not the filing system

The home and browse screens slice the catalogue by **one facet at a time**. The default slice is
`effect`, because it is the facet a person can answer about themselves — *tight* → release, *weak*
→ load, *wired* → calm. Change the slice and the same catalogue browses by region, by equipment,
by time available.

No shelf anywhere is authoritative. This is what stops a browse decision from becoming a data
decision, which is how `entry-points` — a UI position — ended up as a peer of `release`.

### 8.1 Built, 29 Aug

**Five slices, one on show at a time:** *What it does* (effect, the default) · *Where in the body*
(the six anatomy regions) · *What you need* (equipment) · *Where you are* (context) · *Kind of
thing* (type). Adding a sixth is a row in `SLICES` saying how to read its values off an item, not
a branch anywhere.

**The screen lost two mechanisms and gained one.** It had a chip row for `kind` plus a muscle
dropdown plus an equipment dropdown — three parallel filters, and three because the facets did not
exist yet.

**Slices compose.** Choosing *Release something tight*, then switching to *Where in the body* and
choosing *Leg*, applies both — because somebody looking for "something for my leg that releases" is
asking two questions in a row, not choosing between them. Every chosen value stays on screen as a
removable pill: a filter you cannot see is a filter you cannot take off.

**Every chip carries a count, and counts are computed against everything else already on** — the
other facets *and* the search text. So a chip says *"there are 4 releases for your calf"* rather
than *"there are 81 releases"*, a chip with nothing behind it is never offered, and a chip can
never promise more than the search has left. That last one is a test.

Region chips are roll-ups (§3), so *Leg* returns items tagged at `calves` or `soleus`. The 136-node
graph is not a chip row; the search box is there for anybody who wants a named muscle.

When a narrowing leaves a facet with nothing to offer, the row says so in words rather than
showing chips that all return nothing.

---

## 9 · What has to be built, in order

1. **Vocabulary files** (§10 rules) — pure data, consumed by nothing at first, therefore safe to
   land before any of the below is settled. *Started 29 Aug.*
2. **Schema extension (D15)** so a day item can hold facets at all. *Done 29 Aug — Kevin's line
   given, `SCHEMA_VERSION` 2 → 3. See §9.1.*
3. **Stop dropping facets on add-to-day.** *Done 29 Aug.* `viewLibrary.js` discards `category`, `kind`, `role`,
   `regions`, `muscles`, `equipment`, `context`, `swapGroup`, `loadAfter` and `nerves`; the
   validator has no slot for any of them. The 119 items in the shipped day protocols carry **zero**
   facets — their entire field set is `id, name, dose, why, tracking, target, fields, cadence,
   photos`. Whatever taxonomy wins, the composer would otherwise deal from a deck with no suits,
   and `loadAfter` (67 items — law 1 already written down as data) does not survive contact with
   the day.
4. **Anatomy graph** + fold-in of the 94 strings (§3). *Seeded and applied 29 Aug — 136 nodes,
   and 289 of 376 catalogue items now carry node ids, §3.1.*
5. **Wire the tests** (§5).
6. **Referral map** (§4).
7. **Faceted browse and search** (§8).

Steps 1 and 4 are content work and need no ruling. Step 2 is the only gate.

### 9.1 What the schema rung actually did

`SCHEMA_VERSION` 2 → 3, and **the rung transforms nothing**. That is the correct behaviour: an
item saved before it has no facets — not empty ones, not defaults. Absence means nobody has said,
which is a different fact from "none", and D24 makes keeping them apart the app's job. A rung that
helpfully wrote `effect: []` onto every old item would be inventing an answer on their behalf.

So why a rung at all, when IndexedDB stores whatever shape it is handed, and `tier` and
`carefulAudience` were both added without one? Because `SCHEMA_VERSION` is one number doing two
jobs here: the database version **and** the `schemaVersion` stamped into every exported file. The
file format's meaning changed — a v3 backup can carry facets a v2 app would drop — so the number
had to move, and moving it moves the database version with it. The ladder is append-only, so the
rung is recorded with its work stated as nil.

The other half of that argument was a real gap: **`schemaVersion` was written into every export
and never once read.** A file from a newer app imported silently and whatever this version had no
slot for went with it — carrying on with less while looking fine, which is what D24 forbids by
name. `validateFile` now warns, and still imports: most of a newer file is ordinary, and refusing
the whole thing would lose more than it saves.

Three shapes travel now, and one name changed:

- **Single-valued:** `type` · `technique` · `performedBy` · `tradition`
- **Lists:** `effect` · `tissue` · `anatomy` · `context` · `equipment` · `demands`
- **The anatomy facet is `target`, and the dose is `amount`.** For one commit it went the other
  way — the facet was called `anatomy` so that `target`, meaning sets/reps/seconds since PLAN §4.2,
  could keep the key. **Kevin reversed that the same day:** *"Can we not reformat things to fit the
  current structure rather than allowing older versions of things to dictate what is happening
  now?"* He is right, and the first version was a habit rather than a reason. The current structure
  names the field; the old shape gets reformatted to fit it. See §10.1.

**Values are not checked against the vocabularies, deliberately.** D40 says a vocabulary is data,
and `carefulAudience` set the precedent: a validator deciding which values are legitimate is a
validator writing content policy. Shape is `protocolFile.js`; vocabulary is `check-vocab` and the
content build. An unrecognised facet value is carried, because somebody wrote it on purpose.

### 9.2 The fold-in, applied

`npm run catalog` now translates `muscles` and `regions` into `anatomy` node ids:
**289 of 376 items carry them.** `st-ninety_ninety` is the case worth looking at — four overlapping
source strings (`hip internal/external rotation`, `hips`, `hip internal rotation`,
`hip external rotation`) become three ids (`hip`, `hip-external-rotation`, `hip-internal-rotation`).

Three rules, and the middle one is the point:

- **The source strings are kept.** A translation, not a replacement: the strings are what the
  source said, the ids are what we think it meant, and the evidence stays until a person has read
  the rows. When the ids are trusted the strings can go, in a commit that says so.
- **A string with no worklist row stops the build.** Authoring a new muscle name is easy and
  silent; a catalogue that quietly carried one untranslated would drift straight back to the
  94-strings problem this replaces.
- **`notAnatomy` rows contribute nothing.** Inventing a node for `posture` so the numbers look
  tidy is how a vocabulary starts lying.

The four still-flagged rows were applied as proposals and the build prints each one by name — one
item apiece.

---

## 10 · Keeping it open, mechanically

Kevin's requirement, as rules rather than intentions. This is D40's "vocabulary is data, not code"
applied to every facet:

- **Vocabularies ship as versioned data files**, never as enums in code. A new value is a content
  edit.
- **Items reference values by id, never by display name.** Renaming "glutes" to "gluteal group" is
  then a label edit, not a migration.
- **Ids are append-only.** A value that turns out wrong is superseded with a pointer to its
  replacement, never deleted and never re-used.
- **A rename/merge map ships alongside**, so the 94 free-text strings can be folded in without
  losing what any item was trying to say.
- **Closed vocabularies declare themselves closed** (`type`, `effect`, `tissue`) and open ones
  declare themselves open (`equipment`, `tradition`, anatomy). Adding to a closed one is a
  decision; adding to an open one is authoring.

Cheap now. Expensive after a few hundred more items.

---

## 10.1 · The rename rule

**Kevin's ruling, 29 Aug: the current structure names things, and older versions are reformatted
to fit it.** Not the reverse. Age is not a claim on a name.

Worked once already, on `target`: the facet named in §2.1 wanted a key that a dose had held since
PLAN §4.2, and the first answer was to let the dose keep it and call the facet something else. That
is legacy setting the shape of everything after it, for no better reason than arriving first.

What it costs to do properly, all of which happened here:

- **A migration.** The schema-3 rung renames `target` to `amount` on every stored item. It could be
  edited into that rung only because the rung was one day old and unreleased — a *released* rung is
  never edited, so after ship a rename needs a rung of its own.
- **A reader for the old shape.** `validateFile` reads the dose from either key and writes the
  current one, so a backup from before the rename still imports. The two meanings are told apart by
  type, unambiguously: the dose is an object, the facet is a list.
- **One notice, not hundreds.** A pre-rename backup can hold hundreds of items; the reader is told
  once, at file level, that the shape moved and nothing was lost.
- **A build that refuses the old shape.** Four items in the vestibular module still used `target`
  for a clinician's thirty seconds — and the fold-in would have overwritten it with a list of node
  ids, silently. `build-catalog` now halts and names them.

**The rule generalises, and there is a queue.** Still legacy-shaped, each waiting on something:

| Field | Why it is still here | What it waits on |
|---|---|---|
| ~~`kind`~~ | ~~provenance from the 2025 files~~ | **retired 29 Aug — §10.2** |
| ~~`category`~~ | ~~push/pull/legs is a movement pattern~~ | **retired 29 Aug — §10.3** |
| `muscles`, `regions` | evidence for the fold-in (§9.2) | the four review rows |
| `everyNDays` | pre-dates `cadence` | nothing — a small sweep |

None of them keeps its name because it is old. Each keeps it until the thing that replaces it can
carry the information, which is a different argument and has an end.

---

## 10.2 · Tagging the catalogue, and why only one of the two retired

All 376 items now carry `type` and, where they are practices, `effect`.

```
338 practice · 13 measurement · 25 teaching
load 135 · release 81 · condition 37 · lengthen 32 · mobilise 24
  · calm 17 · activate 15 · control 11 · circulate 9
```

**Derived, not hand-tagged**, from two sources in order of trust. `role` is already an effect on
118 items and it wins, because it was authored per item rather than inherited from a shelf — the
eleven `activate / release` items are the loading halves of release-and-load pairs, and their role
is right where their shelf is wrong. `category` answers for the rest, one reading per value, and a
value with no mapping **stops the build** rather than being guessed at.

`type` needs no list at all. A self-test is a measurement; a technique guide is teaching; an
awareness cue is teaching *when it is not a drill*, and the item says which by how it is tracked —
the six eye drills carrying that role are timed, the ten explainers are ticked.

**`effect` is now required only on a practice.** A teaching card and a self-test do nothing to the
body, so an empty effect on them is the truth rather than a gap.

### The 37 calls the derivation could not make

`mobility` was one shelf holding two effects, and every static stretch on it would have been
counted by the ledger as movement through range. `src/content/vocab/facet-overrides.json` splits
it — 23 held positions to `lengthen`, 11 driven through range to `mobilise`, and three that needed
their own reason. *Legs Up the Wall* is the one worth reading: filed under mobility, it stretches
nothing, and it is `calm` + `circulate` — the restorative position at the end of the evening flow.

The overrides are data, not code, because they are judgments and a judgment nobody can read is one
nobody can correct. `check-vocab` enforces the only rule that matters: every override names a rule
defined in the file or gives its own reason.

### Why `kind` retired and `category` did not

**`kind` carried nothing else.** bodywork · stretch · exercise · practice · selftest was the five
source files of the 2025 app; `type` answers the only real question in it, and the rest was
provenance. Dropped, and the two things it was standing in for kept: `kettlebell`, `mace` and
`jump_rope` became `equipment`; `martial_arts` and `athletic` became `tradition`.

**`category` still carried something nothing else could** — `push` (26), `pull` (22) and `legs`
(29) are a movement pattern, one of the seven questions §1 named. Under §10.1 a legacy field keeps
its name until its replacement can carry the information. **That reason expired on 29 Aug; see
§10.3.**

### The browse screen slices by effect now

`viewLibrary` filtered by `kind`, so "Strength & movement" and "Stretches" held the same work
depending on which file it arrived in. The chips are effects in plain words — *release something
tight · lengthen it · move it through its range · load it · wake it up* — with `measurement` and
`teaching` as the two type slices a person asks for by name. This is §8 in code: the shelf is a
view over one facet, and the default facet is the one somebody can answer about themselves.

---

## 10.3 · `pattern`, and the end of `category`

**Eleven values:** push · pull · squat · hinge · lunge · carry · rotate · brace · jump · gait ·
strike. Closed, because a pattern is how the body organises around a load and the list of ways it
does that is short. **An item may have none** — one joint moving is below the level a pattern
describes, and ten items say so with a reason rather than being forced into a shape.

**Proposed by matching the exercise name, then read by hand.** For this one facet the name is the
definitive signal: a Romanian deadlift is a hinge by definition. But a substring rule is a
substring rule, and it got **ten of a hundred and forty-eight** wrong:

- `Hop` matched the middle of **"Woodchop"**, making a rotation a jump.
- `Press` made a **leg press** a pushing pattern. It is a squat lying down.
- `Cross` turned **"Criss-Cross"**, a skipping-rope drill, into a punch.
- `Curl` made the **Nordic hamstring curl** a pull.
- `Pallof Press` came out as push, when resisting rotation is the entire exercise.

All ten are in `pattern-tags.json` marked `corrected`, each saying what the call was. The rule
proposed; a person decided; the file records which is which.

**And with that, `category` retires.** It answered seven questions at once (§1) and every one of
them now has a field: what it does → `effect`, what body part → `target`, what equipment →
`equipment`, what tradition → `tradition`, is it a practice → `type`, where it sat in the UI →
nowhere, it was never a property of anything. The last one was the pattern. Both `kind` and
`category` are **read from at build time and dropped from the artifact** — the sources keep them,
so the derivations go on working.

### The browse stopped being local

**Kevin, 29 Aug:** *"the person who is looking to stretch or release something in their leg may not
realise there is something in their hip/glute/back that is pulling on something in their leg."*

The referral map (§4) already knew that, and only answered a **symptom** search. So somebody
browsing *Where in the body → Leg* — the exact moment the question arises — was the one person the
map stayed silent for.

Choosing a region now surfaces what refers **into** it from outside: the sciatic nerve and the deep
hip rotators for the back of the thigh, the calves for the underside of the foot. Only sources from
outside the chosen region, because the local ones are already in the results underneath and
repeating them would bury the point. Each still wears its own grade, and the card still says
*candidates, not causes*.

That is §7's join key doing the thing it was for: one anatomy vocabulary, so a filter on the
catalogue and a map of referral patterns are answering in the same words.

---

## 11 · Open questions

1. **`type: intake`** — supplements are "ordinary content" per FRAMEWORK's decision record, but
   food rules currently live in `reference.json` as reading, not as items. Which becomes doable?
3. **Anatomy depth** — how far down region → group → structure goes before §3's guard bites.
4. **Referral evidence bar** — the map makes causal claims. `FRAMEWORK.md` puts the tender-point
   map in the exploratory tier; the referral edges probably inherit that, and should say so per
   law 5.
5. **The `demands` vocabulary is half-built (§6.5).** It has the household resources and none of
   the body ones. Adding pelvis · spine · arms · neck · breath · stance is what makes stacking
   computable — and it is worth checking whether one field should hold both kinds, or whether
   "what the room takes" and "what the body takes" are two questions wearing one name.
6. **`role` today** — 118 items carry a `role` that mixes effect (`activate`, `release`, `stretch`,
   `balance`, `nerve-glide`) with type (`technique-guide`, `awareness-cue`). It splits across
   facets 1 and 2 and then retires. Deliberate or a rename?

---

## 12 · Re-measuring anything above

```
node -e "const l=require('./src/content/library.json');const c={};for(const i of l.items){c[i.category]=(c[i.category]||0)+1}console.log(l.items.length,c)"
node -e "const l=require('./src/content/library.json');const m={};for(const i of l.items)for(const x of i.muscles||[])m[x]=(m[x]||0)+1;console.log(Object.keys(m).length,Object.keys(m).sort())"
node -e "const s=require('./src/content/starter.json');const f={};let n=0;for(const p of s.data.protocols)for(const b of p.blocks)for(const i of b.items){n++;for(const k in i)f[k]=(f[k]||0)+1}console.log(n,f)"
npm run vocab
```

Figures in this document, measured 29 Aug 2026: 376 catalogue items (258 legacy + 118 authored) ·
26 `category` values · 5 `kind` values · 94 `muscles` strings on 293 items · 14 `technique` values
on 77 items · 6 `context` values on 92 items · 118 with `tier`, 102 with `evidence`, 67 with
`loadAfter`, 13 self-tests with no anatomy at all · 119 day items carrying no facets.

`GAPS.md` §1 records the catalogue as 258 items; that figure predates the authored merge and is
stale by 118.

---

## 13 · Decision record

- **T1 — facets, not a category tree.** Settled 29 Aug (Kevin: "that's the way to go"). Trees force
  single parentage; dry needling is release acting on muscle, fascia *and* nerve.
- **T2 — tissue is a facet, not a sub-category of effect.** Follows from T1.
- **T3 — anatomy is a graph with plain-language aliases**, tagged at honest precision, queried by
  roll-up.
- **T4 — referral lives on edges between anatomy nodes**, never on items.
- **T5 — browse categories are a view over one facet**, never the filing system.
- **T6 — vocabularies are versioned data with append-only ids** (§10), so the model can change
  without a migration.
- **T7 — `kind` retires.** It is provenance, and it already disagrees with itself.
- **T9 — `kind` and `category` both retire.** A legacy field keeps its name only while it carries
  information nothing else can; `pattern` was the last thing `category` had (§10.1–10.3).
- **T10 — browsing a region offers what refers into it.** The map and the catalogue share the
  anatomy vocabulary, so the browse can ask the map a question without a second door (§10.3).
- **T8 — a held position is an opportunity.** Stacking is §6.3's match with the base supplied by
  the catalogue rather than the day, so it needs body resources in `demands` (§6.5) and no new
  subsystem. The `stack` relation is derived, never authored per pair (§6.6).
