# Reels_Intake.md — turning saved videos into catalogue items

*Parked 29 Aug 2026, mid-conversation, before it evaporates. **Nothing built.** Raised by Kevin:
his working source for improvised movement is saved Instagram reels from PTs, trainers and
bodywork/fascia coaches, and he wants a sweep of them into the library. Parked rather than started
because the library build-out is the live work and this needs a file only he can produce.*

## What is actually blocked

**Retrieval is not the bottleneck; watching is.** There is no third-party API for Instagram saved
posts, and scraping is not a thing this project will build. The legitimate route is Meta's own
export — *Accounts Center → Your information and permissions → Download your information*, limited
to Saved — which returns `saved_posts.json`: **URLs and timestamps, nothing else.** No video, no
caption, no audio. The export gives a numbered worklist and not one word of content.

Which means the division of labour is fixed by the medium:

- **Kevin watches and dumps rough notes.** Freeform is fine — *"PT, hip capsule, 90/90 with a
  lift-off at end range, said don't do it if it clicks"* is enough to author from.
- **CC turns notes into catalogue items** — facets, anatomy tags, careful text, dose, and the
  levels ladder where one is implied. That is the slow part and the part worth building around.

The export's value is that it numbers the work, so nothing is done twice or lost.

## Two rulings this inherits rather than needs

**Tier.** A reel is a claim with a face attached, not a citation. Extracted items are
`tier: exploratory` by default with a `sourceNote` naming where it came from, per law 5 — the
catalogue already carries `tier` on 118 items and `evidence` on 102, and both render.

**Whose content it is.** `FRAMEWORK.md`: the framework is the shareable app; anyone's specific
regimen enters as imported content, never as structure. Extracted reels are **Kevin's imported
content, not shipped catalogue** — the same line that kept the supplement protocol out of the
seed. Shipping another coach's material under the app's name is a different decision and has not
been made.

## Where it plugs in

Straight into the authored-content path that already exists: one file per module under
`src/content/authored/`, merged by `npm run catalog`, id collisions stop the build (D24). An
extracted-reels file is an ordinary authored source with a tier default and a source note.

Two things make it land better *after* the taxonomy work than before:

- **The anatomy graph** (`TAXONOMY.md` §9.4). Authoring from video means writing anatomy tags at
  speed; without a vocabulary the 94 free-text strings become 300.
- **`demands` body resources** (`TAXONOMY.md` §6.5). Much of what a reel teaches is a stack — a
  hold with something layered on it — and that is exactly the shape with no field to land in yet.

## When to start

Either when Kevin has the export file, or on ten hand-picked keepers as a shape test before
committing to a sweep. The ten-first version is cheaper and answers the real question, which is
whether the note-to-item conversion is worth the watching time.
