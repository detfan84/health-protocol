// Default movement & support items. Users can add/remove from this list.
// Each has: id, n (name), w (why), category for grouping.

export const DEFAULT_MOVEMENTS = [
  // Movement
  { id: 'walk', n: 'Movement 20–30 min', w: 'Lymph needs muscle movement — walk, bike, play, anything counts', category: 'movement' },
  { id: 'stretch', n: 'Stretch/yoga 10+ min', w: 'Circulation + stress reduction', category: 'movement' },
  { id: 'workout', n: 'Strength training', w: 'Build muscle, support metabolism, improve bone density', category: 'movement' },

  // Detox & Recovery
  { id: 'castor', n: 'Castor oil pack', w: 'Liver area, 30–60 min with heat — supports detox and inflammation', category: 'detox' },
  { id: 'sweat', n: 'Sweat session', w: 'Skin = detox organ — sauna, hot bath, or intense exercise', category: 'detox' },
  { id: 'cold', n: 'Cold exposure', w: 'Cold shower or plunge — reduces inflammation, boosts dopamine, builds resilience', category: 'detox' },
  { id: 'drybrush', n: 'Dry brushing', w: 'Stimulates lymphatic drainage, exfoliates skin, improves circulation', category: 'detox' },
  { id: 'enema', n: 'Coffee enema', w: 'Liver/gallbladder support — follow practitioner guidance', category: 'detox' },
  { id: 'oilpull', n: 'Oil pulling', w: 'Swish coconut oil 10–20 min — oral microbiome support', category: 'detox' },
  { id: 'cupping', n: 'Cupping', w: 'Increases blood flow, releases fascial tension, supports detox pathways', category: 'detox' },
  { id: 'acupressure', n: 'Acupressure / acupuncture', w: 'Stimulates meridian points — relieves pain, supports organ function, reduces stress', category: 'detox' },

  // Mind & Nervous System
  { id: 'breath', n: 'Deep breathing 5 min', w: 'Parasympathetic activation — calms fight-or-flight', category: 'mind' },
  { id: 'meditate', n: 'Meditation', w: 'Even 5 minutes reduces cortisol and improves focus', category: 'mind' },
  { id: 'journal', n: 'Gratitude / journaling', w: 'Mental clarity, emotional processing, stress reduction', category: 'mind' },
  { id: 'sunlight', n: 'Morning sunlight 10 min', w: 'Sets circadian rhythm, boosts vitamin D, improves sleep', category: 'mind' },
  { id: 'grounding', n: 'Grounding / earthing', w: 'Bare feet on earth — reduces inflammation, improves sleep', category: 'mind' },
  { id: 'screen', n: 'Screen-free wind-down', w: 'No screens 30–60 min before bed — protects melatonin production', category: 'mind' },

  // Sleep
  { id: 'sleephygiene', n: 'Sleep routine', w: 'Consistent bedtime, cool room, dark environment', category: 'sleep' },
  { id: 'bluelight', n: 'Blue light glasses (evening)', w: 'Protects melatonin production after sunset', category: 'sleep' },
];

// Category labels for display
export const MOVEMENT_CATEGORIES = [
  { id: 'movement', name: 'Movement' },
  { id: 'detox', name: 'Detox & Recovery' },
  { id: 'mind', name: 'Mind & Nervous System' },
  { id: 'sleep', name: 'Sleep' },
  { id: 'custom', name: 'Custom' },
];

// Legacy export for backward compat
export const MOVEMENTS = DEFAULT_MOVEMENTS;
