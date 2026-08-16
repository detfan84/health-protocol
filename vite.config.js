import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://<user>.github.io/health-protocol/, so every asset URL
// needs that prefix. import.meta.env.BASE_URL picks this up automatically.
const BASE = '/health-protocol/';

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
