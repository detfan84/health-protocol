# Protocol app — what we are building, and why

**Status:** draft for Kevin to mark up. Written 19 Aug 2026, and kept in the
repo so it cannot go missing with a chat session.

This exists because v0.2 was handed over as a working engine with nothing in
it, and the planning that produced it lived in chat sessions that are now gone.
This document is the opposite of that: it is in the repo, it says what the app
is for, and where a decision is still open it says so out loud instead of
guessing.

---

## 1. What this is

A protocol app: it tells you what to do today, why it matters, and how to do
it — and it remembers what you actually did.

Two audiences, and the difference matters for every decision below:

- **Kevin.** Supplements across timed blocks, phases spanning a year, body
  work, breathing, stretching and strength training. Opens it every morning.
- **Anyone he shares it with.** Opens the same URL. Must find an app that makes
  sense, not one person's parasite-cleanse regimen.

**Therefore: personal content is never shipped.** A stranger gets an app, not
Kevin's medicine cabinet. Kevin's own protocol is a file he imports. This is
already true as of 19 Aug.

---

## 2. What went wrong in v0.2, stated plainly

Not to dwell, but because each failure implies a requirement.

| What happened | What it means we must do |
|---|---|
| Shipped with no content at all | Ship *generic* starter content, so the app is legible on first open |
| Every instruction stored but never drawn | The "how" and the "why" are not extras — they are the point |
| Water counted in "glasses" | The April brief said **ounces**, with a unit toggle. A regression. |
| "3–5 days per week" is plain text | The app must understand frequency, not just display it |
| Sets and reps are plain text | The app must understand training, not just list it |
| One flat list of 179 items | The screen must show what is due, not everything that exists |
| No medical disclaimer | The old app had a thorough one. Shareable makes this mandatory. |

---

## 3. What a day looks like

The core loop. Every screen decision should serve it.

1. **Open it.** It already knows the time of day, which phase you are in, and
   what you have done this week.
2. **See what is due now** — not everything that exists. You land on the
   current time block. Later blocks are collapsed. Earlier ones show what you
   missed.
3. **Know why.** Each item carries its reason and its instructions, one tap
   away.
4. **Do it and mark it.** One tap. For training, log the actual sets.
5. **See that it counted.** A 3×/week item shows you are 2 of 3 this week.

If a screen does not serve that loop, it is decoration.

---

## 4. What the app has to learn

Three things the data model does not currently understand. These are the build.

### 4.1 Cadence — "how often"

Today every item is implicitly daily. Real protocols are not.

Proposed: each item gets an optional cadence.

- `daily` — the default, which is what everything is now
- `timesPerWeek: n` — "3–5 days a week". Flexible: any n days count.
- `everyNDays: n` — "every other day", "weekly"
- `asNeeded` — present, never overdue, never nags

The app then answers, on screen: **is this due today, and how am I doing this
week?** A 3×/week item you have done twice shows `2 of 3`. Once you hit the
target it stops asking.

> **Open question K1** — for "3–5 days per week", is 3 the target and 5 the
> ceiling, or is it a range you want shown as a range?

### 4.2 Sets and reps — real training

Today a workout item says `3 × 10 reps` as text and offers a tick box. That is
strictly worse than the old app, which logged actual work.

Proposed: an item has a `tracking` type.

- `check` — the default. Done or not. Supplements, body work, breathing.
- `sets` — logs each set: reps, and weight where it applies. Shows last time's
  numbers when you open it, because that is what you train against.
- `duration` — logs minutes or seconds. Planks, holds, walks.

Progression becomes real: the app can show that last week was 3×8 at 20lb and
this week you did 3×10.

> **Open question K2** — weight in lb, kg, or a user setting? The April brief
> asked for a global imperial/metric toggle; the same setting should cover this.

### 4.3 Instructions as first-class content

Half-fixed already: notes now render behind a "How" disclosure. What is still
missing is structure. The old body work cards had *Tool*, *Release*, *Load*,
*Notice* and *Careful* as distinct fields with distinct meanings, and they are
currently flattened into one blob with bold labels.

> **Open question K3** — is the flattened version good enough, or do these
> deserve real fields, so that "Careful" can be styled as a warning rather than
> just another paragraph?

---

## 5. What the screen becomes

The flat list is the most visible failure, and it is downstream of the two model
changes above. Once the app knows cadence and time, Today can be:

- **Now** — the current time block, open, with its items.
- **Due today** — anything scheduled for today that is not in a time block: a
  3×/week body work item you have not hit yet.
- **Later today** — collapsed. One line each. Tap to open.
- **Done** — collapsed and out of the way, but visible, so you can watch the
  day fill up.
- **Not today** — genuinely hidden. If it is not due, it is not on the screen.

That is the difference between a list of everything and an app that knows what
time it is.

> **Open question K4** — when you miss something (a fasted supplement at 6am and
> it is now 2pm), should it stay on screen as missed, disappear, or move to a
> "missed today" group?

---

## 6. What a stranger sees

Because it is shareable:

- **Generic starter content**, not Kevin's. A common-supplement library people
  can pick from, plus the body work, breathing and mobility content, which is
  general enough to be useful to anyone.
- **The disclaimer from the old app's README**, on screen and unavoidable on
  first open. That text is already written and it is good. It should not be
  buried in a repo file.
- **An empty state that teaches.** "No protocols yet" is not an onboarding.

> **Open question K5** — should a stranger start from a template ("general
> wellness", "strength 3×/week"), or start empty and build?

---

## 7. Build order

Deliberately model first, then screens. Screens first means building them twice.

1. **Cadence in the data model**, with the tests that pin it
2. **Tracking types** (check / sets / duration), with tests
3. **Rebuild Today** around due-now, due-today, later, done
4. **Water in ounces**, with the global unit setting the April brief asked for
5. **Disclaimer and first-run experience**
6. **Generic starter content**
7. **Visual design pass** — the "app people would pay for" bar

Steps 1–3 are the app becoming itself. Steps 4–6 are what make it shareable.
Step 7 goes last on purpose: polishing a screen that is about to be rebuilt is
wasted work.

---

## 8. Decisions needed from Kevin

Collected here so they are in one place. None of them block step 1, but each
shapes what comes after.

| | Question |
|---|---|
| **K1** | "3–5 days per week" — target of 3 with 5 as a ceiling, or shown as a range? |
| **K2** | Weight in lb, kg, or a user setting? |
| **K3** | Do Tool / Release / Load / Notice / Careful deserve real fields? |
| **K4** | What happens to a missed item later in the day? |
| **K5** | Do strangers start from a template, or from empty? |

---

## 9. What this document is not

It is not a promise that everything here gets built. It is the shared picture of
what we are aiming at, so that when something arrives it can be checked against
something written down rather than against a memory of a conversation.

Changes to this plan are commits, like everything else.
