// day-arc.mjs — the six-part day, as content.
//
// FRAMEWORK v3 specs the arc and nothing built it, so the app had time blocks
// from an imported supplement list and no day of its own. This is parts 1, 2,
// 5 and 6 — the anchors — written out as real blocks a person opens and does.
//
// What this is NOT: the composer. The composer deals the rotating middle of
// the day from a coverage ledger, and that is a build of its own. The anchors
// do not need it — they are the same few minutes every day by design (law 4,
// rhythm before variety), which is exactly why they can ship now.
//
// Two rules from the spec are carried literally:
//
//   Every anchor has a floor (law 6). Each block's first item IS the floor —
//   sixty seconds that count as having done it. Missing part one never
//   forfeits part two.
//
//   The rise block attaches to a ritual you already have (law 7). The app
//   never schedules inside somebody's coffee; it schedules alongside it.
//
// The wake block follows the unwind-the-night principle: the morning bias
// reverses whatever position the body held for hours. Sleep position is not
// asked yet (D30 onboarding), so the shipped set is the one that suits the
// most common posture and says so.

export function dayArcProtocol(now) {
  const floor = (id, name, seconds, why, fields) => ({
    id,
    name,
    dose: `${seconds} sec`,
    why,
    tracking: 'duration',
    target: { seconds },
    fields,
  });

  return {
    id: 'seed-day-arc',
    name: 'The day arc',
    notes: 'Four anchors: before you get up, while the kettle boils, before bed, and in bed. Each one has a sixty-second version that counts — miss the long one and the floor is still the whole thing.',
    active: true,
    phases: [],
    blocks: [
      {
        id: 'arc-wake',
        name: 'Before your feet touch the floor',
        start: '06:30',
        end: '08:00',
        order: 0,
        items: [
          floor('arc-wake-rock', 'Rocking child’s pose', 60,
            'The floor version. Sixty seconds of rocking is the whole block on a bad morning.',
            {
              tool: 'Your bed, before you get up.',
              release: 'Knees under you, sit back toward your heels, arms forward. Rock slowly forward and back — small, unhurried, breathing out longer than you breathe in.',
              notice: 'The low back lets go first, then the hips. The breath drops out of the chest.',
              careful: 'Knees that object get a pillow behind them, or do this on your side instead. Nothing here is worth pain first thing.',
            }),
          {
            id: 'arc-wake-lat',
            name: 'Lean-forward lat and shoulder stretch',
            dose: '60–90 sec',
            why: 'A night on one side shortens what you slept on. This reverses it before you stand up on it.',
            tracking: 'duration',
            target: { seconds: 75 },
            fields: {
              release: 'From the same kneeling position, walk both hands to one side until you feel the stretch down the outside of the ribs and into the armpit. Breathe into that side. Then the other side.',
              notice: 'Ribs move on that side again. The overhead reach feels less blocked.',
              careful: 'If a shoulder feels unstable overhead, keep the elbow bent and stay short of the end range.',
            },
          },
          {
            id: 'arc-wake-chest',
            name: 'Kneel-sit chest opener',
            dose: '60 sec',
            why: 'Undoes the curl the night put in — chest, front of shoulders, hip flexors, all at once.',
            tracking: 'duration',
            target: { seconds: 60 },
            fields: {
              release: 'Sit back on your heels, hands behind you on the bed, fingers pointing away. Lift the chest and let the shoulders roll back. Breathe wide, not deep.',
              notice: 'The first full breath of the day usually arrives here.',
              careful: 'Wrists that complain: make fists and rest on the knuckles, or drop to the forearms.',
            },
          },
        ],
      },
      {
        id: 'arc-rise',
        name: 'While the kettle boils',
        start: '07:00',
        end: '10:00',
        order: 1,
        items: [
          floor('arc-rise-fold', 'Forward fold, hanging', 60,
            'The floor version. One minute while something else is happening.',
            {
              tool: 'Whatever you already do first — coffee brewing, the shower warming up.',
              release: 'Feet hip-width, knees soft — never locked back. Fold and hang. Let the head go. Sway a little if it helps.',
              notice: 'The hamstrings stop arguing after about thirty seconds. That is the point where it starts working.',
              careful: 'Soft knees, always. Locking them to reach further is the exact thing this is undoing.',
            }),
          {
            id: 'arc-rise-hips',
            name: 'Hip circles',
            dose: '30 sec each way',
            why: 'The hips have not moved through their own range in eight hours.',
            tracking: 'duration',
            target: { seconds: 60 },
            fields: {
              release: 'Hands on hips, feet planted. Draw the biggest slow circle you can with the pelvis, one way then the other. Keep the ribs still — this is the hips moving, not the whole torso.',
              notice: 'One direction is always worse than the other. That is information, not a fault.',
            },
          },
          {
            id: 'arc-rise-horse',
            name: 'Horse stance, rocks and shifts',
            dose: '60–90 sec',
            why: 'Wakes up the deep hip and pelvic-floor work that standing all day never asks for.',
            tracking: 'duration',
            target: { seconds: 75 },
            fields: {
              release: 'Wide stance, toes slightly out, sit down into a quarter squat. Rock the pelvis front to back, then shift your weight side to side. Slow.',
              notice: 'The inner thighs and the floor of the pelvis switch on. Standing feels more planted afterwards.',
              careful: 'Knees track over the toes, not inside them. Go shallow — depth is not what this is for.',
            },
          },
        ],
      },
      {
        id: 'arc-evening',
        name: 'Evening — deep release',
        start: '20:00',
        end: '22:00',
        order: 2,
        items: [
          floor('arc-evening-breath', 'Extended exhale', 60,
            'The floor version, and the one that does the most for the least.',
            {
              release: 'Breathe in through the nose for four, out through the nose for eight. Sixty seconds. The out-breath is the whole mechanism — long and unforced.',
              notice: 'Shoulders drop without being told to. The body decides it is safe to downshift.',
              careful: 'Lightheaded means shorten it, not push. This should feel like less effort, not more.',
            }),
          {
            id: 'arc-evening-release',
            name: 'Deep release, wherever today landed',
            dose: '5–10 min',
            why: 'The day’s worst offender gets the pressure. Melting into the floor is the signal it worked — that is the nervous system letting go, not the tissue.',
            tracking: 'duration',
            target: { seconds: 480 },
            fields: {
              tool: 'A firm ball, a roller, or your own hands.',
              release: 'Pick what actually bothered you today rather than a routine. Sink in and wait — sixty to ninety seconds a spot. Breathe out through the intensity instead of holding your breath against it.',
              load: 'Follow it with something that uses the range you just opened, even briefly. Range you do not load is range you give back overnight.',
              notice: 'The sink-into-the-floor feeling. Breathing gets easier while you are still on the spot.',
              careful: 'Sharp pain, numbness or anything shooting down a limb means move off it — that is nerve, not muscle, and pressure is the wrong answer.',
            },
          },
        ],
      },
      {
        id: 'arc-bed',
        name: 'In bed, winding down',
        start: '22:00',
        order: 3,
        items: [
          floor('arc-bed-rocks', 'Supine knee rocks', 60,
            'The floor version. One minute of this is a complete evening block.',
            {
              release: 'On your back, knees bent, feet down. Let both knees fall slowly to one side, then the other. Rhythmic and small. No effort at all.',
              notice: 'The low back unwinds. Most people stop noticing they are doing it, which is the idea.',
            }),
          {
            id: 'arc-bed-swings',
            name: 'Prone bent-knee foot swings',
            dose: '60–90 sec',
            why: 'A rhythmic motion that carries people into sleep — the point is the rhythm, not the stretch.',
            tracking: 'duration',
            target: { seconds: 75 },
            fields: {
              release: 'Face down, knees bent, ankles crossed or apart. Swing the feet slowly side to side like a metronome. Let it get boring.',
              notice: 'Breathing slows on its own. Stopping because you drifted off is a success, not a skipped item.',
              careful: 'Face down is not for everyone — if the low back complains, stay on your back and keep rocking the knees instead.',
            },
          },
        ],
      },
    ].map((b) => ({
      ...b,
      items: b.items.map((it) => Object.fromEntries(Object.entries(it).filter(([, v]) => v !== undefined))),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
