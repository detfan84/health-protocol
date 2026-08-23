# Roadmap v1.7 — Protocol App (working name TBD)

**Nervous-system-first health app: recognition → composed day → tracking → education**
v1 Aug 15 · v1.1–v1.2 Aug 17 · v1.3–v1.6 Aug 18 · **v1.7 Aug 21, 2026 — supersedes all in full**

**Cross-session rule:** decisions enter this file only after Kevin has ruled. Every open item is marked open; everything else was ruled before this was written.

*v1.7 delta (R1 reconciliation, Aug 21): absorbs the Aug 20 session rulings (R2–R15, vocabulary census, focus list, education additions) and the Aug 21 reconciliation dispositions. Decision 8 split (8a law / 8b feature) · 12 rewritten (in-app + .ics) · 16 amended (**one composer, two inputs** — Kevin, Aug 21) · 22 extended to training logs · 4 reaffirmed · 11 scoped · 15 extension listed · v1 scope rebuilt as the layered build map with the day-arc subsystem nested inside (R1's deliverable). New decisions 28–42; decision 42 dissolves the "pacing profile × too-hard arithmetic" open item. Quiz OD-1 discovered already ruled (PHQ-8, Map Edit Log §A.1, Aug 18) — closed here. This file absorbs and supersedes `Reconciliation_Packet_Draft_v0_1.md` and the content of `Session_Rulings_2026-08-20_v2.md` (that file remains as the session record). Companion spec, amended same-session: `FRAMEWORK_v3.md`. Provenance flags per canon 3.7: **[derived]** cites its source · **[FEASIBILITY-LIMITED]** awaits CC pricing · **[undetermined]** is a hole on purpose · items marked "strike on review" are Claude drafting inside a ruling, kept visible for Kevin to strike or keep.*

---

## The thesis

Two years of serious protocol work underdelivered because it pushed the gas with the brake on. The lesson wasn't "wrong supplements" — it was "wrong foundation," and more precisely: **counterforce**. Systems push on each other. A door you're working to close stays open when something unaddressed keeps shoving it. That is the app's founding insight, generalized.

This app is the system Kevin wishes he'd had: recognize what may be going on, get a starting protocol *composed* from the pieces that fit, have the app *compose each day* so nobody puzzles out what-when-how, track it without guilt, understand how the body's systems talk to each other, and turn your own records into something that helps you and your clinicians understand you.

Free. Local-only. Quiet. **A complete gift with a definition of done** — if v1 is the last version that ever ships, nobody is stranded.

**The signature pattern:** anything hard that would normally need a server gets done by the user's own AI through a published companion prompt and a published file format. The app never transmits; it exports, the user carries, their AI works, the app imports and validates.

---

## The scope guard (Kevin, Aug 16)

Every addition gets an honest cost estimate. But the v1 test is not "can this wait?" It is **"does v1 *without* this still test the product Kevin actually intends to build?"** If cutting it means launch feedback would be about a placeholder, it ships in v1. Deferral is not free — shipping a decoy and re-running the trial later is often the most expensive path.

---

## The five content laws (Kevin, Aug 16–17)

These govern every screen, card, module, and companion prompt. They are the app's voice.

1. **Counterforce, not checklist.** The pieces push on each other; some doors cannot close while another stays open. Skipping a piece isn't a lower score — it can be the reason the work you *are* doing won't hold.
2. **Teach everywhere, audit nowhere.** The *why* rides at the point of action. What the app never does is generate commentary from tracking data: no completion meters, no "3 of 4 foundations active," no "you haven't done X in nine days." **Teacher always, auditor never.** (What's banned is surveillance-speech, not truth. Decision 8a is this law's product embodiment.)
3. **Define the fair test up front.** Each module states in advance what a real trial looks like, so "I tried it and it didn't work" has an honest answer built beforehand — the test wasn't fair, or it was fair and underdelivered, routing to adjustment and get-evaluated prep, never to "try harder." An app that implies "if it failed, you failed" is unfalsifiable and, for this population, cruel.
4. **Teach conditions for health, never cures for conditions.** What a resilient system looks like and what feeds it — yes. "Treatment for X" — no. Named therapeutic approaches live in get-evaluated prep. One rule covers every future content decision.
5. **Epistemic status travels with the claim.** Every personal health claim carries **observed / hypothesized / clinician-confirmed**. Contrary evidence counts *against* a hypothesis instead of being absorbed into it. Quiz outputs say "worth exploring," never "you have X." Companion prompts instruct the user's AI to carry confidence tags and never promote a guess to a fact.

---

## Locked decisions

1. **Positioning:** recognition + composed day + tracking + education, nervous-system-first. The structure and the understanding, not the substances.
2. **Audience:** the beachhead — people stuck in fight-or-flight, chronically dysregulated, chronically ill. Usable by anyone; aimed at them.
3. **No brand-name supplement content anywhere.** Old-app data migration dropped; Kevin's history doesn't need to survive.
4. **Local-only.** No accounts, no servers, no analytics. "We literally cannot see your data." *(Reaffirmed Aug 21: nothing ruled Aug 19–21 requires a server. The server-vs-wrapper fork — background push + telemetry + audio reliability, one decision — stays parked until CC prices it.)*
5. **Free core, forever.** Nothing gates or unlocks it.
6. **Charge for servers, not software.** Paid tiers only ever attach to future connected layers with real per-user cost.
7. **Retired:** the $8 unlock, the $2 fallback.
8. **Split Aug 21 (per R13/R13a, Aug 20):**
   - **8a — The no-guilt law (untouched; lives under content law 2).** No shame, no surveillance commentary. One tap is the whole daily ask. Staleness is information. Old app's streaks/badges/encouragement lines/push do not carry over.
   - **8b — Opt-in achievement layer, off by default.** Self-set floor and ceiling within a self-set window (default weekly) — hitting your own floor keeps the streak; rest arrangement free within the window; **retroactive pause**, honor system, the app never judges — governing copy in Kevin's voice: *match the app to your character — it's not judging; using it is for your benefit.* Non-breakable milestones (cumulative counts, PRs) ride alongside. **Streaks and coverage are computed views, never stored counters** — derived live from day records + pause annotations (settings store per decision 19); records never rewritten; retroactivity is just recomputation. Catalog details at the layer's own design session.
9. **Faith layer:** opt-in, note-first. Never coercive, never silent.
10. **Update policy:** web updates replace code, never data. Connected features off by default. Data always exportable. In-app "what's new" is the channel.
11. **Single-file offline edition.** Whole app as one downloadable HTML file. *(Scoped Aug 21: single-file = app code + essential assets; per-asset-class strategy — embed / reduced set / hosted-optional — decided when CC prices it, sized together with the audio spike [FEASIBILITY-LIMITED]. User data lives in IndexedDB and is unaffected either way.)*
12. **Reminders (rewritten Aug 21 per F3 + R3).** v1 delivery is **in-app**: open-triggered and while-open; types (snack nudges, posture check, wind-down), frequency, quiet hours. **Opt-in is the hard rule** — nothing pings by default; reminders exist only where the person asked; every interval value is a placeholder until real trial use. Morning capacity check per decision 32. **.ics calendar export** covers outside-the-app. Background push stays fast-follow behind the decision-4 fork.
13. **Self-service support by design.** Good help + FAQ; no promise of personal support.
14. **Clean rebuild** (Aug 16). Carried: time-aware block math, phase auto-advance, body-work jsdom assertions, curated public-domain photo sets, spacing/binder education.
15. **Schema ratified** (Aug 16): permanent IDs, names as labels; plan/record separation; per-record `updatedAt` refereeing merge; one schema version with a tested migration ladder. Phases optional. Multiple active protocols — Today interleaves all active protocols by time of day. *(Extension step, Aug 21 — one migration-ladder step, placement per decision 19; list [derived — the stores the Aug 19–21 rulings created; strike/adjust on review]: day templates · coverage ledger (muscle × role × day/week) · findings + decaying weights · per-item weekly targets · context profiles · ratings · activity log · training-log fields on check records · pause annotations (settings store) · quiz-seed provenance. Streaks/coverage stored nowhere — computed views per 8b. Plan/record separation untouched.)*
16. **COMPOSITION, NOT CLASSIFICATION — one composer, two inputs (Kevin, Aug 17; amended Kevin, Aug 21).** The quiz does not sort a person into a lane and hand them a template. **One runtime composer — the day-arc engine — deals every day.** Quiz output = module toggles + seeded findings/weights + dial/safety settings: a personalized **preset over the one shared catalog**, the same mechanism as templates (K5). Modules are catalog subsets plus their education, not separate engines. The composed-start reveal keeps per-module "why you're seeing this, in the person's own words" — provenance carries the whys. **No labels, ever. The quiz never gates anything**; the full library stays browsable and addable forever. **Question-earning rule** stands: a question belongs in the bank only if some answer changes the output. **Build order** stands: modules first, then questions derived from what modules need to know. Honest residue, named: the v1 composer does not read anchored protocol load when filling its budget, so a heavy scheduled morning plus a dealt session can stack; if trial use surfaces that pain, the fix is one more composer input — never a second engine.
17. **Licensing (Kevin, Aug 17 — closed).** Information-need drives the questions; borrow free instruments where they cover the need; bridge questions where nothing free does. No unresolved-permission instrument may block launch.
18. **Framework: vanilla with a tripwire (Kevin, Aug 18).** All logic in framework-free JS modules; screens a thin layer on top. Tripwire: the day a screen needs many parts continuously live-updating each other, revisit before building that screen. Adoption would replace screen files only.
19. **Round-trip-safe placement rule (Aug 18).** The import validator strips unknown fields from protocols by design — so anything persisted beyond the ratified protocol shape lives in the **settings store**, which passes through imports untouched. Standing rule for all future state.
20. **Check-off snapshots (Kevin, Aug 18).** Each check-off records, at tap time, the item's name and dose as configured — plus units actually taken where supply-dose config exists. Records outlive plan edits.
21. **Past days: viewable and correctable (Kevin, Aug 18).** Viewer over existing day records; arrows + typed date; corrections use Today's one-tap tools. *Plan edits never rewrite records; the person amending their own record is making it more true.*
22. **Supply dose model + auto-decrement (Kevin, Aug 18).** Per item, optional config: units per dose, optionally unit strength and intended dose. Check-off silently decrements; recorded units visible and editable after the tap; un-checking restores exactly. Blank = not tracking. Every field optional. Run-out gaps are data, never nags. *(Extended Aug 21 — Claude recommendation adopted: the snapshot machinery generalizes to movement — per-check **sets / reps / load / duration** recorded at tap time, every field optional; **training logs are decision-20/22 records, not a second record type.** Display rules per decision 34.)*
23. **Time display (Kevin, Aug 18).** Device convention by default; in-app override; stored format stays `HH:MM`.
24. **Fail loudly — standing engineering policy (Kevin, Aug 18; closed Aug 18 v0.2 build).** No silent failure modes anywhere. **Ruling A — three-state data model:** absence means "never logged" and nothing else; explicit zero only ever typed or confirmed; "not configured" answered by plan lookup; any code path collapsing absent/empty/null/zero is a bug of this law's class. **Ruling B — failed writes surface:** confirm-then-paint; loud persistent announcer with real Retry + Copy; localStorage breadcrumb at next launch; never a fabricated record; multi-store mutations in one transaction.
25. **Escalation contract — architecture preserved on purpose (Kevin, Aug 18).** The quiz is a deterministic, pre-approved decision tree — no LLM at runtime. The only LLM anywhere is the user's own AI, outside the app, held at the validator boundary. Any future feature putting a model inside the runtime loop reopens this decision explicitly.
26. **Doctor summary carries denominators (Kevin, Aug 18).** Every included section states its denominator — "N of M days logged; these items untracked." Export-only truth; in-app ambient surfaces stay clean.
27. **Android co-equal (Kevin, Aug 18).** Nothing platform-specific; persistent-storage request in ship hygiene; backups remain the primary guarantee.
28. **PEM: education + self-designation, never screening-as-diagnosis (Kevin, Aug 20 — R2/R2a).** The app does not diagnose or give PEM advice. Clear is/is-not definitions; the person self-selects a **pacing profile** that sets frequency/intensity routing defaults; profile copy: "a pattern, not a diagnosis; worth bringing to a clinician." Fence instruments instead of verdicts: 60-second floor as the unsure-day tiebreaker; 48-hour look-back + activity log making delayed patterns visible. Education copy built on five relational lines (baseline is the reference line · the lag · departure and additions · duration + rest response · **immediate ≠ delayed** — orthostatic symptoms that ease on sitting are real but not PEM), with **both** mischaracterization directions named symmetrically: over-attribution (envelope shrinks from fear) and under-attribution (push-crash cycle). Sequencing: baseline-building precedes the deep PEM card. [evidence-grade gate before ship]
29. **Community accommodations ship behind their profile or toggle (Kevin, Aug 20 — R4).** Never forced on general users; never withheld from the community they serve.
30. **Sleep position + setup (Kevin, Aug 20 — R5).** Mixed/unknown option added, routing to taught self-detection. Sleep setup guidance joins the evening block family (knee support for back sleepers with anterior tilt/hyperextension; side-sleeping chest-collapse counters); positioning aids join the equipment inventory.
31. **Guided playback ladder (Kevin, Aug 20 — R6).** Learning (full talk-through) → familiar (next-item + breath tempo) → chime-only → off (own music). Hard requirement: works screen-off/background, battery-friendly. [FEASIBILITY-LIMITED — CC spike: backgrounded web timers throttle, esp. iOS; candidate = session composed as one continuous audio track (cue clips + timed silence) with media controls. Brittleness = evidence in the decision-4 fork.]
32. **Morning capacity check (Kevin, Aug 20 — R7).** Opt-in; **offers, never dictates**; default off outside the pacing profile. Output = today's options (standard / lighter / floor-only), one tap, full day always visible, never auto-shrinks. Teaching: morning feelings are weak evidence; the floor version is the test.
33. **Activity log (Kevin, Aug 20 — R8).** One-line, date-attached non-app exertion, optional intensity tag. Feeds 48-hour look-back, user-opened trends, doctor-summary denominators. No app commentary (law 2).
34. **Progress map + training-log foundations (Kevin, Aug 20 — R9/R9a).** Coverage, findings easing over time, measured self-test deltas, tap-through to history. **Percentages only where a real measure backs them.** Teacher framing (why-today / where-headed / what-changed), never compliance commentary. Training logs are real measures; before/after displays ("5 lb × 5 → 45 lb × 20") derive honestly from them. **Band caveat:** progress compares within the person's own labeled band on the same exercise; raw before/after across implements, no cross-implement percentages.
35. **Progress photos + silhouette overlay (Kevin, Aug 20 — R10/R10a).** Opt-in, local-only, never prompted by default. Guided capture with ghost overlay for comparable 3/6/12-month sets; sharing only by the person exporting. Generic-outline ghost ships v1; **segmentation + pose landmarks** anchoring muscle regions onto the person's own body = exploratory fast-follow, on-device models, local-only compatible. [FEASIBILITY-LIMITED — CC spike: library choice, model size, old-phone perf; graceful fallback to generic figure.] Photo-melded heat-map view: exploratory tier.
36. **Measured self-tests confirmed (Kevin, Aug 20 — R11).** Knee-to-wall, forward fold, 2–4-week cadence, sparklines; re-test deltas are findings and goal-ladder evidence.
37. **Reverse referral lookup + verification mini-tests (Kevin, Aug 20 — R12).** Exploratory tier. "Tap where it hurts → candidate sources," each point carrying, where safely self-administrable, a check step. Careful-field gating applies fully. Grows point-by-point.
38. **Image QA protocol (Kevin, Aug 20 — R14).** Every shipped visual: image + written how-to → Kevin performs it → approve or reject with one-line reason → rejects queue for reshoot/regeneration. QA certifies image-matches-instructions; hypermobile-variant safety carried by Careful text + community feedback.
39. **Joint-security content block (Kevin, Aug 20 — R15).** Recognize (slip/clunk/give-way vs. harmless cracking) / respond (never force range; recurrent instability → route-to-clinician) / prevent (active support when passive support is lax: stack, lats, scap timing, cuff). Kevin's posture→lats→shoulder chain becomes a connection card. Law 4 framing. [evidence-grade gate]
40. **Muscle vocabulary: a census, not a cap (Kevin, Aug 20).** The earning rule is the permanent object; the count (~44 muscles + 3 fascia targets as of Aug 20) is a snapshot. **Vocabulary is data, not code** — adding a muscle is a file edit, never a migration. **Each entry carries an introduced-on date** — coverage math treats pre-introduction time as *never collected*, not neglect (three-state law applied to the vocabulary). Ledger granularity ≠ tender-point-map granularity. Provisional flags (tibialis posterior; jaw lumping; rhomboid/mid-trap lumping) resolve during seed-catalog listing.
41. **Focus list (Kevin, Aug 20).** A filterable ranked list beside the graphic map: current focus areas, each with a one-line why and its source ("you reported it" / "quiz seed" / "your re-test moved"). The composer's weight table surfaced as teaching — pull-based, law-2 clean. Displayed length is a display choice, never a cap. Rows link into connection-chain education.
42. **Post-item rating + limiting-factor attribution (Kevin, Aug 21 — supersedes the two-tap "too hard" / "felt weak" model; dissolves the pacing-arithmetic open item).** Check-off alone is always complete — one tap stays the whole ask. Optional difficulty rating 1–5; a 4–5 asks **one follow-up** naming the limiting factor:
    - ***muscle gave out*** → a **finding**: that muscle's weight goes up; paired strengthening rides along per the pairing law.
    - ***ran out of steam*** → a **system limit**: timestamps the exertion for trends and the 48-hour look-back (the lag-spotting instrument decision 28 teaches); **no muscle arithmetic**.
    - ***pain or joint*** → routes to the law-10 stop-and-evaluate card; **no arithmetic**. *(This chip: Claude addition inside the ruled shape, on safety grounds — the one bad misroute is coding pain as "weak muscle, load it more." Strike to remove.)*
    Skipped follow-up: recorded without arithmetic; the app may ask once more when the item next comes up. *Hot spot* and *eased up* taps stand unchanged. **Tap arithmetic is uniform for everyone** — the pacing profile governs dial defaults and copy (decision 28), never tap math. Known loss from the merge: "wobbly but easy" has no tap; returns later as data, not code, if real use asks. **Not-helpful thumbs** folds into the same optional sheet, off the card face — difficulty and helpfulness stay separate signals (easy-and-useless exists; deals-less/sibling-promotion and the opt-in launch ratings channel need it). *(Fold-not-drop: Claude recommendation adopted by default — strike to drop ratings from v1 entirely.)*

---

## The module library (v1)

**Foundation — default-in for everyone, each removable with a tap:** nervous-system downregulation + breath · fascia release + reconnection · movement & strength rebuild · gut & food.
**Conditional — quiz-suggested or self-added:** orthostatic/electrolyte support · sleep & airway awareness · get-evaluated prep.
**Mental/emotional is not a separate module** — woven through foundation, with both/and routing when signals run high: professional care *alongside* the body work, never instead of it.

Under decision 16 as amended, a module = a catalog subset + its education + the seeds it contributes. **Sub-modules:** fascia and movement each carry a self-assessment guide, then regional sub-modules (feet/ankles · calves · hamstrings · hips · pelvic floor + deep core/psoas · lower back · spine stacking · shoulders). Common-pattern frameworks (pronation distortion; lower crossed) presented as "look here first," never verdicts — research task queued. **Breath sub-module addition (Map Edit Log D4, Aug 18):** breath-hold tolerance (BOLT) with its shipped cautions (seated/lying for orthostatic-symptomatic users; stop at first urge; symptom ramp = stop); mechanism legitimate, thresholds labeled practitioner convention.

**Movement activation focus (Kevin, Aug 18 — seed doc captured).** Bring dormant muscles back online, then deliberately strengthen the brain-to-muscle pathway. Soreness as locator; everyday positions as training reps. Movement prompts carry an activation-focus cue alongside the why; copy written under law 5. Planning block remains a scheduled judgment session.

**PEM gate.** Cannot remove movement from foundation; it sets movement's **starting dial** (decision 28 governs the education around it).

---

## v1 scope — the definition of done (the map, per R1)

Day-arc subsystem is **nested inside** v1 scope, not beside it. Format per node: purpose — build stage. Stages: ✅ built · **Q**n = build-queue item · **P2**/**P3** = phase · **spec** = specced, unstaged. Staging calls below marked *(staging: Claude rec — adjust on review)* where no explicit ruling exists.

### Layer 0 — Law (governs every node below)
Five content laws ✅ · fail-loudly + three-state model (D24) ✅ v0.2 · placement rule (D19) ✅ · epistemic-status law (law 5) ✅, correction sweep is its live enforcement.

### Layer 1 — Data core
- schema / core / protocolFile / db — ratified shapes, merge referee, forgiving validator, migration ladder — ✅ (39 tests green, v0.2).
- **Schema extension step** (D15 list) — **spec**; first P2 build item *(staging: Claude rec)*.

### Layer 2 — Day engine (the day-arc subsystem; full spec = FRAMEWORK v3)
- **Composer — one engine, two inputs (D16)** — arithmetic, not AI: day templates per dial, weighted rotation, swap groups, the eleven laws as constraints; reads ledger + findings + targets + context + quiz/template presets; writes nothing but the dealt day — **spec**; P2 lead *(staging: Claude rec)*.
- **Coverage ledger** (muscle × role × day/week; vocabulary per D40) — **spec** [derived — R9 + census].
- **Findings + weights** — hot spot · eased up · rating + limiting-factor follow-up (D42); decaying weights — **spec**.
- **Dial + per-item weekly targets (K1)** — **spec**.
- **Day templates + anchors** (six-part arc, floors, ritual attachment) — **spec**.
- **Catalog-as-data + taxonomy** (K3 five fields, roles, contexts, pairs, swap groups; muscle vocabulary as data) — **spec**.
- **Content tiers** (established / exploratory) — **spec**.

### Layer 3 — Daily surfaces
- **Today** — ✅ (pre-day-arc); re-render over composer output is the first P2 seam *(staging: Claude rec)*.
- Six trackers ✅ · Editor ✅ · Past-days viewer + snapshots (D20/21) **Q2** · Supply/auto-decrement (D22) **Q3** · Time display (D23) **Q4** · Persistent storage (D27) **Q5** · Phase auto-advance (D14) **Q6**.
- **Activity log (D33)** — **spec** · **Morning capacity check (D32)** — **spec** · **Focus list (D41)** — **spec** · **Progress map + training logs (D34)** — **spec** · **Progress photos + overlay (D35)** — **spec** [FEASIBILITY-LIMITED spike] · **Guided playback (D31)** — **spec** [FEASIBILITY-LIMITED spike] · **Measured self-tests (D36)** — **spec**.

### Layer 4 — Three doors (P2)
- **Recognition quiz** — composes the starting preset (D16 as amended); deterministic tree (D25); spec = Recognition Quiz Roadmap v1.2 + Connection map. **Map status flag: review §0–2 done (Edit Log v2); §3–9 + epistemic audit + module re-staging + map v1.1 outstanding — Kevin critical path.** PEM gate copy per D28.
- **Module library browser** — self-add forever; quiz never gates — P2.
- **Deep-dive excavation** — questionnaire + companion prompt + import at the validator boundary (D25) — P2.

### Layer 5 — Records out (P2)
- **Doctor summary + denominators (D26)** — include-which checkboxes; feeds from activity log, labs, trackers, training logs.
- **Artifact family** — ER card · caregiver explainer · accommodation summary — understand-and-be-understood frame.
- **Labs module** — catalog + aliases, no shipped ranges, dual-entry validation, ranges education.
- **Export-for-AI + companion prompts** (protocol / excavation / lab) — falsifiability guard per QD-3.
- **Answer-set export (Edit Log E3)** — one generic "export answers as a readable anonymous summary" capability; the quiz's doctor-visit summary and any future surveys share it; anonymity by design, not by AI.

### Layer 6 — Education (P2 unless gated)
Connection cards + awareness curriculum (Kevin-writes track) · Toolkit 33-card port · **PEM education (D28)** [evidence gate] · **Joint-security block (D39)** [evidence gate] · Sleep setup guidance (D30) · strengths-inversion card + backlog (dictation-draft track).

### Layer 7 — Profile & community accommodations (D29 governs)
Templates (K5) — slate **pending ratification** · Pacing profile (D28) · Faith layer (shape confirm + reflections count open) · Achievements layer (8b; catalog at its own session) · Reverse referral lookup (D37).

### Cross-cutting
Image QA (D38) ✅ process · Evidence-review queue (PEM copy · joint security; axilla item closed into the lymphatic doc) · Regulatory/claims gate — **P3, its own sourced session before ship hygiene closes**.

**Ship hygiene:** design system ✅, calm palette ✅, reduced-motion ✅, accessibility ✅, persistent-storage request, disclaimer/terms/privacy, domain, About/story, landing, help + FAQ, for-clinicians page + QR, feedback mailto (Edit Log E1).

**Provenance note (silent-drop check closed Aug 21):** everything in v1.6 scope and everything ruled Aug 18–21 is placed above; nothing was dropped. One seam flagged rather than silently resolved — see parking lot †.

**v1 is done when** all of the above ships, the single-file edition downloads, legal + story + landing are live, and the soft launch is posted. Zero standing obligations after — by design.

---

## Build phases

### Phase 0 — decisions
Closed: composition model · licensing · content laws · framework ruling · canon ratification · fail-loudly docs · **quiz OD-1 (PHQ-8 — ruled Aug 18, Map Edit Log §A.1; v1.6 listed it open in error)** · R1 reconciliation (Aug 21).
Open: name the app · faith-layer note-first confirm + reflections count · **Kevin: map review §3–9 + epistemic audit → Connection map v1.1 (critical path)** · template slate ratification (K5) · vocabulary provisional flags (during seed listing) · achievement catalog (its own session) · **Kevin: markup/commit of FRAMEWORK v3** (largely ceremonial post-rulings; still the formal gate).

### Phase 1 — foundation
✅ Data layer + editor + trackers + Today + design system + fail-loudly (v0.2, 39 tests). Next: **build queue Q2–Q6** (past-days/snapshots → supply → time display → persistent storage → phase auto-advance). **Done when:** Kevin's real daily use runs entirely on the new build and the round-trip loses nothing.

### Phase 2 — day engine, doors, records out, education
Claude builds: schema extension → composer + ledger + findings (D42 model) → Today re-render → daily surfaces (D31–D36, D41) → doors → records out → toolkit port → faith plumbing. CC homework rides here: PLAN.md §03–05 diff (drop-check) · GAPS.md read-in · server-vs-wrapper pricing · audio spike (D31) · segmentation spike (D35) · single-file size budget (D11).
Kevin writes: map review + quiz copy, deep-dive questionnaire, education content (Claude drafts from dictations; never a blank page), faith reflections, About/story.
**Done when:** a brand-new user can install, walk any door, run a full composed day, log a check-in, enter a lab result, and print a doctor summary — with no explanation from Kevin.

### Phase 3 — ship
Polish · single-file edition · install flow · legal · domain · landing + story · help/FAQ · what's-new · for-clinicians page. **Money gate and regulatory/claims gate sit here.** Soft launch: story-led, one or two communities.

### Working practices
Model-match (judgment on the strongest model; mechanical on Sonnet). **Read-first chain (updated Aug 21, four deep):** `PRINCIPLES-PORTABLE-CORE_2026-08-18.md` → `Canon_Ruling_Record_2026-08-18.md` → **this roadmap's opener** → **`FRAMEWORK_v3.md`**. Session-rulings files feed the roadmap and drop out of the chain once absorbed. One workstream per session. Documents updated in the same session as the decisions they record. **Triage rule (Aug 21, from the correction log):** facilitation presents only genuinely open calls for ruling; everything derivable enters drafts as [derived] with its cite, struck on review — a fail-loud system must not make Kevin bless his own rulings twice.

---

## Money — decision gate at Phase 3
Leading candidate: free + donations (Ko-fi 0% / Lemon Squeezy PWYW); cosmetic supporter touches; comp-on-request. Ruled out: $2, $8, gating the core. Vercel Hobby is non-commercial — move to Cloudflare Pages when donations attach.

## Faith layer spec
First run opens with "A note from Kevin" — story first, faith named honestly inside it, last line the invitation; one tap either way; skipping means off; zero lingering nudges; full story on About. Content when on: short reflections tied to toolkit themes; Scripture surfacing quietly; optional evening prayer line. Guardrails: lament, presence, rest — never healing-as-faithfulness formulas; faith content never enters exports unless deliberately included; *a bounce at the door is a flinch, not a verdict.* Open: confirm note-first shape; set reflections count.

## Education content backlog (Kevin's voice — draft from dictations)
Counterforce teaching · chewing · movement as motility's ignition (the dog in the backyard) · the capacity loop, both halves, safety gate in the same breath · activation focus + soreness as locator + everyday positions · gut conditions (not cures) · "I thought I was just made wrong" (About candidate) · the Bethesda question (faith layer) · **strengths-vs-weaknesses inversion** (Kevin, Aug 20): in personal development you lean into strengths; in the body it's reversed — shore up the weakest links so the whole system can get strong; doubles as the answer to "why all this glute work."

## Parking lot (honest prerequisites, not scope-dodging)
Community · hosted AI tier · push notifications (behind the D4 fork) · telemetry backend (same fork, one decision) · Google Drive sync · practitioner version · research contribution pathway (requires a real IRB'd study receiving; the app is an instrument, not a data controller) · licensed instruments pending permission · wearables · anything social · injury-rehab templates (staged rehab belongs to clinicians, and saying so is part of what makes the rest trustworthy) · in-app survey layer (Edit Log E2; surveys ship as data files when revisited) · "wobbly but easy" tap (D42 note) · cold exposure and adjacent modalities †.

† **Seam, flagged rather than silently resolved [undetermined — Kevin's line at next touch]:** Map Edit Log D5 (Aug 18) created a floor-level vascular-conditioning/contrast module (bowls + shower finish, cautions shipped); FRAMEWORK (Aug 19) lists "cold exposure and adjacent modalities" as not-in-v1. The two were never reconciled. Recommendation: park D5 to v1.1 — later doc governs and its own evidence labels are thin ("plausible mechanism, modest evidence") — with the BOLT breath module (Edit Log D4) unaffected and in v1. Strike the parking to ship D5 instead.

## Honest risk notes
Distribution is the constraint, not the product · mobile storage eviction (persistence request + backups in v1) · single-maintainer honesty (nothing strands users) · support burden (FAQ posture) · **Kevin's authoring load — four writing workstreams, the likeliest slip; mitigation: Claude drafts from dictations, Kevin edits, one at a time** · licensing tail contained · unfalsifiability (laws 3 + 5 are the containment) · **new, Aug 21: day-engine build depth — the composer + ledger + findings stack is the largest single build since foundation; the schema-extension step and the D42 model are specced to keep it mechanical, but the P2 estimate is deliberately blank until CC prices it [FEASIBILITY-LIMITED].**
