// Copies just the files a browser should ever see into dist/.
//
// Why this exists: the app folder also holds tests, a package.json and a
// node_modules tree. Cloudflare's documented .assetsignore did not exclude
// them in practice, and "upload everything and hope" is not a safe default
// for a health app. So instead of subtracting what must not ship, this adds
// only what must — the same idea as the rest of this app: fail closed.
//
// This is a copy, not a build. Nothing is compiled, minified or transformed.

import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(appDir, 'dist');

// Everything the browser loads, starting from index.html.
// Personal protocol files are deliberately NOT here: this app is meant to be
// shareable, and nobody opening it should land in somebody else's regimen.
//
// sw.js and manifest.webmanifest must sit at the ROOT of what is served: a
// service worker can only control the paths at or below its own URL, and the
// manifest's start_url is resolved against where it is served from. Icons ride
// along inside src/.
const SHIPPED = ['index.html', 'manifest.webmanifest', 'sw.js', 'src'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of SHIPPED) {
  await cp(resolve(appDir, entry), resolve(dist, entry), { recursive: true });
}
// Fail closed: a missing file here means a deploy that half-works, which is
// worse than one that stops.
for (const entry of SHIPPED) {
  if (!existsSync(resolve(dist, entry))) {
    console.error(`stage-dist: "${entry}" did not make it into dist/ — refusing to call this staged.`);
    process.exit(1);
  }
}
console.log(`staged ${SHIPPED.join(', ')} -> dist/`);
