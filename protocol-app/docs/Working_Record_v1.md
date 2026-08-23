# Working Record — append-only

Started 2026-08-18. Filename version bumps only if the *format* changes; entries append forever. Home for the counters the canon requires that had no existing home (ruling record, Entry 1; apparatus map in ballot Block 6). Everything here is capture, not ceremony — one line each, at the moment it's true.

---

## 1 · Loop count — weekly (canon 5.1 / Q1)

**Loop definitions (ruled Aug 18):** Phase 1 — a real day of Kevin's protocol runs on the new build and survives round-trip. Phase 2 — a fresh user walks a door unassisted. Post-launch — a stranger installs and completes the core action.

Format: `week of YYYY-MM-DD — N loops — one line of context`

- week of 2026-08-17 — **0 loops** — honest baseline: the new build passed its tests Aug 18, but Kevin's real daily use hasn't switched to it yet (Phase 1 done-when not met). Zero is the starting truth, not a verdict.

## 2 · Correction log (canon 5.5 / 1.14)

Ten-second entries at the moment of friction: `date — what's wrong — where it lives`. No polishing; capture now, process later. This is also the intake channel for canon amendments (ruling record).

- 2026-08-21 — Aug-20 paste-ready ledger entry was never pasted; §3 sat empty while the line lived only in the rulings file — `Session_Rulings_2026-08-20_v2.md` → fixed below, annotated.
- 2026-08-21 — facilitation applied the packet's flag discipline without derived-vs-open triage; Kevin had to push back on re-blessing his own rulings — fix: triage rule added to roadmap v1.7 working practices.
- 2026-08-21 — read-first-chain gotcha line stale ("three files deep"; now four with `FRAMEWORK_v3.md`) — `Project_Gotchas_v1.md`.
- 2026-08-21 — v1.6 Phase 0 listed quiz OD-1 as open; it was ruled Aug 18 (PHQ-8, Map Edit Log §A.1) — closed in roadmap v1.7.
- 2026-08-21 — Map Edit Log D5 (contrast module, Aug 18) vs. FRAMEWORK "cold exposure not in v1" (Aug 19) never reconciled — flagged [undetermined] in v1.7 parking lot, Kevin's line at next touch.

- 2026-08-22 — `GAPS.md` is named as CC homework in three places but has never existed: not in the repo, not in git history (`git log -S "GAPS"`, all branches), not anywhere on the machine — the only GAPS-named files belong to other projects — `Protocol_App_Roadmap_v1_7.md` (Phase 2), `FRAMEWORK.md` (open item 4), this file (Aug-21 ledger entry). Kevin's call: locate it or strike the line.
- 2026-08-22 — water still counted in "glasses" on screen four months after the April brief and two rulings (K2) — `src/app/ui/viewToday.js` → fixed this session (ounces/ml, global unit setting, schema-2 conversion of old records).
- 2026-08-22 — K4 (missed item) was dropped rather than replaced when FRAMEWORK v3 superseded PLAN §3–5; found by the drop-check, ruled same day as R16 — `docs/PLAN_3-5_dropcheck.md`.
- 2026-08-22 — roadmap layer 1 records "39 tests green"; the suite is 50 — `Protocol_App_Roadmap_v1_7.md` layer 1.
- 2026-08-23 — **closes the Aug-22 `GAPS.md` entry above**: the file did not exist, so it was written rather than located — `docs/GAPS.md`, now the standing built-vs-specced register. Three ledger rows corrected by the same pass (39 / 45 / 94 tests recorded; 97 measured), and five items `HANDOFF.md` lists as built measured as partial (D20, D22, D12, D36, Q4/Q6).
- 2026-08-23 — commit `197da3e` (menu → area → session) dropped the Plans and Supply tabs from navigation without a replacement, leaving both screens unreachable, no way to create or switch off a protocol, and a live instruction on Today pointing at the unreachable Supply screen — `src/app/ui/app.js` (dead branches at 153, 158), `src/app/ui/viewToday.js:344` → `docs/GAPS.md` §2.1.

## 3 · Expectation → outcome ledger (canon 4.1)

Write the expectation line **before** a build or judgment session's work; append the outcome after. **Forward-only from Aug 18** — no backfilled expectations, because a backfilled expectation is fake pre-registration.

Format: `date — expected: … → actual: …`

- 2026-08-20 — expected: framework review closes most open design items, surfaces ≥2 unlogged roadmap conflicts, produces market-validated feature shortlist → actual: 4 collisions surfaced and reconciliation agreed; ~20 rulings logged across two rounds incl. PEM baseline-relative model (pattern-not-symptom-list, immediate≠delayed), vocabulary-as-open-census with introduced-on semantics, training-log progress foundations, focus-list data layer, streak shape (self-set floors, free rest, retroactive pause, computed-view architecture); 1 design line still open (pacing profile × too-hard arithmetic). *[Pasted 2026-08-21 from the Aug-20 rulings file; the expectation half was captured same-session Aug 20 — whether it was stated before the session's work began is unverified from the record, annotated here per this section's forward-only rule rather than presented as clean pre-registration.]*
- 2026-08-21 — expected (Claude's proposal at R1 session open, before any ruling; not separately ratified by Kevin): four collisions named/settled; all 8 disposition rows ruled; composer-unification call made explicitly; read-first chain ratified; roadmap v1.7 drafted same-session; PLAN.md diff + GAPS.md escape to CC homework → actual: R1 closed same-session, but not along the packet's path — formal collision-naming dropped as overcomplication after Kevin's pushback (triage: 6 rows derived from existing rulings, 2 genuinely open); one composer adopted (D16 amended); rating + limiting-factor model ruled (D42), which dissolved the pacing-arithmetic open item rather than answering it — a design gain the expectation didn't predict; D22 extended to training logs by default-adoption; v1.7 + FRAMEWORK v3 + this file drafted same-session; PLAN.md diff + GAPS.md to CC as expected; two unpredicted catches (OD-1 already ruled; D5/not-in-v1 seam) via the mining the packet had deferred.

## 4 · Runway check — monthly (canon 5.7)

One question, on a schedule, not when it forces itself: *is this work still net-positive against capacity and the simpler alternative?* Cadence: monthly [FEASIBILITY: interval underived; adjust freely]. First check due ~2026-09-18.

Format: `date — still net-positive? — one line why`

*(first entry due mid-September)*
