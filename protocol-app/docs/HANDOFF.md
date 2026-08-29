# Handoff — Shoes of Peace

*Written 23 Aug 2026, for whoever picks this up next. Read this before the
roadmap: the roadmap says what is intended, this says what is true.*

*Updated 29 Aug 2026 after the taxonomy session — §Where the home screen stands
is the part written for the next session specifically.*

**Live:** https://shoes-of-peace.kevin-c-bowie.workers.dev
**Code:** `C:\Users\kevin\Health App\protocol-app`, branch `protocol-app-v0.2`
**Deploy:** `npm run deploy` (direct upload to Cloudflare — a git push does NOT
deploy). **Tests:** `npm test` — **276 green** (29 Aug).

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
  A test now reads every screen looking for raw values.

---

## Where the home screen stands (29 Aug)

The thing Kevin actually asked for on 29 Aug, before the session went sideways into
taxonomy: *"the day arc shouldn't be parked alongside the things that are contained within
it… recommended daily arcs for simplicity, each with different levels of time commitment…
whatever is chosen can be completely modified, or people can build their own."*

**None of it is built.** The home screen still offers 5 active protocol tiles + 5 switched-off
ones + 6 More tiles, with the day arc sitting beside the four things it draws from.

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

**So the first job next session is not the layout. It is durations** — and the honest version
is per item, from the content, the way the measurement units were parsed out of the cards
rather than guessed at build time (`TAXONOMY.md` §5.2). Where an item genuinely has no
sensible duration, it should say so and the budget should say "plus a few things with no
clock on them", not silently add a minute each.

### Suggested order

1. **Durations**, or the time-budget idea is built on an invented number.
2. **The tile collapse** — Right now · the rest of today · Browse · a thin row. This part
   needs nothing new and is the visible win.
3. **Day templates** (slots with a budget) — the presets, once 1 exists.
4. **Slot editing** — swap, drop, add. The "make it yours" half.

### And nothing is deployed

24 commits ahead of `origin`, nothing pushed, nothing built to the worker. The live URL is
still running the build from before 29 Aug. `npm run deploy` is a direct upload — a git push
does not deploy (see §The one lesson that cost the most).
