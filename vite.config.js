import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png'],
      manifest: {
        name: 'Web Info Share',
        short_name: 'InfoShare',
        description: 'Blockchain-based P2P information sharing rooms.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gun-manhattan\.herokuapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gun-relay-cache',
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: /^https:\/\/peer\.warpgun\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gun-relay-cache-2',
              networkTimeoutSeconds: 5
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2020',
    sourcemap: false
  },
  server: {
    port: 5173,
    host: true
  }
});
