// Copies just the files a browser should ever see into dist/.
//
// Why this exists: the app folder also holds tests, a package.json and a
// node_modules tree. Cloudflare's documented .assetsignore did not exclude
// them in practice, and "upload everything and hope" is not a safe default
// for a health app. So instead of subtracting what must not ship, this adds
// only what must — the same idea as the rest of this app: fail closed.
//
// This is a copy, not a build. Nothing is compiled, minified or transformed.

import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
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
// src/ carries the app AND its content: src/content/starter.json plus the
// body-work photographs. If content ever moves out of src/, add it here or it
// silently will not deploy — which is exactly how the app shipped empty.

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of SHIPPED) {
  await cp(resolve(appDir, entry), resolve(dist, entry), { recursive: true });
}
// Stamp the build. Every deploy gets an identifier the app can show and a
// cache name the service worker cannot confuse with the last one — the two
// things that make "it looks the same on my phone" answerable.
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13) + 'Z';
let sha = '';
try {
  sha = execSync('git rev-parse --short HEAD', { cwd: appDir }).toString().trim();
} catch { /* not a git checkout; the timestamp alone still identifies it */ }
const build = sha ? `${stamp}-${sha}` : stamp;

const buildFile = resolve(dist, 'src/lib/build.js');
await writeFile(buildFile, (await readFile(buildFile, 'utf8')).replace("export const BUILD = 'dev';", `export const BUILD = '${build}';`));

const swFile = resolve(dist, 'sw.js');
await writeFile(swFile, (await readFile(swFile, 'utf8')).replace("const CACHE = 'protocol-shell';", `const CACHE = 'shell-${build}';`));
console.log(`stamped build ${build}`);

// Fail closed: a missing file here means a deploy that half-works, which is
// worse than one that stops.
for (const entry of SHIPPED) {
  if (!existsSync(resolve(dist, entry))) {
    console.error(`stage-dist: "${entry}" did not make it into dist/ — refusing to call this staged.`);
    process.exit(1);
  }
}
console.log(`staged ${SHIPPED.join(', ')} -> dist/`);
