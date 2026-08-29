# Handoff — Shoes of Peace

*Written 23 Aug 2026, for whoever picks this up next. Read this before the
roadmap: the roadmap says what is intended, this says what is true.*

*Updated 29 Aug 2026 after the taxonomy session — §Where the home screen stands
is the part written for the next session specifically.*

**Live:** https://shoes-of-peace.kevin-c-bowie.workers.dev
**Code:** `C:\Users\kevin\Health App\protocol-app`, branch `protocol-app-v0.2`
**Deploy:** `npm run deploy` (direct upload to Cloudflare — a git push does NOT
deploy). **Tests:** `npm test` — **305 green** (29 Aug).

---

## The one lesson that cost the most

Content that does not ship is content that does not exist.

For four days the app was deployed with a full body-work library sitting in the
repo: converted, tested, working — and written to a **gitignored file, with
every protocol `active: false`**, which `scripts/stage-dist.mjs` does not ship.
Kevin opened the deployed URL and found an empty app with a water tracker. Every
report written in that period was true of a screen nobody was looking at.

**So: verify on the deployed URL, in a wiped browser, as a person who has never
seen it.** Not on localhost. Not with a protocol imported by hand. If a claim is
about what a person sees, open what they open.

Two mechanical traps behind it, both still live:

- `scripts/stage-dist.mjs` has a `SHIPPED` allowlist. Anything not in it does
  not deploy, silently. It now fails closed if a listed entry is missing.
- Anything shipped with `active: false` is invisible. A test in
  `tests/screens.test.js` now fails the build if seed content arrives switched
  off, unless it is an alternate strength routine that says how to turn it on.

---

## What is built

**Data layer** (`src/lib/`) — `schema.js` (SCHEMA_VERSION 3, migration ladder),
`db.js` (every op named and contextual on failure; `mutate()` does
read-modify-write in ONE transaction), `protocolFile.js` (forgiving validator,
warns on every repair), `core.js`, `units.js` (volume in ml, weight in kg,
canonical under a display setting), `cadence.js`, `reminders.js`.

**App logic** (`src/app/`) — `store.js` (the only door to storage; `mutateDay`
serialises day writes), `todayModel.js` (`buildToday` → groups), `trackerOps.js`
(checks, journal, food, water, supply, pause, training log), `editorOps.js`,
`failLog.js`.

**Screens** (`src/app/ui/`) — Today (grouped), Protocols, Editor, Supply, Data,
Reminders, Disclaimer, announcer (the fail-loudly surface).

**Behaviour that exists and is tested:**

- Today is **grouped**: Now · still open from earlier · anytime · later · when
  needed · not asking right now · done. Large groups fold to one line.
- **Cadence**: daily / n× a week / every n days / when needed. Not-due items are
  off the screen entirely.
- **Pause** (R16): pause anything, restart anytime; a supply count of zero
  auto-pauses and restocking brings it back. Pause lives in settings, so it
  never travels inside a shared protocol.
- **Past days** (D21): arrows and a date picker capped at today; every write
  lands on the day being viewed.
- **Training log** (PLAN §4.2): sets with reps and load, or a duration, with
  last time's numbers shown above. Stored beside the checks, never inside them,
  so un-ticking cannot destroy typed numbers.
- **The day arc anchors** (FRAMEWORK): before your feet touch the floor · while
  the kettle boils · evening deep release · in bed winding down. Each has a
  sixty-second floor as its first item (law 6).
- **Content that ships** (`src/content/starter.json`, built by
  `npm run content`): the day arc, morning and evening flows, 33 body-work
  cards with photographs, 17 daily practices, 6 strength routines.
- **Fail-loudly** (D24): confirm-then-paint, real Retry, breadcrumbs at next
  launch, three-state absence everywhere.
- **PWA**: manifest, generated icons (`npm run icons`), network-first service
  worker, `storage.persist()` with the browser's real answer shown on Data.
- **Disclaimer gate** on first run, versioned, re-readable on Data.
- **Reminders**: schedule model + calendar (.ics) export with per-kind cadence
  and quiet hours. Push is ruled calendar-only for v1 (R19).

## What is NOT built, in the order I would do it

1. **The composer** (FRAMEWORK's day engine). The anchors ship; the rotating
   middle of the day does not. Everything it needs to read exists as vocabulary
   now — cadence, pause, the item shape, past/current/later — but the coverage
   ledger, findings and weighted rotation are unwritten. This is the largest
   remaining build and the roadmap's Phase 2 lead.
2. **Sleep-position onboarding** (D30) — the wake block currently ships one
   generic set and says so. The unwind-the-night principle wants the question.
3. **Movement snacks and the awareness layer** (day arc parts 3–4). Snacks are
   partly covered by repeating reminders; the swap groups are not built.
4. **Progress**: measured self-tests (D36 — knee-to-wall, forward fold, CO2
   tolerance all exist in the old app's `METRICS`), and the progress map (D34).
   The training log now gives these something real to sit on.
5. **The three doors** (quiz, module browser, deep-dive) — P2, unstarted.
6. **Records out**: doctor summary with denominators (D26), labs, artifacts.
7. **Ship hygiene**: About/story, help, for-clinicians, landing, legal.

## Things that will bite you

- **Kevin is on Android**, not iPhone. Push works in a plain tab there; the
  iOS constraints in the Aug-22 push memo do not apply to his phone.
- The old app at the repo root (`master`) is the content source:
  `src/data/{bodywork,stretching,exercises,routines,movements}.js` and
  `public/bodywork-images/`. `npm run content` reads them. Personal detail is
  generalised in `scripts/build-content.mjs` — every rewrite is in `GENERALISE`
  and `SECTION_NOTES`, in the open, and a test fails if a brand name or a
  first-person laterality gets back in.
- `starter-protocols.json` (gitignored) is **Kevin's own** supplement protocol,
  converted from the old app by `npm run convert`. It is not shipped and must
  not be.
- Day-record writes must go through `store.mutateDay`. A plain
  load-then-save loses taps when a thumb moves fast.
- `h()` drops null children; the raw DOM `append()` renders the word "null".
  **Use `add(el, ...children)` from `dom.js`** wherever a conditional child
  meets an element that already exists. The guard test now walks TEXT NODES
  across seven screens — the old one joined `textContent` and tested
  `/\bnull\b/`, which cannot see a null glued between two words, and the
  session runner shipped three of them per card because of it.

---

## Where the home screen stands (29 Aug)

The thing Kevin actually asked for on 29 Aug, before the session went sideways into
taxonomy: *"the day arc shouldn't be parked alongside the things that are contained within
it… recommended daily arcs for simplicity, each with different levels of time commitment…
whatever is chosen can be completely modified, or people can build their own."*

**The tile collapse is built** (29 Aug — see §The tile collapse below). The presets, the
time budgets and the slot editing are not. The home screen is now Right now · The rest of
today · Browse · a thin row, with the plans folded underneath, so the day arc is no longer
a peer of the four things it draws from.

### What the taxonomy session unblocked

- **Collapsing the tile grid.** Browse exists now — the library slices by effect, body part,
  pattern, equipment and context, with counts. It is the single door the "More" row was six
  bad answers to.
- **The arc-off shape.** Every item has an `effect`, so a grid of *release / lengthen / load /
  calm* is real content rather than five source files wearing category names.
- **Slot specification.** A slot can now say what it wants — an effect, a body region, a
  piece of equipment, a context — because every one of those is a facet with values.

### What it did NOT unblock, and this is the one to know

**374 of 383 catalogue items have no duration.** Only 8 carry `amount.seconds`. Of the 119
items in the shipped day, 38 have one.

So *"recommended arcs at 7, 20, 40 and 70 minutes"* — the centre of the idea — **cannot be
built honestly today.** The app does not know how long anything takes.

Worse: it is already pretending. `viewHome.js:56` computes the minutes on the Right Now card
as `it.amount?.seconds ?? 60` — **sixty seconds per untimed item, invented.** Most of that
number is fabricated, and it is displayed to a person as though it were known. It is the same
failure the 28 Aug correction log records for the add-flow inventing `3 × 10` and forty-five
seconds, still live on the busiest screen in the app.

**Durations were done on 29 Aug and the answer is uncomfortable — see below. The first job
next session is not the layout. It is durations** — and the honest version
is per item, from the content, the way the measurement units were parsed out of the cards
rather than guessed at build time (`TAXONOMY.md` §5.2). Where an item genuinely has no
sensible duration, it should say so and the budget should say "plus a few things with no
clock on them", not silently add a minute each.

### Suggested order

1. **Durations**, or the time-budget idea is built on an invented number.
2. ~~**The tile collapse**~~ — Right now · the rest of today · Browse · a thin row. Done
   29 Aug.
3. **Day templates** (slots with a budget) — the presets, once 1 exists.
4. **Slot editing** — swap, drop, add. The "make it yours" half.

### Pushed and deployed, 29 Aug

The tile collapse is live: build **`20260829T2243Z-bf89d5e`** (version `a72d4839`),
verified on the deployed URL — seven things on the front door before a fold is opened,
"Anytime today — 12 parts, 51 things", "Your plans — 5 on, 5 off", and the session runner
free of the raw `null` it had been printing. `bf89d5e` is committed but **not pushed**.

Before that, thirty commits on `origin/protocol-app-v0.2` and build
**`20260829T2212Z-b2b6192`** (version `4158bd47`). Verified on the deployed URL in a browser
that had never seen the app: the disclaimer gate fires, and the shipped catalogue is 383
items, 136 anatomy nodes, 6 referral sites, with zero items still carrying `kind` or
`category`.

`wrangler` auth is an OAuth token in `~/.config/.wrangler` — it will expire, and
`npm run deploy` is a direct upload, so a git push still does not deploy.

### Start here next session

Step 2 below is **done** — see §The tile collapse. What is left:

1. **Presets carry their own authored minutes.** "Floor — about 7 minutes" is a design
   statement about a preset somebody built, not a sum over items. This is what unblocks the
   idea without waiting on ~80 duration decisions. **It needs Kevin: what ARE the presets?**
   Four budgets (7/20/40/70) was the shape of the idea; which items each one holds is a
   content decision nobody has made.
2. ~~**Collapse the tiles**~~ — done 29 Aug.
3. **Day templates** — slots with a budget. A slot can already SAY what it wants, because
   every item carries `effect`, `target`, `equipment`, `context` and `pattern`.
4. **Slot editing** — swap, drop, add. The "make it yours" half.

`lengthForYou` is adopted (step 2), on Home and on the area pages both — the same block
saying two different numbers on two screens would have been worse than neither saying one.

**And the honest gate on all of it:** `Working_Record_v1.md` §1 still reads **0 loops**.
Phase 1's done-when is Kevin's real daily use running on this build, and it has not happened
yet. Everything above is easier to judge after a few days of using the thing.

---

## The tile collapse, done 29 Aug

Kevin, 29 Aug: *"the day arc shouldn't be parked alongside the things that are contained
within it."* The front door was sixteen tiles — five active protocols, six "More"
destinations, five switched-off ones — which is not a menu, it is the same list with
borders on it. Three of the six More tiles (Library, Reference, Track) were already tabs.

**The front door is now:** Right now · The rest of today · Browse · a thin row, with the
plans folded underneath.

- **The rest of today** is BLOCKS, not protocols — "Evening wind-down, from 9:00 PM, 10
  left, about 8 min", each one a tap that starts it.
- **Browse** is the single door the More row was six bad answers to.
- **The thin row** is the three places that are not tabs: Everything today · Supply · Plans.
- **Your plans** is a closed `<details>` holding every protocol tile, on and off. Nothing
  lost a door — that is the rule 197da3e broke and the navigation test still guards it,
  now without pinning the widget.

### What the browser found and the tests did not, again

The first cut drew **nineteen rows**. Every body-work section and every support section is
an untimed block, so all thirteen of them landed in "the rest of today" — the sixteen-tile
problem in a new shape. The suite was green: the fixture had two protocols. So the untimed
blocks now fold to one line ("Anytime today — 13 parts, 53 things"), and there is a test
that renders Home **on the shipped content** and fails if more than eight things are
visible before a fold is opened. Add fifty body-work cards and that number must not move.

### And a live "null" on the busiest path

The session runner was appending three conditional children with the DOM's `append` rather
than `h()` — so every item with no `tier`, no `dose` and no `why` showed **`nullnullnull`
under its name**. On the deployed app that is the first card of the day arc.

The guard test for exactly this failure existed, was green, and could not have caught it
for two independent reasons:

1. It drew **only Today**, while being named "no screen ever prints null".
2. It tested `/\bnull\b/` against the page's joined `textContent`. Appending null between
   a heading and a paragraph produces `Item 0anullnullnullTool: a soft ball` — every
   "null" flanked by word characters, so **not one of them has a word boundary**. The
   regex was not weak here; it was blind.

Now: `add(el, ...children)` in `dom.js` (what `h()` always did, for elements that already
exist), used at the three sites where a conditional child met a raw `append`; and the guard
walks **text nodes** across seven screens. Verified failing against the old code before the
fix went in.

---

## Durations, done 29 Aug — and what they showed

The invented minute is gone. `viewHome` and `viewArea` now read `lengthOf` /
`lengthText` from `src/lib/durations.js`, which parses a time out of a dose where the
dose states one and returns **nothing** where it does not.

What is deliberately not parsed, because none of it is a clock: `5 breaths` (a breath is
not a unit of time, and slow breathing is the point of most items that count in them),
`2 × 10, slow`, `3 rounds per side`, `all day`, and anything carrying an explicit
`[undetermined]` — somebody looked at that dose and decided not to say.

**The result: 14 of 383 catalogue items say how long they take.** The shipped day, block
by block:

```
The day arc › all four blocks            about 2–9 min each   ← authored with durations
Morning / Evening flow                   about 8 min each     ← authored with durations
Daily support › Movement                 3 things, none of them timed
Daily support › Drainage & recovery      8 things, none of them timed
Daily support › Mind & nervous system    6 things, none of them timed
Body work › all eight sections           2–10 things, none of them timed
Full Body                                6 things, only 1 timed (about 1 min of it)
```

**Twelve of eighteen blocks carry no clock at all.** That is the real state, it was always
the real state, and until today the screen was papering over it at sixty seconds an item.

One wording rule worth keeping: when most of a block is untimed the **count leads and the
minutes follow in brackets** — "6 things, only 1 timed (about 1 min of it)". The first
version said "about 1 min, plus 5 with no clock on them", which describes a strength
session as a minute long. A true number in a misleading position is still misleading.

### What this means for the presets

Two ways forward, and they are not exclusive:

1. **Author durations for the body-work and support content.** ~80 items in the shipped
   day. Real work, and the honest kind — a foam-roll card genuinely has a dose, it just
   was never written down.
2. **Let a preset carry its own authored minutes.** "Floor — about 7 minutes" is a design
   statement about a preset somebody built, not a sum over items. That is honest even with
   the catalogue as it stands, and it is probably how the presets should work anyway: the
   per-item numbers then improve the *live* estimate rather than defining the preset.

Route 2 unblocks the home screen next session. Route 1 is the content job that makes the
live estimate mean something, and it is now visible as a number that will move.

### Pace — what it actually took you (29 Aug)

Kevin: *"allow for people to add the time it actually took them to do so they can know
exactly what their pace is, and for some things, they might get quicker over time."*

`log[itemId].took = { seconds, at, source }` — wall-clock time spent, which is **not** the
same as `seconds`, a duration-tracked dose. A plank held for forty-five seconds and a
body-work card that took you four minutes are different numbers.

**Two ways it arrives, and they are not the same claim.** A typed number is somebody saying
(`source: 'typed'`) and it always wins. The other is the session's own clock — **explicit,
and it does not run by itself.**

The first version measured the gap between putting a card on screen and being told to move
on, which counted reading, deciding and walking away, and could not tell any of those from
the movement. Kevin, same day: *"there has to be a way to know if you are just browsing
through the cards and not exercising, or if someone takes a break to grab a drink or go to
the bathroom or take a phone call… it shouldn't automatically record if just skipping
through, it should have a pause, and a way to correct the final time."*

So every card in the runner carries **Start / Pause / Resume**, and time accrues only while
it runs. Flick through ten cards without starting one and **nothing is recorded**, which is
the right answer because nothing happened. Take a call and the clock waits. A duration item's
countdown drives the same total, so a timed hold counts as work without a second button. The
card says it out loud: *"Only counts while it is running. Leave it alone and nothing is
recorded — reading a card is not doing it."*

Correcting it is the typed field on Today, which always wins over the clock.

**A measurement the instrument cannot make is not recorded.** Over an hour from the runner
is dropped — somebody who left the app open did not spend two hours on one release, and
writing it down would poison their own pace. A person may still type it: that is their
statement rather than ours.

**`typical` is the median**, so one strange session does not redefine what "usually" means.

**And there is no verdict.** Getting quicker is not obviously better — a release rushed is a
release wasted, and a faster flow may only be efficiency — so pace reports the change and
attaches nothing to it. Same rule as an unlabelled measurement in `TAXONOMY.md` §5.3.

**The payoff, and the reason this matters for the presets:** `lengthForYou(items, history)`
tells a block in a person's own times where they have them, falling back to the card's where
they do not, and reports how many were yours. *"About 8 min"* is what the cards say; *"about
11 min"* is what it takes you. With 369 items carrying no duration, a person's own times are
the faster route to an honest estimate than authoring 369 numbers — **the app can learn the
day it is actually being used.**

Not wired into the home screen yet. `lengthForYou` exists and is tested; `viewHome` still
calls `lengthOf`. That is a one-line change and belongs with the home-screen work, where the
copy can say which kind of number it is showing.

### Timed sets (29 Aug)

Kevin: *"some of the sets weren't reps but a timed duration — 30 seconds, 60 seconds, 90
seconds."*

`cleanSet` in `trackerOps.js` has kept a per-set `seconds` since the training log was built,
and **nothing had ever offered it** — so a timed set had to be written down as a rep count
or not at all. Both the Today card and the session runner now show `reps · sec · weight`,
with reps and seconds as alternatives rather than a pair: neither invents the other.

One test-writing note that cost a green suite: `tests/screens.test.js` selected set inputs by
**position** (`inputs[0]`, `inputs[1]`), so adding a field between them broke it. They select
by `aria-label` now, which is what the rest of the suite does.
