import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell (JS/CSS/HTML) so the SPA itself loads with no
      // network at all after the first visit — this app's "services" layer
      // is mock/in-memory today (see src/services/adapter.ts), not real
      // fetch() calls, so there's no API traffic yet for Workbox runtime
      // caching to intercept. That line is commented below, ready for when
      // API_MODE switches to 'rest'.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'EcclesiaFlow',
        short_name: 'EcclesiaFlow',
        description: 'A calm, offline-ready church management companion.',
        theme_color: '#4338CA',
        background_color: '#FAFAF9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        // Lets `npm run dev` exercise the service worker too — offline
        // behavior is otherwise easy to "fix" in dev and still ship broken,
        // since `vite dev` normally has no SW at all.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@lib': resolve(__dirname, './src/lib'),
      '@mocks': resolve(__dirname, './src/mocks'),
      '@routes': resolve(__dirname, './src/routes'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'),
      '@design-system': resolve(__dirname, './src/design-system'),
    },
  },
  server: {
    port: 5173,
  },
});
