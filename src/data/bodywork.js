// Body work — content, tracking and media layers.
//
// Ported verbatim from body-work-reference.html (the working prototype).
// The three layers below are deliberately separate so any one can change
// without touching the others:
//
//   SECTIONS            the 33 cards: steps, dose, cautions
//   METRICS/TRACK/EVERY/FLARE   what is measurable and how often
//   PHOTOS/NO_PHOTO     which photos belong to which card
//
// TRACK maps a card id to metric keys. PHOTOS maps a card id to photo sets.
// Neither is embedded in the card content, so adding a metric or a photo is
// a one-line change in one object.

export const SECTIONS = [

{ id:"release", name:"Release & load", note:"Manual release paired with the loading that keeps it.", items:[

{ id:"hip", name:"Front of hip", fix:"right primary", tool:"Firm lacrosse ball",
  release:"Lie face down, ball at the front-outside of the hip just inside the hip bone. Sink onto it slowly. Wait for the guard to let go, then a little more. 60–90 sec. Right side first — it's the locked one. Left lighter.",
  load:"Glute bridge ×10 slow, squeeze at the top. Then standing hip extension ×10 each side. The flexor let go; the glute has to take the job.",
  notice:"Knee-to-chest goes further with less pinch. Clicking quiets. Relaxation runs down the leg.",
  careful:"The right hip clicks and subluxes. Release is the opener, stability is the fix — don't chase depth.", video:"" },

{ id:"glute", name:"Glute & back of hip", tool:"Firm lacrosse ball",
  release:"Sit on the floor, ball under one glute, that ankle crossed over the opposite knee. Roll slowly to find the tender spot, then stop and let the pressure build. 60–90 sec each side.",
  load:"Side-lying clamshells ×12 each side, or standing banded abduction. Light band — this is about finding the muscle, not loading it.",
  notice:"Hips sit more level. Less low-back ache when standing.",
  careful:"Deep glute work can catch the sciatic nerve. Numbness or shooting down the leg means move the ball, not push harder.", video:"" },

{ id:"feet", name:"Feet", fix:"the foundation", tool:"Firm lacrosse ball, or a golf ball for finer work",
  release:"Ball under the arch — seated first, standing when you want more. Roll the whole sole slowly: heel, arch, ball of foot. Then park on the tender spots. 60–90 sec per foot.",
  load:"Short foot — gently dome the arch without curling the toes, hold 5 sec ×10. Then barefoot balance, eyes open, 30 sec per side.",
  notice:"The ground feels more detailed. Balance steadier. Calves loosen without being touched.",
  careful:"Tender because they're deconditioned, not damaged. Daily and light beats hard and occasional.", video:"" },

{ id:"calf", name:"Calves", fix:"right releases, left strengthens", tool:"RolFlex, or a firm ball",
  release:"On the mid-belly of the calf — not the Achilles, not the shin bone. While compressed, slowly point and flex the foot 8–10×. Right side primary.",
  load:"Bilateral heel raises ×15 slow, then lower on the left alone ×8. Add seated bent-knee raises for the soleus.",
  notice:"Knee-to-wall distance improves on the right. The ankle feels like it has more to give.",
  careful:"Surgically altered tissue both sides. The left is the weak one — release it lightly or skip it. It needs strength, not length.", video:"" },

{ id:"ham", name:"Hamstrings", tool:"Foam roller or firm ball",
  release:"Under the hamstring, seated on the floor with the leg out. Slow. Once you're on a spot, straighten and bend the knee a few times under the pressure.",
  load:"Glute bridge with the feet further out ×10. Then a bodyweight hip hinge with soft knees ×10 — slow, back flat.",
  notice:"The forward fold goes further with the knees soft.",
  careful:"Chase the fold with knees in soft neutral, never locked back. Range here is a fair target; knee hyperextension is not.", video:"" },

{ id:"pec", name:"Chest & front of shoulder", fix:"breathing", tool:"Soft ball against a wall",
  release:"Ball between your chest and a wall, just below and inside the front of the shoulder — the meaty part near the armpit, not on bone. Lean in, then slowly raise and lower that arm.",
  load:"Wall angels ×8 with the low back flat. Then banded external rotation ×12, elbow tucked at your side.",
  notice:"Shoulders sit back without effort. The chest stops caving in on the lungs. Breath gets deeper on its own.",
  careful:"Don't force shoulders-back-chest-out. That retraction is the exact move that reproduces the thoracic outlet symptoms — let the position come from underneath.", video:"" },

{ id:"lat", name:"Lat & back of armpit", fix:"the spot you found", tool:"Firm ball, side-lying",
  release:"Lie on your side, arm overhead, ball in the back wall of the armpit. Small movements, not long rolls.",
  load:"Lat squeeze isometric — arms at your sides, squeeze the armpits down toward the hips, 5 sec ×10. Then assisted hang, feet partly down, 20–40 sec, pulling the shoulder blades DOWN.",
  notice:"Ribs stop flaring. Belly breath comes easier. Traps quieten.",
  careful:"Right shoulder subluxes. Feet stay partly on the ground during hangs until the scapular base is solid.", video:"" },

{ id:"thor", name:"Mid & upper back", fix:"the cow direction", tool:"Foam roller",
  release:"Roller across the mid-back, arms crossed over the chest. A few passes, then park on a stiff segment and drape backwards over it. Breathe into it. Don't crank.",
  load:"Cat-cow ×8 with real attention to the cow — that's the direction you've lost. Then prone Y-raises ×10, light.",
  notice:"Standing tall stops being effort. Head sits back over the shoulders.",
  careful:"Extend from the mid-back, not the low back. If it hinges down low, move the roller up.", video:"" },

{ id:"neck", name:"Base of skull", fix:"instead of cracking", tool:"Two balls in a sock, or the foam peanut",
  release:"Lie on your back and place them either side of the spine right at the base of the skull. Let the head rest into them, 3–5 min. Run slow extended-exhale breathing the whole time.",
  load:"Chin nods — lying on your back, gently nod the chin toward the throat without lifting the head. Hold 5 sec ×10. These are the deep neck flexors, the stabilizers whose absence makes the neck feel like it needs cracking.",
  notice:"The urge to crack drops. Forward-head posture is easier to correct and holds longer.",
  careful:"This replaces neck cracking. Self-manipulating the cervical spine with lax connective tissue is the one item here with a serious downside — the vertebral arteries run through the joints you would be torquing.", video:"" },

{ id:"quad", name:"Front of thigh", tool:"Foam roller",
  release:"Roller down the front of the thigh, weight regulated through your arms. Slow.",
  load:"Bodyweight squat to a box or chair ×10, strict form. Then step-downs ×8 each side, slow and controlled.",
  notice:"Less pull on the kneecap. The deep squat comes easier.",
  careful:"The kneeling lean-back stretch is intense on a knee in deep flexion. Keep it propped and short — or swap it for a half-kneeling hip flexor stretch with the pelvis tucked under. Same chain, far more control.", video:"" }
]},

{ id:"breath", name:"Breathing", note:"The lever you haven't touched. Everything so far has been downstream effect.", items:[

{ id:"br-9090", name:"90/90 hip lift", fix:"start here", tool:"A wall, plus a rolled hand towel or a small inflatable ball — the 5–6 inch kind, like a child's playground ball — to hold between the knees",
  steps:[
    "Lie on your back with your feet flat on a wall, hips about a foot out from it. Knees bent 90° and hips bent 90°, so your shins are parallel to the floor.",
    "Put the towel or ball between your knees. Squeeze it lightly and keep squeezing the whole time.",
    "Exhale through pursed lips, slowly, and keep going about 3 seconds past the point where you would normally stop. This is the part that matters — the last of the air is what drops the ribs out of flare.",
    "As you exhale, push your heels into the wall until your tailbone lifts about an inch off the floor. An inch. Your low back should flatten against the floor.",
    "Hold empty for 3 seconds.",
    "Let air fall back in through your nose without releasing the position or the knee squeeze."
  ],
  dose:"5 breaths. Once or twice a day.",
  feels:"Hamstrings and low abdominals working. If you feel your quads, low back, or hip flexors, you have lifted too high — come down.",
  notice:"Low back rests flat on the floor without you holding it there. Ribs feel dropped rather than flared. This is the drill that most directly targets the anterior tilt and rib flare you identified yourself.",
  careful:"This is not a glute bridge. An inch of lift, no more. If you get lightheaded, stop and breathe normally for a minute — that is the CO2 shift, and it settles as tolerance builds.", video:"" },

{ id:"br-belly", name:"All-fours belly lift", fix:"back expansion", tool:"None",
  steps:[
    "Hands under shoulders, knees under hips.",
    "Round your low back slightly and tuck your tailbone under — the opposite of the arch you default into.",
    "Exhale fully through pursed lips.",
    "At the bottom, without inhaling, draw your belly up toward your spine and hold 3 seconds.",
    "Inhale through your nose and aim the air into the BACK of your rib cage — imagine widening the space between your shoulder blades. Keep the tuck the whole time."
  ],
  dose:"5 breaths. Once a day.",
  feels:"Strange at first. Most people have never breathed into the back of the ribs and it takes a few sessions to find.",
  notice:"You can feel your back widen on the inhale rather than your chest rising.",
  careful:"This one makes people lightheaded faster than the 90/90. Sit back on your heels if it does.", video:"" },

{ id:"br-co2", name:"CO2 tolerance", fix:"your number", tool:"Phone timer",
  steps:[
    "Sit quietly for 5 minutes first. Morning, before getting up, gives the most consistent reading.",
    "Breathe normally in through the nose, and normally out. Not a big breath, not a forced exhale.",
    "Pinch your nose.",
    "Time until the FIRST definite urge to breathe. Not how long you can hold on — the first real signal: a swallow, a contraction in the throat, a jerk in the belly.",
    "Release and breathe normally. If you are gasping afterwards you held too long and the number is invalid."
  ],
  dose:"Once a week, same time of day. Write it down.",
  feels:"Uncomfortable, not distressing. You should be able to breathe normally straight after.",
  notice:"Under 10 seconds is a very reactive set-point. 10–20 is reactive and common with a breathing pattern disorder. 20–30 is moderate. 40+ is well regulated. The number rising over weeks IS the thing you are trying to fix, and it is the only hard metric in this document.",
  careful:"Do it sitting or lying, never standing, given the orthostatic picture.", video:"" },

{ id:"br-exhale", name:"Extended exhale", fix:"layer into everything", tool:"None",
  steps:[
    "In through the nose for a count of 4.",
    "Out through the nose or pursed lips for a count of 6 to 8.",
    "No force, no strain, no holding at the top."
  ],
  dose:"Run it during every single release hold. Plus 5 minutes before sleep.",
  feels:"Slowing. This is the mechanism behind the melt-into-the-floor response you already get.",
  notice:"Tissue lets go faster under release when you are doing this than when you are not. Test it on a spot you know well.",
  careful:"If the count feels like a struggle, shorten both numbers and keep the ratio. 3 in, 5 out is fine.", video:"" },

{ id:"br-nasal", name:"Nose only, all day", tool:"Awareness",
  steps:[
    "Mouth closed at rest. Lips sealed, teeth slightly apart, tongue on the roof of the mouth.",
    "Nose breathing on walks. If you have to open your mouth, slow down until you do not.",
    "Notice when you break the seal. Stress, concentration, and reaching for something are the usual triggers."
  ],
  dose:"All day, imperfectly. It is a default you are rebuilding, not a rule you are passing or failing.",
  notice:"Reaching for the mouth constantly is data, not failure — it points at nasal obstruction, which is already on your list.",
  careful:"Do not tape your mouth at night. That advice is everywhere in this space and it is specifically wrong for you: you can reproduce your own airway collapse, and taping removes the escape route.", video:"" }
]},

{ id:"range", name:"Range you own", note:"Loaded lengthening — the real answer to a nervous system guarding a range.", items:[

{ id:"rg-cr", name:"Contract–relax", fix:"the method", tool:"A belt, strap, towel, wall, or doorframe. Something immovable to push against",
  steps:[
    "Move into the stretch until you feel the FIRST real tension. Not the end of your range, not pain. That is your starting point.",
    "Push the stretched muscle against something immovable at about 25–50% effort. Not maximum. Keep breathing.",
    "Hold that push for 6–10 seconds.",
    "Let go completely. Long exhale. Ease into the new range that opens up — and there will be one.",
    "Repeat 3 times total, then stop and move on."
  ],
  dose:"2–3 times a week per muscle, not daily. This is a training stimulus, not a warm-up.",
  feels:"The gain right after the contraction is often immediate and surprising. That is the nervous system granting permission, which is exactly the mechanism you described.",
  notice:"Range gained this way tends to still be there tomorrow. Range gained from passive holding usually is not. This is the tool for the question you actually asked.",
  careful:"25–50% effort, not maximum. Only on restricted muscle — never used to push a joint that subluxes further into range.", video:"" },

{ id:"rg-ham", name:"Contract–relax: hamstring", tool:"Belt, strap, or towel",
  steps:[
    "Lie on your back. Loop the strap around the arch of one foot and raise that leg toward the ceiling, knee softly bent — never locked straight.",
    "Raise until you feel the first real tension.",
    "Press your heel DOWN into the strap at 25–50% effort for 8 seconds. Resist with your arms so nothing actually moves.",
    "Relax, exhale long, and draw the leg closer to you.",
    "3 rounds, then swap sides."
  ],
  dose:"3 rounds per side, 3× a week.",
  notice:"Forward fold goes deeper — with soft knees, which is the version that counts.",
  careful:"Knee softly bent throughout. This drill is the safe route to the range you want; locking the knee out to gain a few degrees is the unsafe one.", video:"" },

{ id:"rg-calf", name:"Contract–relax: calf", tool:"A wall",
  steps:[
    "Put the ball of one foot up against a wall with the toes pointing up the wall and the heel on the floor.",
    "Lean your shin toward the wall until you feel the first real tension in the calf.",
    "Press the ball of your foot INTO the wall at 25–50% effort for 8 seconds.",
    "Relax and lean the shin closer to the wall.",
    "3 rounds each side."
  ],
  dose:"3 rounds per side, 3× a week. Right side is the tight one.",
  notice:"Knee-to-wall distance increases. The deep squat gets easier, because the ankle stops being the limiter.",
  careful:"Surgically altered tissue both sides. Go lighter on the left.", video:"" },

{ id:"rg-ecc", name:"Eccentric heel drops", fix:"calves", tool:"A step or stair with a rail",
  steps:[
    "Stand with the balls of both feet on the edge of a step, heels hanging off. Hold the rail.",
    "Rise up onto both toes.",
    "Shift all your weight onto ONE leg.",
    "Lower that heel slowly, counting 5 seconds, until it is well below the level of the step.",
    "Put the other foot back down and use BOTH legs to come back up. Never come up on one leg.",
    "That is one rep."
  ],
  dose:"Start at 5 reps per side, twice a week. Build toward 8.",
  feels:"You will be sore 24–48 hours later. That is the drill working, and it is also why the starting dose is deliberately low.",
  notice:"Calves get stronger and longer at the same time. This is how you get range that holds instead of range you have to keep re-earning.",
  careful:"Eccentrics cause real delayed soreness, and delayed is the operative word given the post-exertional picture. Start at half the volume you think you need and watch the following two days before adding any.", video:"" },

{ id:"rg-squat", name:"Deep squat hang", tool:"A doorframe, post, or the edge of a heavy table",
  steps:[
    "Hold the doorframe with both hands at about waist height.",
    "Sink into the deepest squat you can while keeping your heels down. Let your arms carry as much of your weight as they need to.",
    "Relax into it. Rock gently side to side. Let your knees drift out over your feet.",
    "Breathe into your belly and the back of your ribs the whole time."
  ],
  dose:"30–60 seconds, daily. This is one you can do every day.",
  notice:"Over weeks you need less and less arm support. That is the progression — not more depth, but how much of your own weight you can hold down there.",
  careful:"Heels stay down. If they lift, the ankle is the limiter — do the calf work and take more weight through your arms in the meantime.", video:"" }
]},

{ id:"ribs", name:"Ribs & diaphragm", note:"You are working what pulls on the cage. Not the cage itself.", items:[

{ id:"rb-inter", name:"Between the ribs", fix:"intercostals", tool:"A TENNIS BALL, or your FOAM lacrosse ball. Soft. Not the firm rubber one, and not a big inflatable exercise ball",
  steps:[
    "Stand side-on to a wall. Put the ball between the side of your rib cage and the wall, starting just below the armpit.",
    "Raise that arm overhead and rest it on the wall. This opens the spaces between the ribs and is what makes the drill work.",
    "Lean in gently. Feel for a tender spot BETWEEN two ribs — in the soft strip, not on the hard bone.",
    "Stay on that spot and breathe. Big slow inhale, feel the rib push out against the ball. Long exhale.",
    "5 breaths, then move down a few inches and find the next spot."
  ],
  dose:"2–3 spots per side, 5 breaths each. Two or three times a week.",
  feels:"Odd and very specific. You will feel the breath reaching somewhere it has not been.",
  notice:"Side ribs expand more on the inhale. The breath feels wider rather than just deeper.",
  careful:"Light pressure only. This is bone with thin muscle strips between — a firm ball lands on the rib instead of in the gap, and you bruise easily. If it feels like pressing on bone, move the ball.", video:"" },

{ id:"rb-diaph", name:"Under the rib margin", fix:"diaphragm", tool:"Your fingers. There is no tool for this",
  steps:[
    "Lie on your back, knees bent, feet flat. Let your belly go completely soft.",
    "Find the bottom edge of your rib cage at the front, starting near the centre just below the breastbone.",
    "Hook your fingertips gently just UNDER the rib margin, pointing up and in, toward your head.",
    "Exhale slowly. As you exhale, let your fingers sink slightly further under the edge.",
    "Hold there as you inhale. Do not dig and do not push against the breath. 3 breaths.",
    "Move about an inch outward along the rib arch and repeat. Work from the centre out to the side, then do the other side."
  ],
  dose:"3 breaths per spot, 4–5 spots per side. Every other day.",
  feels:"Deep and uncomfortable, occasionally oddly emotional. It should never be sharp.",
  notice:"Belly breath comes without effort afterwards. This is the most direct access you have to the muscle itself, and the psoas attaches into the same lumbar fascia — your best release and your main symptom are literally continuous tissue.",
  careful:"Not on a full stomach. Gentle — you are reaching under the ribs near organs, and patience works far better than pressure. Sharp pain means stop.", video:"" },

{ id:"rb-side", name:"Side-lying rib opener", tool:"Foam roller or a rolled towel",
  steps:[
    "Lie on your side with the roller under your bottom ribs, running across your body.",
    "Stretch the top arm overhead and bring the top leg forward for balance.",
    "Breathe INTO the upside ribs — the ones facing the ceiling. Feel them open.",
    "8 breaths, then swap sides."
  ],
  dose:"8 breaths per side. Daily if you like it.",
  notice:"Rotation and side-bending get easier. Pairs naturally with the lat work.",
  careful:"Roller under the ribs, not the waist. If it presses into soft belly, move it up.", video:"" }
]},

{ id:"airway", name:"Airway & tongue", note:"Myofunctional therapy. Real evidence for mild apnea and UARS, and nobody has mentioned it to you.", items:[

{ id:"aw-posture", name:"Tongue posture", fix:"all day", tool:"None",
  steps:[
    "The whole tongue — not just the tip — suctioned flat against the roof of the mouth.",
    "Tip rests on the ridge just BEHIND your top front teeth, not on the teeth themselves.",
    "Lips sealed, teeth slightly apart, breathing through the nose.",
    "That is the resting position. Everything else in this section is training you toward holding it without thinking about it."
  ],
  dose:"All day, as a default you keep returning to.",
  notice:"You already use this deliberately as an airway compensation. The goal is making it automatic, including while asleep, which is where it would actually help the collapse.",
  careful:"Jaw tension means you are pressing with the jaw instead of the tongue. Teeth stay apart.", video:"" },

{ id:"aw-press", name:"Tongue press & suction", tool:"None",
  steps:[
    "PRESS — whole tongue flat against the roof of the mouth, push up hard. Hold 10 seconds. ×10.",
    "SUCTION HOLD — suction the whole tongue flat to the palate so it makes a vacuum. Keeping that seal, slowly open your jaw as wide as you can WITHOUT the tongue peeling off. Hold 5 seconds, then close. ×10.",
    "SLIDE — tip of the tongue on the ridge behind the top front teeth, then slide it backwards along the roof of the mouth as far as it will go. ×10.",
    "STRONG SWALLOW — anchor the tongue tip on that ridge and swallow, pressing the tongue up hard through the whole swallow. ×10."
  ],
  dose:"5–10 minutes daily, split however suits you. Give it 2–3 months before judging whether it works.",
  feels:"Your tongue gets tired, which tells you it was weak.",
  notice:"Waking less dry-mouthed. Tongue posture starting to hold without attention. Effects on sleep take months, not days — this is the slowest-acting thing in this document and also one of the highest-value.",
  careful:"Jaw fatigue is expected; jaw pain is not. Given the TMJ picture, go easy on the wide-open suction hold and cut the range right back if the joint complains.", video:"" },

{ id:"aw-palate", name:"Soft palate & throat", tool:"A glass of water",
  steps:[
    "Say an exaggerated 'ahh' and hold it, feeling the back of the throat lift. ×10.",
    "Gargle water properly and loudly for 30 seconds. ×3. Aggressive enough that your eyes water slightly.",
    "Hum on a low pitch with a long exhale until you feel the buzz in your throat and chest."
  ],
  dose:"Daily. Fold it into brushing your teeth so you do not have to remember it separately.",
  notice:"Doubles as direct vagal work — the vagus nerve supplies the larynx. It is also relevant to the voice thread.",
  careful:"Nothing to speak of. This is the safest thing in the whole document.", video:"" }
]},

{ id:"nerve", name:"Nerve glides", note:"Different tissue, different rules. Some of what reads as muscle tightness is neural.", items:[

{ id:"nv-sciatic", name:"Sciatic glide", fix:"hamstrings that will not let go", tool:"A chair",
  steps:[
    "Sit on the edge of a chair with your hands on your thighs.",
    "Slouch. Let your low back round. This is deliberate, not sloppy.",
    "Now, at the same time: straighten one knee out in front of you AND tip your head BACK.",
    "Then reverse, at the same time: bend the knee back down AND drop your chin to your chest.",
    "That is one rep. About 2 seconds each direction, smooth and continuous."
  ],
  dose:"10 reps × 2 sets per side. Daily is fine.",
  feels:"A pull down the back of the leg that MOVES as you go. That movement is the nerve sliding, which is the whole point.",
  notice:"If your hamstring range improves from this when stretching has not moved it, the restriction was never muscular.",
  careful:"This is flossing, not stretching — never hold the end position. If it reproduces pain, tingling, or numbness, reduce the range until it does not. More is not better here; this is one of the few drills where overdoing it clearly makes things worse.", video:"" },

{ id:"nv-median", name:"Median nerve glide", fix:"arm & thoracic outlet", tool:"None",
  steps:[
    "Arm out to the side at shoulder height, elbow bent, palm facing up near your shoulder.",
    "Straighten the elbow out to the side while bending the wrist back so the fingers point down and behind you — and at the same time tilt your head AWAY from that arm.",
    "Reverse: bend the elbow back in, relax the wrist, and tilt your head TOWARD the arm.",
    "Slow and smooth, about 2 seconds each way."
  ],
  dose:"10 reps × 2 sets per side.",
  notice:"Arm symptoms that come and go with position are usually neural rather than muscular. This tests that directly.",
  careful:"Given the thoracic outlet picture, start with a much smaller range than feels necessary. If it reproduces numbness or tingling, halve the range. Never push into symptoms.", video:"" }
]},

{ id:"balance", name:"Balance & feet", note:"Proprioception training. The direct route to the mind-body connection you keep describing.", items:[

{ id:"bl-prog", name:"Single-leg progression", tool:"Bare feet, and a wall or counter within reach",
  steps:[
    "LEVEL 1 — Single leg, eyes open, 30 seconds. 3 rounds per side.",
    "LEVEL 2 — Single leg, eyes closed, 15–30 seconds. This is a big jump; vision was doing most of the work.",
    "LEVEL 3 — Single leg, eyes open, with slow head turns left and right ×10, then up and down ×10.",
    "LEVEL 4 — Single leg standing on a folded towel or pillow, eyes open.",
    "LEVEL 5 — Single leg on the pillow, eyes closed.",
    "Only move up a level when the current one is boring."
  ],
  dose:"5 minutes, most days. Barefoot always.",
  notice:"Your foot will be visibly working — toes gripping, arch adjusting constantly. That is the foot-to-brain conversation you are trying to restart.",
  careful:"Stay within reach of a counter. The Level 3 head turns can trigger dizziness given the dysautonomia — if the room moves, sit down and come back to it another day at a slower speed.", video:"" },

{ id:"bl-toes", name:"Toe control", fix:"harder than it sounds", tool:"Bare feet, a towel",
  steps:[
    "TOE SPREAD — spread all your toes apart without curling them. Hold 5 seconds. ×10.",
    "BIG TOE LIFT — press the other four toes down and lift only the big toe. Then reverse: big toe down, lift the other four.",
    "TOWEL SCRUNCH — towel flat on the floor, use your toes to drag it toward you. ×10 each foot.",
    "The lifts will be close to impossible at first. That is the point — it is a connection you do not have yet."
  ],
  dose:"Daily. It takes two minutes and you can do it sitting down.",
  notice:"Individual toe control is a direct readout of the nerve pathway you are trying to rebuild. Watching it go from impossible to easy is the clearest progress marker in this entire document.",
  careful:"Cramping is common at first. Stop, stretch the foot out, come back tomorrow.", video:"" }
]},

{ id:"vagal", name:"Vagal & nervous system", note:"Direct downregulation. Cheap, and you already own most of the gear.", items:[

{ id:"vg-mat", name:"Acupressure mat", fix:"you own it, use it", tool:"The mat you already have",
  steps:[
    "Lie on it, bare back if you can tolerate it, for 15–20 minutes.",
    "Run extended-exhale breathing the entire time. This is what turns it from a sensation into a nervous system drill.",
    "The first 2–3 minutes are unpleasant, then it flips to warmth. Wait for the flip."
  ],
  dose:"15–20 minutes, 3–4× a week. Evening works best.",
  notice:"You said yourself that it helps and that you underuse it. Attach it to a fixed cue — after dinner, or while reading — rather than relying on remembering.",
  careful:"Your skin bruises and marks easily. A thin t-shirt for the first few sessions is a sensible place to start.", video:"" },

{ id:"vg-hum", name:"Humming & gargling", tool:"Your voice, and a glass of water",
  steps:[
    "Hum on the lowest comfortable pitch, drawing the exhale out as long as it will go. Feel the vibration in your throat and chest.",
    "5 minutes, or about 20 long hums.",
    "Gargle water loudly for 30 seconds, ×3."
  ],
  dose:"Daily. It combines with the soft palate work — same drills, two purposes.",
  notice:"The vagus nerve supplies the larynx, so this is about as direct as non-invasive vagal stimulation gets without a device.",
  careful:"None.", video:"" },

{ id:"vg-face", name:"Cold on the face", tool:"A bowl of cold water, or a cold pack",
  steps:[
    "Bowl of cold water — face in, hold 20–30 seconds. Or hold a cold pack over your forehead and eyes.",
    "Face and forehead only. Not a cold shower and not full immersion.",
    "The trigger is the nerve endings around the eyes and forehead. That is what fires the dive reflex and slows the heart."
  ],
  dose:"When you need a reset. Not a daily requirement.",
  notice:"One of the very few things that shifts autonomic state within seconds rather than minutes.",
  careful:"Cold is a mast cell trigger for some people — test small and stop if you get flushing, itching, or hives. Not while alone if you are prone to feeling faint.", video:"" }
]}
];

/* ============================================================
   PHOTOS
   Real photographs, two frames each — the start and end of the
   movement. Played as a loop they show the movement itself,
   which a still cannot.

   Source: the Free Exercise DB (github.com/yuhonas/free-exercise-db),
   released into the public domain under the Unlicense. Downloaded
   into images/ so this file works with no internet connection.

   Honesty about fit: this library is a general exercise library.
   Where a photo is close but not exactly the drill on the card,
   the caption says so. Where nothing in it fits — the breathing
   work, the tongue work, the nerve glides — the card says that
   plainly rather than showing you something misleading. Those
   are the ones to film yourself.
   ============================================================ */

const P = (set, cap, approx) => ({set, cap, approx: !!approx});

export const PHOTOS = {

hip: [
  P('Kneeling_Hip_Flexor', 'Half-kneeling hip flexor — the safer swap for the kneeling lean-back the card warns about. Tuck the pelvis under.'),
  P('Butt_Lift_Bridge', 'The load. Slow, squeeze at the top. The flexor let go; the glute has to take the job.'),
],
glute: [
  P('Piriformis-SMR', 'Ball or roller under one glute, that ankle crossed over the opposite knee. Roll to the tender spot, then stop and let the pressure build.'),
  P('Iliotibial_Tract-SMR', 'Further round the side, if the tenderness sits on the outer hip rather than deep in the glute.', true),
  P('Single_Leg_Glute_Bridge', 'A harder bridge once the two-leg version is easy. Light band optional — this is about finding the muscle.'),
],
feet: [
  P('Foot-SMR', 'Ball under the arch, seated first. Roll heel, arch, ball of foot slowly, then park on the tender spots.'),
],
calf: [
  P('Calves-SMR', 'On the mid-belly of the calf. Not the Achilles, not the shin bone. Right side primary; the left is the weak one.'),
],
ham: [
  P('Hamstring-SMR', 'Under the hamstring, seated, leg out. Once you are on a spot, bend and straighten the knee under the pressure.'),
  P('Butt_Lift_Bridge', 'The load. Bridge with the feet further out than usual.'),
],
pec: [
  P('External_Rotation_with_Band', 'The load, standing. Yours is the same with the elbow tucked at your side. Do not force the shoulders back — that retraction is what reproduces the thoracic outlet symptoms.', true),
],
lat: [
  P('Latissimus_Dorsi-SMR', 'Side-lying, arm overhead, in the back wall of the armpit. Small movements, not long rolls.'),
  P('Scapular_Pull-Up', 'The load. Hang, then raise yourself a few inches WITHOUT bending the arms — a reverse shrug that depresses the shoulder blades. This is the "pull the blades DOWN" cue, and it is the exact drill rather than an approximation.'),
],
thor: [
  P('Rhomboids-SMR', 'Roller across the mid-back, arms crossed over the chest. Park on a stiff segment and drape back over it.'),
  P('Cat_Stretch', 'Cat-cow. Give real attention to the cow direction — that is the one you have lost.'),
],
quad: [
  P('Quadriceps-SMR', 'Roller down the front of the thigh, weight regulated through the arms. Slow.'),
],

'rg-cr': [
  P('Seated_Hamstring', 'The method itself. A partner braces the shoulders while you push your torso BACK at 25–50% for 10–20 seconds, then relax into the new range. A belt, wall or doorframe does the same job solo — the partner is just what the library had.'),
  P('Seated_Floor_Hamstring_Stretch', 'The starting position, not the whole method: move only to the FIRST real tension, then push against something immovable for 6–10 seconds before easing in.', true),
],
'rg-ham': [
  P('Leg-Up_Hamstring_Stretch', 'On your back, knee softly bent. Yours uses a strap round the arch — press the heel down into it for 8 seconds, then draw the leg closer.'),
],
'rg-calf': [
  P('Calf_Stretch_Hands_Against_Wall', 'Ball of the foot up the wall, heel down. Press in at 25–50%, hold 8 seconds, then lean the shin closer.'),
  P('Standing_Soleus_And_Achilles_Stretch', 'The bent-knee version, which reaches the soleus. Worth doing both — lighter on the left.'),
],
'rg-squat': [
  P('Bodyweight_Squat', 'The squat pattern. Yours is a hang from a doorframe: the progression is needing less arm support, not more depth.', true),
],

'rb-side': [
  P('Side-Lying_Floor_Stretch', 'Side-lying with the top arm overhead. Yours adds a roller under the bottom ribs and eight breaths into the upside ribs.', true),
],
'br-9090': [
  P('Pelvic_Tilt_Into_Bridge', 'Not the drill, but it shows the tilt underneath it. Yours is an inch of lift with the feet on a wall, on a long exhale.', true),
],

/* Added on a second pass. The first pass found near-misses for these,
   judged them imperfect, and left the cards blank rather than showing
   them — which left less information on the card, not more. A photo that
   shows the body position you are aiming at earns its place as long as
   the caption is honest about what differs. */
'rg-ecc': [
  P('Calf_Raise_On_A_Dumbbell', 'The foot position and the balance support. Yours is the edge of a stair with a rail: rise on BOTH, shift to ONE, lower that heel over a slow count of 5 well below the step, then come back up on BOTH. Never up on one leg.', true),
],
'bl-prog': [
  P('Balance_Board', 'Balance training on an unstable surface — roughly Level 4 of your progression. Levels 1–3 come first and need nothing but bare feet and a counter within reach.', true),
],
neck: [
  P('Isometric_Neck_Exercise_-_Front_And_Back', 'The load, seated: gentle resistance with no actual movement of the head. Yours is done lying on your back — nod the chin toward the throat without lifting the head, hold 5 seconds. Resistance, never rotation.', true),
],
'nv-median': [
  P('Side_Wrist_Pull', 'The arm and wrist position. Yours is a GLIDE, not this held stretch — move in and out continuously, about 2 seconds each way, and never park at the end position.', true),
],
'br-belly': [
  P('Stomach_Vacuum', 'The belly-lift mechanic, standing: exhale everything out, then draw the navel up toward the spine and hold. Yours is the same draw on all fours with the tailbone tucked, then breathing into the BACK of the ribs.', true),
],
};

/* Cards with nothing honest to show.

   This list was pruned on a second pass. It used to hold eighteen cards,
   several of which had a usable near-miss in the library that the first
   pass rejected and then never replaced. Those are now mapped above.

   What is left splits into two kinds, and neither is laziness:

   `absent` — the source is an EXERCISE library, and these are not
   exercises. There is no photograph of nose breathing, tongue posture,
   humming, or a breath-hold measurement to find, in this library or
   likely any other. A photo would add nothing a sentence does not.

   `misleading` — near-misses exist but teach the wrong thing. Loaded
   side bends on a card about light pressure between the ribs of someone
   who bruises easily; a held static stretch on a card whose whole point
   is that it is a glide and must never be held. These stay blank on
   purpose, and they are the ones worth filming. */
export const NO_PHOTO = {
  'br-co2':    { what: 'a breath-hold measurement', why: 'absent' },
  'br-exhale': { what: 'a breathing ratio', why: 'absent' },
  'br-nasal':  { what: 'nose breathing', why: 'absent' },
  'aw-posture':{ what: 'tongue posture', why: 'absent' },
  'aw-press':  { what: 'tongue press and suction', why: 'absent' },
  'aw-palate': { what: 'soft palate work', why: 'absent' },
  'vg-mat':    { what: 'an acupressure mat', why: 'absent' },
  'vg-hum':    { what: 'humming and gargling', why: 'absent' },
  'vg-face':   { what: 'cold on the face', why: 'absent' },

  'rb-inter':  { what: 'a ball between the ribs at a wall', why: 'misleading',
                 near: 'the closest matches are loaded side bends — weighted oblique work on a card that says light pressure only' },
  'rb-diaph':  { what: 'fingers under the rib margin', why: 'misleading',
                 near: 'nothing in an exercise library shows manual work under the rib arch' },
  'nv-sciatic':{ what: 'a sciatic nerve glide', why: 'misleading',
                 near: 'the closest matches are held seated hamstring stretches, and this drill must never be held' },
  'bl-toes':   { what: 'individual toe control', why: 'misleading',
                 near: 'searching toes returns toe-touch hamstring work, which is a different thing entirely' },
};

/* ============================================================
   WHAT GETS MEASURED
   Every metric here has to survive one test: you can take it
   alone, at home, in under two minutes, and get the same number
   tomorrow if nothing has changed. Anything that fails that test
   is a feeling, not a measurement — those go in the note field.

   tier "core"  — the six worth re-measuring every month
   tier "extra" — useful, but do not let them become homework
   better "up"  — a rising number is progress
   better "down"— a falling number is progress
   ============================================================ */

export const METRICS = [

{ key:"co2", label:"CO2 tolerance", unit:"sec", tier:"core", sides:false,
  cadence:"Weekly, same time of day", better:"up",
  how:"Sit 5 min. Normal breath in through the nose, normal breath out, pinch. Time to the FIRST definite urge — a swallow, a throat contraction, a belly jerk. Not how long you can hold on. If you gasp afterwards, the number is invalid." },

{ key:"kneewall", label:"Knee to wall", unit:"cm", tier:"core", sides:true,
  cadence:"Every 2 weeks", better:"up",
  how:"Big toe pointing at the wall, foot square. Slide the foot back until your knee only just touches the wall with the heel still down. Measure from the wall to the big toe. Same foot position, same bare feet, every time." },

{ key:"fold", label:"Forward fold", unit:"cm", tier:"core", sides:false,
  cadence:"Every 2 weeks", better:"down",
  how:"Stand, knees SOFT — never locked back. Fold and let the arms hang. Measure fingertips to floor. A smaller number is more range. Locking the knees to gain a few centimetres invalidates it and is the exact thing you are trying not to do." },

{ key:"balance_closed", label:"Single leg, eyes closed", unit:"sec", tier:"core", sides:true,
  cadence:"Every 2 weeks", better:"up",
  how:"Barefoot, counter within reach. Stop the clock the moment the foot moves or you touch down. Cap it at 60 — past that it is measuring patience, not balance." },

{ key:"bigtoe", label:"Big toe lift", unit:"0–3", tier:"core", sides:true,
  cadence:"Every 2 weeks", better:"up",
  how:"Four toes pressed down, lift only the big toe. 0 = nothing. 1 = a flicker. 2 = it lifts partway, other toes cheat. 3 = clean and easy. Score it honestly; the whole value is watching a 0 become a 3." },

{ key:"chestexp", label:"Chest expansion", unit:"cm", tier:"core", sides:false,
  cadence:"Weekly", better:"up",
  how:"Tape measure around the chest at nipple line. Full exhale, read it. Full inhale, read it. Record the difference. Under 5 cm is restricted, and it is the number most likely to move from the rib and diaphragm work." },

{ key:"hipflex", label:"Knee-to-chest pinch", unit:"0–10", tier:"extra", sides:true,
  cadence:"Every 2 weeks", better:"down",
  how:"On your back, draw one knee to your chest. Rate the PINCH at the front of the hip, 0 to 10 — not the stretch behind. Same depth each time, so stop at the point where the pinch first appears rather than pulling to end range." },

{ key:"hang", label:"Assisted hang", unit:"sec", tier:"extra", sides:false,
  cadence:"Every 2 weeks", better:"up",
  how:"Feet partly on the ground, shoulder blades pulled DOWN. Time until the blades give up and the shoulders ride toward the ears. Stop there — the seconds after that are not the thing being measured." },

{ key:"chinnod", label:"Chin nod hold", unit:"sec", tier:"extra", sides:false,
  cadence:"Every 2 weeks", better:"up",
  how:"On your back, gently nod the chin toward the throat without lifting the head. Time until the front of the neck starts to shake or the jaw takes over." },

{ key:"squatsup", label:"Squat support needed", unit:"0–3", tier:"extra", sides:false,
  cadence:"Monthly", better:"up",
  how:"Deep squat hold. 0 = arms carrying most of you. 1 = a firm pull. 2 = light fingers. 3 = hands off entirely. This is the progression — not depth." },

{ key:"wallangel", label:"Wall angel", unit:"0–3", tier:"extra", sides:false,
  cadence:"Monthly", better:"up",
  how:"Back to the wall, low back flat and held flat. Slide the arms up. 0 = forearms nowhere near. 1 = wrists touch. 2 = forearms touch but the back arches. 3 = forearms stay on the wall with the back flat." },

{ key:"crackurge", label:"Neck-crack urge", unit:"/day", tier:"extra", sides:false,
  cadence:"Count on a normal day, monthly", better:"down",
  how:"Rough count of how many times in a day you want to crack your neck. Count the urge, not the act. This is the behaviour the base-of-skull work is meant to replace." },

{ key:"nosewalk", label:"Nose-only walk", unit:"min", tier:"extra", sides:false,
  cadence:"Monthly", better:"up",
  how:"Walking at a normal pace, time until you have to open your mouth. Flat ground, same route. This one is as much a readout on nasal obstruction as on fitness." },

{ key:"drymouth", label:"Waking dry mouth", unit:"0–3", tier:"extra", sides:false,
  cadence:"Weekly, first thing", better:"down",
  how:"0 = none. 1 = slight. 2 = clearly dry. 3 = unpleasant. Crude, but it is one of the few home readouts on whether the tongue work is reaching sleep — and that takes months, so the record matters more than any single morning." },
];

export const M_BY_KEY = Object.fromEntries(METRICS.map(m => [m.key, m]));

/* Which measurements belong to which card. */
export const TRACK = {
  hip:["hipflex"],
  glute:["hipflex"],
  feet:["bigtoe","balance_closed"],
  calf:["kneewall"],
  ham:["fold"],
  pec:["wallangel","chestexp"],
  lat:["hang","chestexp"],
  thor:["wallangel","chestexp"],
  neck:["chinnod","crackurge"],
  quad:["squatsup"],
  'br-9090':["chestexp","co2"],
  'br-belly':["chestexp"],
  'br-co2':["co2"],
  'br-exhale':["co2"],
  'br-nasal':["nosewalk","co2"],
  'rg-cr':[],
  'rg-ham':["fold"],
  'rg-calf':["kneewall"],
  'rg-ecc':["kneewall"],
  'rg-squat':["squatsup","kneewall"],
  'rb-inter':["chestexp"],
  'rb-diaph':["chestexp"],
  'rb-side':["chestexp"],
  'aw-posture':["drymouth"],
  'aw-press':["drymouth"],
  'aw-palate':["drymouth"],
  'nv-sciatic':["fold"],
  'nv-median':[],
  'bl-prog':["balance_closed"],
  'bl-toes':["bigtoe"],
  'vg-mat':[],
  'vg-hum':[],
  'vg-face':[],
};

/* Cards where the document itself warns about delayed effects.
   Logging one of these prompts a 48-hour look back, because the
   cost of finding out late is a week you did not need to lose. */
export const FLARE = ['rg-ecc','rg-cr','rg-ham','rg-calf','rg-squat','bl-prog','lat'];

/* How often each card is meant to come round, in days.
   Used only to say "it has been a while" — never to scold. */
export const EVERY = {
  hip:2, glute:2, feet:1, calf:2, ham:2, pec:2, lat:2, thor:2, neck:2, quad:3,
  'br-9090':1, 'br-belly':1, 'br-co2':7, 'br-exhale':1, 'br-nasal':1,
  'rg-cr':3, 'rg-ham':3, 'rg-calf':3, 'rg-ecc':4, 'rg-squat':1,
  'rb-inter':3, 'rb-diaph':2, 'rb-side':1,
  'aw-posture':1, 'aw-press':1, 'aw-palate':1,
  'nv-sciatic':1, 'nv-median':1, 'bl-prog':1, 'bl-toes':1,
  'vg-mat':2, 'vg-hum':1, 'vg-face':7,
};

/* Flat card lookup, and a name index for the log feed and summary export. */
export const ALL_CARDS = SECTIONS.flatMap(s => s.items);
export const NAME_BY_ID = Object.fromEntries(ALL_CARDS.map(e => [e.id, e.name]));
export const SECTION_BY_CARD = Object.fromEntries(
  SECTIONS.flatMap(s => s.items.map(e => [e.id, s.name]))
);
