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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(appDir, 'dist');

// Everything the browser loads, starting from index.html.
const SHIPPED = ['index.html', 'src'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of SHIPPED) {
  await cp(resolve(appDir, entry), resolve(dist, entry), { recursive: true });
}
console.log(`staged ${SHIPPED.join(', ')} -> dist/`);
