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

`src/content/vocab/anatomy.json` — **134 nodes**: 6 regions, 22 areas, 3 groups, 5 joints, 78
structures, 13 actions, 7 systems. The 21 `regions` values already tagged on 78 items are all present as nodes, so nothing
existing is invalidated; they gain parents and aliases and keep working.

`src/content/vocab/anatomy-foldin.json` — the 94 catalogue strings mapped onto it. **A worklist,
not a migration: nothing reads it.** 84 map cleanly. Five need a human, and each says why:

| String | Proposed | Item tags | The call |
|---|---|---|---|
| `core` | deep-core | 36 | The catalogue uses it for both the canister and the abdominal wall |
| `traps` | upper-trapezius | 1 | What the source items describe, but not the whole muscle |
| `tibialis` | tibialis-anterior | 1 | Unqualified; posterior is a real and different target |
| `outer thigh` | it-band, tfl | 1 | The band, the muscle that tensions it, or both |
| `deep hip rotators (piriformis group)` | deep-hip-rotators | 1 | The parenthetical names the best-known member, it does not narrow the target |

**Six review rows closed by adding depth rather than by deciding.** `glutes` was the biggest —
41 item tags read as the big glute alone — and it stopped being a judgment call once the group
node existed to hold both. `hip abductors`, `grip` and the three rotation strings stopped being
judgment calls once actions were nodes: they now land exactly, on the thing they always named.
That is the general lesson, and it is worth more than the six rows: **a review row is often a
missing node rather than an ambiguous string.**

Five were never anatomy and are recorded rather than dropped, because a vocabulary that deletes
what it cannot classify teaches nothing about why it could not: `posture` · `full body` (4 tags) ·
`anti-rotation` · `ankle stability` · `cervical movement sense`. Each carries a note
saying where it should go instead — mostly the `effect` facet, a self-test, or nowhere.

**Two alias collisions were caught by the checker during authoring**, which is the argument for
having written it: *"between the shoulder blades"* claimed by both `upper-back` and `rhomboids`,
and *"calf"* by both `lower-leg` and `calves`. Neither is a tidiness problem — it is a search that
silently returns one of two right answers.

Scale, honestly: the seed covers what the catalogue references today and stops there. Growing it
is the largest content-authoring job in the project, and the ten review rows need a human eye
each. `deep hip rotators (piriformis group)` versus `piriformis` is a judgment call, not a string
match.

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

### 6.6 Three relations between items, of which two exist

The catalogue already carries two item-to-item relations and is missing the third:

| Relation | Means | In data today |
|---|---|---|
| **pair** | do this, then load it | `loadAfter`, 67 items — law 1 written down |
| **swap** | do this instead | `swapGroup`, 42 groups |
| **stack** | do this *during* | nothing |

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

---

## 9 · What has to be built, in order

1. **Vocabulary files** (§10 rules) — pure data, consumed by nothing at first, therefore safe to
   land before any of the below is settled. *Started 29 Aug.*
2. **Schema extension (D15)** so a day item can hold facets at all. **Gated:** `GAPS.md` §4.3 —
   the migration ladder is append-only and needs Kevin's line before a rung is added.
3. **Stop dropping facets on add-to-day.** `viewLibrary.js` discards `category`, `kind`, `role`,
   `regions`, `muscles`, `equipment`, `context`, `swapGroup`, `loadAfter` and `nerves`; the
   validator has no slot for any of them. The 119 items in the shipped day protocols carry **zero**
   facets — their entire field set is `id, name, dose, why, tracking, target, fields, cadence,
   photos`. Whatever taxonomy wins, the composer would otherwise deal from a deck with no suits,
   and `loadAfter` (67 items — law 1 already written down as data) does not survive contact with
   the day.
4. **Anatomy graph** + fold-in of the 94 strings (§3). *Seeded 29 Aug — 101 nodes and a 94-row
   worklist, §3.1. Applying the worklist waits on step 2, and on ten review rows.*
5. **Wire the tests** (§5).
6. **Referral map** (§4).
7. **Faceted browse and search** (§8).

Steps 1 and 4 are content work and need no ruling. Step 2 is the only gate.

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

## 11 · Open questions

1. **The `effect` vocabulary (§2.3)** — the one worth arguing about before it is spent, since the
   ledger and the pairing law both build on it. Nine values; are `mobilise` and `lengthen` one
   thing? Is `condition` (cardio/capacity) in v1 at all?
2. **`type: intake`** — supplements are "ordinary content" per FRAMEWORK's decision record, but
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
- **T8 — a held position is an opportunity.** Stacking is §6.3's match with the base supplied by
  the catalogue rather than the day, so it needs body resources in `demands` (§6.5) and no new
  subsystem. The `stack` relation is derived, never authored per pair (§6.6).
