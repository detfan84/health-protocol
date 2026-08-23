# Handoff — Shoes of Peace

*Written 23 Aug 2026, for whoever picks this up next. Read this before the
roadmap: the roadmap says what is intended, this says what is true.*

**Live:** https://shoes-of-peace.kevin-c-bowie.workers.dev
**Code:** `C:\Users\kevin\Health App\protocol-app`, branch `protocol-app-v0.2`
**Deploy:** `npm run deploy` (direct upload to Cloudflare — a git push does NOT
deploy). **Tests:** `npm test` — 94 green as of this writing.

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

**Data layer** (`src/lib/`) — `schema.js` (SCHEMA_VERSION 2, migration ladder),
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
