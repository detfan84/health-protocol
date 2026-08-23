// generalise.mjs — the personal detail, rewritten in the open.
//
// One rule: keep every instruction and every caution, drop the fact that it is
// about one particular body. "The right hip clicks and subluxes" becomes "if a
// hip clicks or gives way" — the person who has that hip still gets the
// warning; the person who does not is not told they have it.
//
// Shared by build-content.mjs (the shipped day) and build-library.mjs (the
// browsable catalogue) so the two can never say different things about the
// same card.

export const GENERALISE = {
  hip: {
    release: 'Lie face down, ball at the front-outside of the hip just inside the hip bone. Sink onto it slowly. Wait for the guard to let go, then a little more. 60–90 sec. Start with the tighter side; the other side lighter.',
    careful: 'If a hip clicks, catches or feels like it slides, release is the opener and stability is the fix — do not chase depth.',
  },
  calf: {
    notice: 'Knee-to-wall distance improves on the side you worked. The ankle feels like it has more to give.',
    release: 'On the mid-belly of the calf — not the Achilles, not the shin bone. While compressed, slowly point and flex the foot 8–10×. Work the tighter side first.',
    load: 'Bilateral heel raises ×15 slow, then lower on the weaker side alone ×8. Add seated bent-knee raises for the soleus.',
    careful: 'If either calf has been operated on or injured, release that side lightly or skip it. A weak calf needs strength, not length.',
  },
  lat: {
    careful: 'If a shoulder subluxes or feels unstable overhead, keep the feet partly on the ground during hangs until the scapular base is solid.',
  },
  pec: {
    careful: 'Do not force shoulders-back-chest-out. That retraction is the move that reproduces thoracic-outlet symptoms in people who have them — let the position come from underneath.',
  },
  'rg-calf': {
    careful: 'If either calf has been operated on or injured, go lighter on that side.',
  },
};

/* The section notes were written to one person, in the second person — "the
   lever you haven't touched", "nobody has mentioned it to you". The teaching
   in them is general; the address is not. Rewritten as statements about the
   work rather than about the reader. */
export const SECTION_NOTES = {
  breath: 'Breathing is upstream of most of it. Everything else on this list is downstream effect.',
  ribs: 'This works what pulls on the rib cage, not the cage itself.',
  airway: 'Myofunctional therapy. Real evidence for mild apnea and upper-airway resistance, and rarely offered.',
  balance: 'Proprioception training — the direct route to knowing where your body is and what it is doing.',
  vagal: 'Direct downregulation. Cheap, and most of it needs no equipment at all.',
};

