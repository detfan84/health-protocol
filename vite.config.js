import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// This app is served from TWO places, at different paths:
//
//   Vercel (primary, the installed phone app):
//     https://health-protocol-theta.vercel.app/   -> base '/'
//   GitHub Pages (secondary):
//     https://detfan84.github.io/health-protocol/ -> base '/health-protocol/'
//
// Vercel auto-deploys from this repo, so a hardcoded subpath base breaks the
// primary deployment: index.html asks for /health-protocol/assets/... which
// does not exist at the domain root, every asset 404s, and the app is a blank
// screen. Only the Pages workflow sets DEPLOY_TARGET, so the default stays
// correct for Vercel and for local dev.
const BASE = process.env.DEPLOY_TARGET === 'github-pages' ? '/health-protocol/' : '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        // jpg is not in workbox's default precache patterns. The body work
        // photos live in public/bodywork-images/ and the whole point is that
        // they work with no network, so they have to be precached explicitly.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,webmanifest}'],
        // Delete precaches from previous builds instead of leaving them to
        // accumulate. A stale precache serving an old index.html against new
        // asset hashes is exactly how you get a permanently blank screen.
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Protocol Tracker',
        short_name: 'Protocol',
        description: 'Personal health protocol tracker',
        theme_color: '#2D5016',
        background_color: '#faf9f7',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
