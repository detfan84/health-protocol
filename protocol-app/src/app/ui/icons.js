// icons.js — a small set of line icons, drawn rather than downloaded.
//
// Every one is a single SVG path on a 24-grid, stroked with currentColor, so
// an icon takes the colour of whatever it sits in and costs nothing to ship.
// No icon font, no sprite sheet, no third-party set with a licence to track.
//
// They exist to make a menu scannable at a glance — a wall of identical text
// tiles is the thing this is fixing — not to decorate.

const PATHS = {
  // a sun just clearing the horizon
  sunrise: 'M12 3v5M5.6 10.6 4.2 9.2M18.4 10.6l1.4-1.4M3 17h18M7 17a5 5 0 0 1 10 0',
  // a moon
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  // hands pressing — body work
  hands: 'M9 11V6a1.5 1.5 0 0 1 3 0v5M12 11V5a1.5 1.5 0 0 1 3 0v6M15 11V7a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0',
  // lungs / breath
  breath: 'M12 4v9M8.5 8C6 9 4.5 11 4.5 14v4a2 2 0 0 0 3.4 1.4L11 16M15.5 8c2.5 1 4 3 4 6v4a2 2 0 0 1-3.4 1.4L13 16',
  // a dumbbell
  strength: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  // a walking figure
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-.01M12 21l1-6-3-3 1-5 3 2 2 2M10 12l-2 4M13 15l3 3',
  // a ruler — measured self-tests
  measure: 'M3 8h18v8H3zM7 8v3M11 8v4M15 8v3M19 8v4',
  // stacked shelves — the library
  library: 'M4 5h16M4 12h16M4 19h16M8 5v7M16 12v7',
  // a plate
  food: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8v8M9 11h6',
  // a book — reference
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 5.5v15',
  // a pencil — logging
  pencil: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z',
  // a list
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
};

/** @param name a key of PATHS; anything unknown draws nothing rather than a box. */
export function icon(name, { size = 24 } = {}) {
  const d = PATHS[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  if (d) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export const ICON_NAMES = Object.keys(PATHS);
