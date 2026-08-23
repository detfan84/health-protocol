# GAPS.md — what is specced, what is built, and the distance between

*First written 23 Aug 2026. **Standing register, not a one-off report:** append to it, date
the entries, and let closed rows stay closed with a date on them rather than disappearing.*

*Named as CC homework in `Protocol_App_Roadmap_v1_7.md` (Phase 2) and `FRAMEWORK.md` (open
item 4), and logged in `Working_Record_v1.md` §2 (22 Aug) as a file that had never existed
anywhere — not in the repo, not in git history, not on the machine. This is that file. The
correction-log entry closes with it.*

**Precedence.** Where this file and the roadmap disagree about what is **built**, this file
governs — it is measured, not remembered. Where they disagree about what is **intended**,
the roadmap governs and the disagreement is a correction-log entry.

**Method (repeat it before trusting any row).** Every spec doc read against the code at
HEAD; `npm test` run; the deployed `build.js` fetched and compared to `git rev-parse`.
Nothing below is inferred from a commit message.

---

## 0 · Ground truth, 23 Aug 2026

- **HEAD:** `197da3e` on `protocol-app-v0.2`.
- **Deployed:** `20260823T0352Z-197da3e` at https://shoes-of-peace.kevin-c-bowie.workers.dev
  — deployed code equals the working tree. No repeat of the four-day gap.
- **Suite:** 97 green.
- **Working tree:** `src/content/starter.json` modified — timestamps only (see §2.4).

### Ledger corrections raised by this pass

| Document | Says | Measured | Disposition |
|---|---|---|---|
| Roadmap v1.7, layer 1 | 39 tests green | 97 | stale, three times over |
| `PLAN_3-5_dropcheck.md` §Notes | 45 tests green | 97 | superseded by this file |
| `HANDOFF.md` | 94 tests green | 97 | stale by three commits |
| `HANDOFF.md` "What is built" | supply/auto-decrement, past days, reminders | partial — see §3 | corrected below |

---

## 1 · The distance, by roadmap layer

| Layer | Built | Not built |
|---|---|---|
| **0 — Law** | five content laws, fail-loudly + three-state (D24), placement rule (D19), epistemic-status law | — |
| **1 — Data core** | schema, db, validator, merge referee, migration ladder (SCHEMA_VERSION 2) | **the D15 extension step, in full** |
| **2 — Day engine** | *nothing* — the six anchors ship as ordinary content, not as composed output | composer · coverage ledger · findings + weights · dial + per-item targets · day templates · taxonomy · content tiers |
| **3 — Daily surfaces** | Today (grouped), session runner, cadence, pause (R16), past days (D21), training log (D22 extension), persistent storage (Q5), disclaimer gate, PWA, reminder model + `.ics` | Q2 snapshots (D20) · Q3 auto-decrement (D22) · Q4 time display (D23) · Q6 phase auto-advance (D14) · D12 in-app delivery · activity log (D33) · morning capacity check (D32) · focus list (D41) · progress map (D34) · progress photos (D35) · guided playback (D31) · self-test measurement (D36) |
| **4 — Three doors** | library browser — 258 catalogued items, add-to-day; a real precursor to the module browser | recognition quiz · deep-dive excavation |
| **5 — Records out** | `LABS` store exists in the schema, unused | doctor summary · artifact family · labs UI · export-for-AI · answer-set export |
| **6 — Education** | Reference screen: 4 diet phases, 6 spacing principles, 15 symptoms | connection cards · awareness curriculum · toolkit port · PEM education (D28) · joint security (D39) · sleep setup (D30) |
| **7 — Profile** | — | templates (K5) · pacing profile · faith layer · achievements (8b) · reverse referral (D37) |
| **Ship hygiene** | design system, calm palette, reduced motion, accessibility, persistent-storage request, disclaimer, version display | feedback button · About/story · help + FAQ · early-version note · landing · for-clinicians · legal · domain · single-file edition |

**The headline: layer 2 is at zero.** `grep -riE "ledger|finding|rating|dial|tier|swap"` over
`src/` returns nothing structural. Everything from layer 4 down consumes composer output, so
the whole lower half of the map waits on one build.

---

## 2 · Regressions — built, then lost

These are drift, not design questions. None of them needs a ruling.

> **All four closed 23 Aug 2026**, same session, with tests that fail if they come back:
> `tests/navigation.test.js` pins that every screen the shell can draw has a door and that
> deleting a seeded protocol survives a content update; `tests/screens.test.js` pins the
> weekly count off-by-default. Suite 97 → 104. **2.3 also builds R17**, which was ruled and
> unbuilt rather than drift. Kept below with their diagnosis intact — a register that deletes
> its closed rows teaches nothing about how the same mistake gets made twice.

**2.1 — Supply and Plans are unreachable.** `src/app/ui/app.js` lists five tabs (home,
library, reference, track, data); the branches at lines 153 and 158 handle `'plans'` and
`'supply'`, and nothing anywhere sets either. Commit `197da3e` — the menu → area → session
redesign — dropped both from navigation without a replacement. What is lost:

- **no way to create a protocol** — `newProtocol()` is only wired to the Plans screen;
- **no way to switch a protocol off** — `viewArea` offers "Put this on my day" and no inverse;
- the Supply screen, and with it every supply count.

Worse than orphaned: `src/app/ui/viewToday.js:344` tells a person whose count hit zero to
"Restock it on the Supply screen and it comes back on its own" — pointing at a screen that
can no longer be opened. A fail-loudly app must not hand out a dead instruction.

**2.2 — Shipped content can never reach an installed app.** `src/app/ui/app.js:279` reads
`String(file.seedVersion ?? 'v1')` and compares it to the stored `seed.applied`.
`starter.json` carries no `seedVersion`, and `scripts/build-content.mjs` never writes one, so
the version is permanently `'v1'` and every launch after the first returns early. Anything
added to the shipped content from now on reaches new installs only. This is the "content that
does not ship is content that does not exist" lesson in a new costume — the file ships, and
the app declines to read it.

**2.3 — The weekly count is computed and discarded.** `src/lib/cadence.js:99` returns
`doneThisWeek` and `target`; no screen renders either. R17 ruled the display question — off by
default, on if the person turns it on — and the switch does not exist.

**2.4 — Content builds churn their own timestamps.** `npm run content` restamps
`createdAt`/`updatedAt` on every seed protocol each run, so `starter.json` diffs on every
build even when no content changed. `updatedAt` is the merge referee (D15); a field that moves
for no reason is a referee that has stopped refereeing.

---

## 3 · Claimed built, measured not built

`HANDOFF.md` is more generous than the code in five places. Corrected here so they are not
planned against.

> **All five closed 23 Aug 2026** — the Phase 1 build queue (Q2, Q3, Q4, Q6) finished in one
> session. Suite 104 → 135. Diagnoses kept below; what each one now does is in §4.
>
> One bug found while verifying rather than by a test, and worth recording as its own lesson:
> the supply screen saved a field at a time with a load-then-save gap in the middle, so three
> edits in quick succession all read the same pre-edit record and two of them vanished under a
> green tick. It is the same failure `mutateDay` was written to prevent, in a store nobody had
> thought to protect. `store.mutateSetting` now closes it. **The tests were green throughout** —
> it took driving the real screen to see it.

- **D20 check-off snapshots — not built.** `trackerOps.js:67` writes `{ at }` and nothing
  else. No item name, no dose, no units-actually-taken. Rename an item or change its dose and
  every past record silently changes meaning — precisely what D20 exists to prevent.
- **D22 auto-decrement — not built.** Supply is a hand-typed number on a screen you cannot
  reach (§2.1). No units-per-dose config, no unit strength, no silent decrement on tap, no
  restore on un-tick, no recorded-units visible after the tap. What *is* built is the derived
  half: a stored zero makes an item unavailable and stops the app asking (R16).
- **D12 in-app delivery — not built.** `src/lib/reminders.js` has exactly one consumer,
  `viewReminders.js`. The schedule model, the kinds (R20), quiet hours and `.ics` export are
  real and tested. The open-triggered and while-open nudges that D12 names as *v1's actual
  delivery mechanism* do not exist, so R16's "a missed item may prompt, opt-out" has no path.
- **D36 self-tests — content only.** Thirteen `selftest` items ship in the library
  (knee-to-wall, forward fold, chest expansion, wall angel…), every one `tracking: 'check'`.
  No measurement recorded, no 2–4-week cadence, no sparkline, no delta. A tick box on a
  measurement is the same failure PLAN §2 named for sets and reps.
- **Q4 (D23 time display) and Q6 (D14 phase auto-advance) — unstarted.** `todayModel.js:17`
  says so in a comment; the `startedAt` that auto-advance would count from is already stored.

---

## 4 · Recommended order

1. ~~**Regression repair** — §2.1 through §2.4.~~ **Done 23 Aug.**
2. ~~**Finish Phase 1** — Q2, Q3, Q4, Q6.~~ **Done 23 Aug.** What shipped:
   - **Q2 / D20** — a check-off records the item's name, its dose, and the units actually taken,
     at tap time. Rename an item afterwards and the record still says what you took.
   - **Q3 / D22** — per item, an optional dose: units per dose, what a unit is called, how strong
     one is. Check off and the count goes down; un-check and it comes back exactly; correct the
     units afterwards and the count follows. Both stores move in one transaction (ruling B).
     The screen now lists only what is actually tracked, with everything else folded by area —
     it used to ask how many calf stretches you had left.
   - **Q4 / D23** — times read in the device's convention by default, with an override on the
     You screen. Storage stays `HH:MM`, so a shared plan is the same plan on both phones.
   - **Q6 / D14** — a phase with a length runs out and the next one starts, cascading correctly
     for a plan opened months late, never wrapping past the last phase, and never advancing a
     protocol that is switched off or a day being looked back at.

   **Phase 1's done-when is not met yet**, and it is not a build item: *Kevin's real daily use
   runs entirely on the new build, and the round trip loses nothing.* The machinery is there;
   the loop count in `Working_Record_v1.md` §1 is still 0.
3. **Schema extension step (D15)** — the roadmap's own first P2 item, and the stores every
   day-engine piece writes into. Needs Kevin's line first: the ladder is append-only, so a
   released rung is never edited (see §5, G1).
4. **The composer** — the spec spine, at zero, and the largest single build since foundation.
5. Doors, records out, education — all downstream of 4.

---

## 5 · Rulings that gate the above

**All five were put to Kevin on 23 Aug and four are closed.** Rulings in
`Session_Rulings_2026-08-22.md` under the Aug-23 heading.

| | What | Ruled |
|---|---|---|
| **G1** | the three "strike on review" flags inside D42 | **R25** — pain is the medium of this work; the "pain or joint" chip is struck and replaced by a narrower *it gave way* joint signal; teach once, sequence the on-ramp, never warn per item. The not-helpful thumb stays folded in by standing default (unstruck). Running order confirmed. |
| **G2** | R21 tail — what Today carries in the meantime | **R23** — nothing now, the composer properly. No interim shim. |
| **G3** | D12 in-app nudges — now or later | **R24** — now, narrowly. One surface reading the schedule that already exists. |
| **G4** | K5 template slate | **R26** — waits for the library to fill out; leaves Phase 0's open list. Mechanism untouched. |
| **G5** | FRAMEWORK v3 markup and commit | still open; blocks nothing |

Carried forward from roadmap Phase 0 and not re-opened here: faith-layer note-first shape +
reflections count · Connection map §3–9 review + epistemic audit (Kevin critical path) ·
vocabulary provisional flags · achievement catalog · the D5 contrast-module seam.

---

## 6 · Re-running this check

```
npm test
git rev-parse --short HEAD
curl -s https://shoes-of-peace.kevin-c-bowie.workers.dev/src/lib/build.js
```

Then read the spec docs against `src/`, in this order: `FRAMEWORK.md` for what the day is
supposed to be, `Protocol_App_Roadmap_v1_7.md` §"v1 scope" for the map, the session-rulings
files for anything ruled since. A row belongs in this file when a doc claims something the
code does not do, or the code does something no doc asked for.
