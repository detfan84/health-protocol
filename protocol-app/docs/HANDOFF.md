# Handoff — Shoes of Peace

*Written 23 Aug 2026, for whoever picks this up next. Read this before the
roadmap: the roadmap says what is intended, this says what is true.*

*Updated 29 Aug 2026 after the taxonomy session — §Where the home screen stands
is the part written for the next session specifically.*

**Live:** https://shoes-of-peace.kevin-c-bowie.workers.dev
**Code:** `C:\Users\kevin\Health App\protocol-app`, branch `protocol-app-v0.2`
**Deploy:** `npm run deploy` (direct upload to Cloudflare — a git push does NOT
deploy). **Tests:** `npm test` — **336 green** (30 Aug).

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

**Screens** (`src/app/ui/`) — Home (the front door), Today (grouped), Library, **Food &
supplements**, Learn, Protocols, Editor, Area, Session, Supply, Data, Reminders, Disclaimer,
announcer (the fail-loudly surface). Six tabs, which is a lot for a phone — Learn is the
thinnest if one has to go.

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

**Added to this list on 30 Aug, from Kevin directly:**

8. **The Learn tab.** It is the weakest screen in the app and he has said so twice. Its
   protocol remnants are gone; what should replace them does not exist. His brief: *"more
   information on the body and why we are doing the things we do with this app."* The spine
   I proposed and he has not yet ruled on: why the day has anchors and a sixty-second floor,
   why release comes before load, and the anatomy map — the app already knows 136 body parts
   and what refers pain where, which is genuinely "information on the body".
9. **Reminders.** Still calendar-export only. R19 ruled push out for v1, but the rulings log
   notes that memo was written for an iPhone and Kevin is on Android, where push works in an
   ordinary tab. Plausibly the difference between 0 loops and 1.
10. **The clock.** 06:30 wake, 07:00 flow, 20:00 evening, 22:00 bed — all invented, and
    there is no "when does your day start" question anywhere. If somebody's day does not
    match, most of it reads as "Circle back" every single day.
11. **Seated and lying content** for the woven block. It is called "Woven into what you're
    already doing" and all three items need you on your feet.

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
- **Content is generated from tables.** `authored/supplements.json` and `authored/foods.json`
  are build products — edit `scripts/build-{supplements,foods}.mjs` instead. Same for
  `reference.json` and `starter.json`.
- **A shipped protocol you edit stops receiving updates** (`lib/seed.js`). That is deliberate
  — it never overwrites your work — but if a plan ever stops getting corrections, that is why.
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

## Food & supplements — the newest thing here (30 Aug)

A whole tab that did not exist this morning. Read this before touching it, because the
shape took four corrections to find and three of them were me building the wrong thing.

**It is a TRACKER, not a shop.** Kevin: *"We are not selling or recommending supplements.
We are making it easy for someone to track what they take within their daily routine."*
Everything below follows from that sentence.

### What it is

- **Its own tab** (`Food`), its own search, `viewSupplements.js`. It is deliberately NOT in
  the main library — filing 110 substances into a shelf that slices by release/lengthen/load
  and by body part made them *harder* to find than before they existed.
- **Two halves, joined by the nutrient.** 110 supplements · 108 food rows · 27 nutrients.
  Ask for magnesium and pumpkin seeds and a capsule come back together.
- **The join is honest about its own limit.** 50 supplements name a nutrient you could eat;
  60 do not. Ashwagandha is not missing from anybody's dinner, and the card says *"No food
  route to this one"* rather than implying a column that is empty.
- **Add your own** — blends and proprietary tubs. Not an edge case: no list of a hundred
  covers them, and a tracker that cannot track what somebody takes is not a tracker.
- **Meal plan, and the shopping list that follows from it.** Both halves of Kevin's
  sentence, and the arrow runs one way: a week of Mon–Sun × breakfast/lunch/dinner/snack,
  you pick a slot and tap foods into it, and the list is what the plan needs. Grouped by
  aisle. A planned row says *which* meals want it and has no ✕ — it leaves when it leaves
  the plan, because a list that can silently disagree with the plan above it is worse than
  no list. Adding straight to the list still works and stays separate.
- **The app never decides what you eat.** It picks nothing, suggests nothing, and invents no
  meals — you choose the slot and the food. The only thing it works out on its own is the
  consequence for the shop. Inventing meals would be the sixty-seconds-per-item failure in
  an apron.

### The four rules that are load-bearing

1. **No warning theatre.** The first version put a `careful` on every item including vitamin
   D, enforced by a test *requiring* one. Kevin: *"you need a warning that you put too many
   warnings on stuff."* A caution on all of them is a caution on none. The test now inverts:
   `careful` must be **empty**, and practical facts live in the how-to. A second test fails
   if more than half the shelf carries even a note.
2. **No nutrition maths.** Servings are "a small handful", "one tin", "two nuts". Never a
   percentage of a daily value — those hide a dozen assumptions, and inventing them is the
   sixty-seconds-per-item failure in a new costume.
3. **Split a food when the preparation changes which nutrients it provides, or its aisle.**
   Fresh vs pickled beetroot, live vs jarred sauerkraut, UV-exposed mushrooms. Raw and
   roasted almonds stay one row. A test fails a form identical to its parent.
4. **A brand is not a substance.** Brands belong in offers, which do not exist yet.

### Both tables are TABLES

`scripts/build-supplements.mjs` and `scripts/build-foods.mjs`. Editing content is one line
per entry — do not hand-edit `src/content/authored/{supplements,foods}.json`, they are
generated. `npm run supplements` · `npm run foods` · then `npm run catalog`.

### Still open here

- **Affiliate links.** Kevin asked for these: *"what might be nice is to do affiliate links
  to amazon, rho, or other products to maybe make some money that way."* Not a question —
  the next thing to build. The field is designed and still empty. Design on record: on the
  reorder state, never on the education, so the money follows a decision already made. The
  one thing that cannot be written here is his associate tag / Rho id, which is an account
  detail rather than a design call.
- **Which supplements should actually be on the shelf.** The 110 are my picks of "commonly
  taken", which is the same guessing that got the palette wrong twice.

---

## The one that was hiding under everything (29 Aug)

**A revision to a seeded protocol could never reach an installed app.** Kevin: *"there's
stuff I thought we had worked on that hasn't changed."*

```
device says applied version : a366b1dba3d1
file  says version          : a366b1dba3d1      <- the same
device holds block named    : "While the kettle boils"    <- the old name
file  holds block named     : "While you're already up"   <- the new one
```

`protocolsToOffer` filtered on `!have.has(p.id)`, so anything the device already held was
never a candidate for anything. New *protocols* arrived; a *revision* to one could not.
And the version was stamped as applied regardless — the one record that could have shown
the gap was asserting there wasn't one.

`src/lib/seed.js` holds the rule now: **replace what the app gave you and you have not
touched; never replace what you have made your own.** A baseline is the fingerprint of the
shipped protocol *as installed*, so stored-vs-baseline asks "have you changed this?", which
is a different question from "does this match what ships today". `active` and the stamps
stay out of the fingerprint, or switching a plan off would freeze you out of corrections.

**The migration, stated:** devices seeded before baselines existed fall back to
`updatedAt === createdAt` as proof nothing has ever been saved. Blunt in one direction — a
plan you merely toggled reads as edited and stops updating — and it errs toward never
overwriting somebody's work. **If a plan ever stops receiving corrections, that is why.**

Verified end to end on a device that held the stale copy: it repaired itself on the next
launch, kept its on/off state, wrote ten baselines.

---

## The home screen, second cut (29 Aug)

The first collapse was worse, and Kevin said so: 1259px of scroll on an 812px phone, six
equal rows, and the largest thing on the page was a card reading "Nothing scheduled this
minute" while three blocks sat open underneath it.

His brief: *"what's up now in the current time slot should be front and center. What's
completed should vanish (but still be accessible)… what didn't get done, but the time has
passed is still at the top of the list to circle back to, just not drawing the same
attention… what's to come can be on there, but again smaller… not adding to the
overwhelming list that turns into a wall of obligation."*

So the type scale IS the hierarchy, and exactly one thing is loud:

```
Now          one big card, the only filled button on the screen
Circle back  missed, directly under it, plain rows - no card, no accent, no button
Later        one folded line
Anytime      one folded line
Done today   one folded line - off the day, still reachable
Browse + a thin row + the plans fold
```

**882px. The whole front door is one screen.**

Two calls worth knowing. When the clock has nothing to say, Now says so and offers **no
button** — handing somebody an arbitrary anytime block is the app choosing for them, and
"nothing here judges what you pick" does not lapse because there is a gap in the clock.
And Done counts what is in a drawer, never a proportion (law 2).

`viewHome` takes an injectable `now`. A screen whose whole job is reading the clock cannot
be tested by a suite that only ever sees the time it happens to run at.

---

## The opportunity layer, and the cadence it needed (29 Aug)

Kevin, on the rise block: *"'while you're already up' isn't a good label, because some
things are while you are seated or lying down… that one will perpetually be front and
center unless they have done 3 per day already so that's not right either."*

**It is `Woven into what you're already doing` now**, with **no window** and every item
`{ kind: 'timesPerDay', n: 3 }` — a new cadence kind. A thing you do whenever you are
already doing something cannot be retired by a clock, and a single daily tick cannot count
it. Three passes and it stops asking for the day.

- `check.ats: [iso, …]` — the moments behind one check. `timesDone` reads a record with no
  `ats` as **one** go rather than none, so nothing already written changes meaning.
- A repeatable tap **counts up and wraps to nothing**. No second control: on a three-a-day
  item the way back is at most three more taps.
- The row shows `1 of 3 today`, and unlike the weekly count this is **not opt-in**. R17
  makes the weekly number a choice because it is a target reflected back at somebody; this
  is the state of a control, and a row that showed nothing after a tap would look broken.
- **Home:** a windowless block whose items repeat takes the Now card when the clock has
  nothing to say — found by *shape*, not by id. Offering it is not the app choosing; the
  plan already chose. Verified live at 07:00, 14:00 and 21:00.

**Still not true, and worth saying:** all three items in that block are done on your feet.
The name can hold a seated or lying variant; the content has none. FRAMEWORK part 4.

### The bug this exposed

`Morning flow` carried **a start and no end**, and `todayModel` runs such a block until the
next timed block begins. It had been colliding with another 07:00 start, so its window
collapsed to nothing and it read as missed all day; dropping the rise block's window
changed what came next and it went to owning the Now card until 8pm. Both readings were
accidents of what else was scheduled. **Flow blocks carry an end now**, and a test fails on
any block with a start, no end, and something scheduled after it.

---

## Open: colours and icons

**Settled, 30 Aug: Desert night is the default-able dark scheme** and is live on the You
screen. Kevin liked it best of four, and the two corrections that made it work are in
`tests/palette.test.js`: the hue runs through *every* token, and nothing may exceed 0.6
luminance — every other dark theme here puts body text at a near-white (.78–.81) and that
is what blasts you at 5am. Desert tops out at .52 and still reads 9.9:1.

Kevin's verdict on the set: *"I'm not loving any of them though. And we still have more
important stuff to fix."* So this is parked, not finished. **Icons are untouched** — A and
B were "the best options but they still aren't great", and he asked whether to outsource.
My answer on record: not yet, because there are seven icons left, all behind a fold, and
nobody has used the app for a day.

The first four proposals were rejected, correctly: *"nearly the same thing with a different
color button. The colors should be throughout the theme."* The brief that came with it —
**dark by default but with other options, and intentionally avoid blue light. Desert or
sunset. Darker without being black.**

Second pass carries the hue through every token (ground, surface, rule, muted, ink) and is
measured rather than described: a neutral grey is 33.3% blue by definition, so each
candidate states the blue share of its background. Current Paper sits at 32.8% and Slate at
33.7% — grey with a tint. Desert night 26.7% · Ember 29.5% · Clay 31.4% · Sunset 31.9%.

Icons: unchanged, no opinion given yet.

Also open, and the honest note for whoever reads this: **I could not see the screen.** The
Browser pane would not display in that session, so every check was DOM measurement —
element counts, computed styles, page height. That is how the first cut passed as a win at
1259px. If the pane works for you, use it.

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
