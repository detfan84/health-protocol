// Palette tests — the two properties that are claims about physics rather than
// taste, and are therefore checkable.
//
// Kevin, 29 Aug: "if someone gets up at 4, 5, 6am they don't want to be blasted
// with a near white screen" and "maybe it would be helpful to intentionally
// avoid blue light."
//
// Both of those are about NUMBERS, and both were being asserted in prose. A
// theme called "warm dark" can drift a shade at a time until its body text is
// near-white again and nobody notices, because every individual change looks
// fine next to the last one. So the ceiling is written down here.
//
// Nothing here has an opinion about which palette is nicer. It checks that the
// ones claiming to be dim are dim, that the ones claiming to be warm are warm,
// and that neither claim was bought by making the text unreadable.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/design.css', import.meta.url), 'utf8');

/** Every `--token: #hex` in a `:root[data-scheme='name']` block. */
function scheme(name) {
  const block = new RegExp(`:root\\[data-scheme='${name}'\\]\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(block, `no scheme called "${name}" in design.css`);
  const out = {};
  for (const m of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** WCAG relative luminance — how much light the colour actually puts out. */
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Blue's share of a colour. Neutral grey is exactly 1/3 — below that is warm. */
function blueShare(hex) {
  const [r, g, b] = rgb(hex);
  return r + g + b === 0 ? 1 / 3 : b / (r + g + b);
}

test('Desert night is dim at the top, which is the whole point of it', () => {
  const p = scheme('desert');

  // The brightest thing on screen is body text, and in every other dark theme
  // here that is a near-white. #e7e5de — the built-in dark ink — sits at .78.
  const brightest = Math.max(...Object.values(p).map(luminance));
  assert.ok(
    brightest <= 0.6,
    `something in Desert night is brighter than a mid tone (${brightest.toFixed(2)}) — ` +
    'a 5am screen is judged by its lightest pixel, not its darkest',
  );

  // Dim must not have been bought with unreadable. 7:1 is AAA for body text and
  // there is a lot of headroom below the ceiling above.
  const readable = contrast(p['--ink'], p['--bg']);
  assert.ok(readable >= 7, `ink on ground is only ${readable.toFixed(1)}:1`);
  assert.ok(contrast(p['--ink-muted'], p['--bg']) >= 4.5, 'muted text has to survive being muted');
  // The one filled button in the app carries a label on the accent.
  assert.ok(contrast(p['--accent-ink'], p['--accent']) >= 4.5, 'the Start label on the Start button');
});

test('the warm schemes are warm by measurement, not by name', () => {
  // A neutral grey is exactly one third blue. Anything at or above that is grey
  // with a story attached.
  for (const name of ['desert', 'dusk']) {
    const p = scheme(name);
    const share = blueShare(p['--bg']);
    assert.ok(share < 1 / 3, `${name}'s ground is ${(share * 100).toFixed(1)}% blue — that is grey or cooler`);
  }
  // Desert is the one that claims to avoid blue light specifically, so it is
  // held to more than "not cool".
  assert.ok(blueShare(scheme('desert')['--bg']) < 0.29, 'Desert night should be markedly warm, not marginally');
});

test('a scheme colours the whole surface, not just the button', () => {
  // Kevin, 29 Aug, rejecting the first four proposals: "nearly the same thing
  // with a different color button. The colors should be throughout the theme."
  // So the ground, the raised surface and the rules must all carry the hue —
  // if they are neutral, the theme is a grey app with a coloured accent.
  const p = scheme('desert');
  for (const token of ['--bg', '--surface', '--surface-2', '--line', '--ink', '--ink-muted']) {
    const hex = p[token];
    assert.ok(hex, `Desert night does not set ${token}`);
    const [r, , b] = rgb(hex);
    assert.ok(r > b, `${token} (${hex}) has as much blue as red — that is a neutral wearing a theme`);
  }
});
