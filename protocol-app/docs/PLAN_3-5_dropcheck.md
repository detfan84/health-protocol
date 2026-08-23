# Drop-check: PLAN.md §3–5 vs FRAMEWORK v3 + Roadmap v1.7

*CC homework, assigned in FRAMEWORK v3 ("this document replaces PLAN.md sections 03–05 — diff
03–05 in-repo to confirm nothing was dropped rather than replaced"). Run 22 Aug 2026 against
`PLAN.md` (19 Aug, in repo), `FRAMEWORK.md` (v3), `docs/Protocol_App_Roadmap_v1_7.md`.*

## Replaced, with a successor — no action

| PLAN | Successor |
|---|---|
| §3.1 opens knowing time / phase / week | Day arc + composer reading the living state; phase auto-advance is roadmap Q6 (unbuilt) |
| §3.2 due-now, later collapsed, missed visible | Day arc's six parts + Today re-render, "first P2 seam" |
| §3.3 know why | Content law 2 (teach at the point of action), provenance whys, connection cards |
| §3.4 one tap; log the actual sets | D20 check-off snapshots + D22 extension (sets/reps/load/duration at tap time) |
| §4.1 cadence | K1 — user-set weekly targets per item; "PLAN's cadence and tracking types survive underneath as vocabulary" |
| §4.2 tracking types check/sets/duration | D22 extension; K2 global unit toggle, imperial default |
| §4.3 structured instruction fields | K3 — five structured fields (Tool/Release/Load/Notice/Careful), provisional |
| §5 the screen | Composer output + Today re-render (P2 lead) |

## Dropped, not replaced — three items

1. **K4 has no successor anywhere.** PLAN §5 asked what happens to an item missed earlier in the
   day (stay on screen / disappear / "missed today" group). FRAMEWORK's decision record carries
   K1, K2, K3, K5 and F1–F4 — no K4 — and roadmap v1.7 Phase 0's open list does not carry it
   either. Law 5 (self-healing, not debt) answers *across* days; this is a *within*-day screen
   question, and the Today re-render is the first P2 build. Needs a ruling before that seam.

2. **The weekly count "2 of 3" collides with content law 2 / D8a.** PLAN §3.5 and §4.1 both promise
   the count on screen; law 2 bans completion meters by name. K1 settles the number as *composer
   input* but nothing rules whether it is ever *displayed*. Three consistent readings exist
   (input-only · pull-based like the focus list · shown on the item because it is the person's own
   target, not app commentary). Unruled.

3. **Water is still counted in glasses.** PLAN §2 named it as the regression from the April brief;
   K2 ruled the global unit toggle with imperial default. Code is unchanged: `src/app/trackerOps.js`
   (`bumpWater`, "a simple tally of glasses") and `src/app/ui/viewToday.js` (`glasses today`).
   Roadmap layer 3 records "Six trackers ✅", which hides this. Not §3–5 strictly; listed because
   it is the last live row of PLAN §2's failure table.

## Notes

- Roadmap layer 1 says "39 tests green, v0.2"; the suite is now **45 green** (`npm test`, 22 Aug).
- **GAPS.md is not in the repo and not on this machine** — the other half of the homework
  ("GAPS.md continues in parallel — CC homework: read it in") cannot be started until it lands.
