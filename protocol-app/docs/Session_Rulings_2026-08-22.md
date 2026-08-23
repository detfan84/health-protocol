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
