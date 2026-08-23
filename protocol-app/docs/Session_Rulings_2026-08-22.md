# Session rulings — 22 Aug 2026

*Feeds `Protocol_App_Roadmap_v1_7.md` and drops out of the read-first chain once absorbed
(working practice, roadmap v1.7). Kevin ruled these in session; nothing here is derived.*

---

## R16 — Missed items, reminders, and pause. **Answers K4.**

K4 ("what happens to an item you missed earlier today?") had no successor in FRAMEWORK v3 or
roadmap v1.7 — surfaced by the PLAN §3–5 drop-check. Kevin's ruling:

- **A reminder is helpful, and it is opt-out.** A missed item may prompt; anyone who does not
  want that turns it off. (Sits inside D12: v1 delivery is in-app, opt-in is the hard rule for
  *new* reminder types; this one is the missed-item case, and the person can switch it off.)
- **Pause is a first-class item state.** A person can pause an item and restart it whenever they
  want, and a paused item does not remind.
- **Running out is a reason the app already knows.** Supply counts (D22) tell the app when
  somebody is out of something — so it stops reminding for what they cannot do, rather than
  nagging about a bottle that is empty. This is D22's "run-out gaps are data, never nags", made
  operational: the data changes what the app *asks of you*, and still says nothing about you.
- **Remove and restart** stays available at any time; records outlive plan edits (D21).

Build consequence: pause/out-of-stock is a state on Today, not just an editor setting, and the
missed group is where it surfaces.

## R17 — The weekly count is opt-in/opt-out. **Settles the PLAN §3.5 × content-law-2 seam.**

PLAN promised "2 of 3 this week" on screen; content law 2 bans completion meters. Kevin's line:
**neither answer is global — the person chooses.** Off by default stays the law's posture; on, it
is the person's own target reflected back, which some people find motivating. Consistent with D8b
(opt-in achievement layer). The number remains composer input regardless of display.

## R18 — Water in ounces, with the global unit toggle (K2 implemented).

Ruled in April, ruled again as K2, still shipping as "glasses". Built this session; see the
correction-log entry below.

---

## Correction-log entries raised this session (mirrored into `Working_Record_v1.md` §2)

- **GAPS.md does not exist.** It is named as CC homework in roadmap v1.7 (Phase 2) and FRAMEWORK
  v3 (open item 4), and in the Working Record's Aug-21 expectation line — but there is no such
  file in the repo, in git history (`git log -S`, all branches), or anywhere on Kevin's machine;
  the only GAPS-named files belong to the Trading System and "He's Not Done" projects. It appears
  to be an artifact that entered the Aug-21 R1 homework list and was never written. Either it
  lives somewhere only Kevin can see (a claude.ai Project), or the homework line should be struck.
- **Roadmap layer 1 says "39 tests green"; the suite is 50 green** as of this session.

---

# Session rulings — 23 Aug 2026

## R19 — Push: calendar for now, server parked as a maybe (Kevin).

The fork was priced (memo, Aug 22): no web app anywhere can schedule a
notification on the device — Notification Triggers is abandoned and Web Push
has no deliver-at — so a closed-app notification needs either a server or a
native wrapper. The wrapper is disqualified on three counts (broken Android
delivery, App Review 5.1.1(ix) against an individual developer for a health
app, and a membership whose lapse deletes the product). Kevin's line:
**calendar export is v1; the server stays a maybe, not a no.** Decision 4 is
therefore untouched for now — "we cannot see your data" remains literally
true — and the sentence that would replace it is written and waiting in the
memo if the server is ever built.

*Standing note recorded with this ruling:* no closed-app reminder on any
delivery path — calendar, native, or push — can know what you have already
done today. Reminders are fixed time-of-day cues by nature. D22's "stop
nagging about an empty bottle" and R16's missed-item prompt live inside the
app, not in the notification.

## R20 — Reminder cadence varies by kind (Kevin).

"The cadence should be variable depending on the type of notification it is."
A part-of-the-day reminder fires once at a time that means something; a
movement snack or posture check repeats through a window and does not care
about the exact minute. Implemented as kinds carrying a starting shape
(interval + window), with the shape then owned by the person — a kind is a
label, never behaviour of its own. Quiet hours suppress repeating nudges only;
a time typed by hand is left alone.

## R21 — The hard-coded movement prompts are removed (Kevin, Aug 22, confirmed).

"Kill the hardcoded movement prompts, those will give way for the more
intentional movement programs." Removed; ids retired, never reused; existing
check-offs stay in the day records they were written into. **Open:** nothing
fills the gap until real movement content ships — Kevin to say whether Today
should carry anything in the meantime.

## R22 — The app is called **Shoes of Peace** (Kevin).

"For now" — recorded as current, not final. The Cloudflare worker already
carried the name; it now appears in the app, the manifest, the home-screen
icon and every calendar alert. Closes the "name the app" item in roadmap
Phase 0, provisionally.

## R23 — Today carries nothing until the composer fills it (Kevin, closing the R21 tail).

R21 killed the four hard-coded movement prompts and left an open question: does Today carry
anything in the meantime? Kevin's answer: **nothing now, and the composer properly.** No
interim shim — a "deal me something" button would be a small composer, and building one twice
is the cost that ruling exists to avoid. Empty is honest: the four anchors are always there,
and the seeded areas are substantial. R21's open item closes here.

## R24 — In-app nudges get built now, narrowly (Kevin).

D12 names in-app delivery — open-triggered and while-open — as v1's actual reminder mechanism,
and it has never been built: `src/lib/reminders.js` has one consumer, the settings screen. R16's
missed-item prompt has nowhere to live because R19 established that no closed-app notification
on any delivery path can know what you have already done today. Ruled: build one in-app surface
that reads the schedule that already exists. **Narrow on purpose** — the composer changes what
the surface is told to say, not the surface.

## R25 — Pain is the medium of this work. Teach once, sequence the on-ramp, never warn per item (Kevin).

*The substantive ruling of this session, and a content-law-level position. Kevin's reasoning is
carried at length because future sessions will need it, not just the conclusion.*

- **Most of this work is painful, and so far all of it has been good work.** Rolling out the
  armpit and the back of the shoulder is intense; hitting a nerve that runs the length of the arm
  is part of it. What it does is wake up what has been asleep.
- **For this app's beachhead, pain is not the exception — it is the daily baseline.** The EDS/HSD
  camp lives there already. Kevin: *"when your daily life has sucked for so many years... if
  you're telling me there's a chance, then it's probably worth trying."*
- **So the honest pitch is not "this will be gentle."** It is: this is going to suck, here is what
  it does, here is why it is worth it — easier breathing, the weight of the head coming off the
  neck, joint pain slowly dissipating, the musculoskeletal system coming back into alignment,
  feeling more free. Kevin believes people buy in when you say that straight.
- **The app does not adjudicate good pain versus bad pain in the moment.** *"I don't want to be
  dictating in the moment what they should and shouldn't be doing for their own best interest."*
  Nobody can call that for someone else's body. Learning to read those signals **is** the skill the
  app teaches — it is the awareness curriculum, not a safety interlock.
- **Warning fatigue is the named failure mode.** An app that says be-careful before every item gets
  ignored before every item: *"it's just gonna be warning, warning, warning all the time"* — and
  then nobody does anything, which is its own harm.
- **What he will give is fair warning, once and properly:** this is somewhat dangerous, here is
  what it looks like, you need to pay attention to what your body is telling you and understand the
  consequences of your actions.
- **Safety by sequencing, not by warning.** The releases a beginner is walked through first are the
  ones that do not risk a joint leaving its socket — front of the hip, glutes and hips. The genuinely
  hazardous case, from Kevin's own practice: a muscle locked for years finally lets go, and you are
  managing the tension between letting it relax and letting the joint fall out of position. That is
  real, it is not for week one, and **content ordering** is what handles it — not a dialog.

**Build consequences** *[derived — Claude's reading of the ruling; strike any line to reverse it]:*

1. **The D42 "pain or joint" chip is struck as written.** It presumed pain was exceptional. Under
   this ruling it is the normal case, so a chip routing pain to a stop-and-evaluate card would fire
   on ordinary sessions and manufacture exactly the fatigue named above.
2. **Its narrower successor is a joint signal, not a pain signal** — *it gave way / it felt
   unstable*. That is an event report, not a judgment about how much something hurt, and it is the
   one thing law 10 genuinely needs to hear. Still no arithmetic. The limiting-factor chips become:
   **muscle gave out · ran out of steam · it gave way.**
3. **The Careful field stays exactly as it is.** Content at the point of action, inline, in the
   flow — not a dialog you dismiss. Kevin's objection is to interruption, not to information.
4. **The one-time teaching piece is promoted to the on-ramp** — soreness literacy,
   breathe-through-intensity, find-a-muscle, from FRAMEWORK's teaching list — carrying the "this is
   going to suck and here is why it is worth it" framing in Kevin's voice, under content law 3
   (define the fair test up front) and law 5 (epistemic status travels with the claim).
5. **Open, deliberately:** whether that piece is a screen at onboarding, or a dismissible card the
   first time a release item is dealt ("don't tell me again"). Kevin raised all three shapes and
   ruled none. **The copy gets written first and the shape follows it** — this is a Kevin-writes
   item, not a build item.

## R26 — The template slate waits for the library to fill out (Kevin). **Reopens K5's staging, not its mechanism.**

The library is a partial fill — some body work, some fascia work, some exercise, some breathing —
and far from full scope on any of them. Kevin expects a great deal more to be added across all of
it. So the slate is not ratified now: **a template is built by pulling from the whole library once
the library is fuller**, each one addressing a specific pattern.

The mechanism is untouched — a template is still a preset over the one shared catalog, the same
machinery the quiz uses (D16/K5). What changes is the gate: **"template slate ratification (K5)"
leaves roadmap Phase 0's open list** and becomes a downstream item gated on library depth rather
than on Kevin's availability. Nothing is waiting on him for it.

## Correction-log entries

- 2026-08-23 — the app had been deployed for four days and Kevin did not know
  its URL, had never opened it on his phone, and had only ever seen it on the
  computer. Nothing in the repo or the docs recorded where it lives in a place
  he reads — `docs/` now does, and it is
  **https://shoes-of-peace.kevin-c-bowie.workers.dev**.
- 2026-08-23 — every platform assumption in the Aug-22 push memo was written
  for an iPhone; Kevin is on **Android**, where push works in an ordinary tab
  with no install. The memo's recommendation survives, but its hardest
  constraints do not apply to his own phone.
