// make-icons.mjs — writes the app's icons as PNGs, with no image library.
//
// Why generate rather than commit a binary: the mark is nine lines of
// arithmetic in the app's own palette, so it can be re-cut at any size when
// the design changes, and nothing in the repo is a file nobody can edit.
//
// The mark: the day as blocks — three bars of a day, the one you are in
// picked out in sage. It reads at 48px, which is the only test that matters.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'src', 'icons');

const INK = [0x2b, 0x2a, 0x26];      // --ink, warm near-black
const PAPER = [0xf5, 0xf3, 0xee];    // --bg
const SAGE = [0x7f, 0xa3, 0x8f];     // --accent (dark-mode value: reads on ink)

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixel) {
  // One filter byte (0 = none) per row, then RGB triples.
  const raw = Buffer.alloc(size * (1 + size * 3));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size);
      raw[o++] = r; raw[o++] = g; raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Rounded-rect test, in unit coordinates. */
function insideRounded(x, y, size, inset, radius) {
  const lo = inset, hi = size - inset;
  if (x < lo || y < lo || x >= hi || y >= hi) return false;
  const cx = Math.min(Math.max(x, lo + radius), hi - radius);
  const cy = Math.min(Math.max(y, lo + radius), hi - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 || (x >= lo + radius && x < hi - radius) || (y >= lo + radius && y < hi - radius);
}

/**
 * @param maskable  true → the mark shrinks inside the safe circle and the
 *                  background bleeds to the edges, per the maskable spec.
 */
function mark(maskable) {
  return (x, y, size) => {
    const s = size;
    const pad = maskable ? s * 0.10 : 0;              // background inset
    const corner = maskable ? 0 : s * 0.22;           // iOS masks its own
    const onCanvas = maskable ? true : insideRounded(x, y, s, pad, corner);
    if (!onCanvas) return PAPER;

    // three bars, the middle one "now"
    const scale = maskable ? 0.62 : 0.76;             // maskable safe zone
    const w = s * scale, left = (s - w) / 2;
    const barH = s * 0.115, gap = s * 0.075;
    const totalH = barH * 3 + gap * 2, top = (s - totalH) / 2;
    for (let i = 0; i < 3; i++) {
      const t = top + i * (barH + gap);
      const width = i === 1 ? w : w * (i === 0 ? 0.72 : 0.86);
      if (y >= t && y < t + barH && x >= left && x < left + width) {
        // Quiet bars: paper mixed most of the way back into ink, per channel,
        // so they read as "the rest of the day" without competing with now.
        return i === 1 ? SAGE : PAPER.map((c, ch) => Math.round(c * 0.45 + INK[ch] * 0.55));
      }
    }
    return INK;
  };
}

const files = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];
for (const [name, size, maskable] of files) {
  writeFileSync(resolve(out, name), png(size, mark(maskable)));
  console.log(`wrote src/icons/${name} (${size}px${maskable ? ', maskable' : ''})`);
}
