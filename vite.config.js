import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative by default, so one build works wherever it lands: a domain root,
// a project subpath like GitHub Pages' /model-spread/, or dist/index.html
// opened straight off the disk. An absolute '/assets/...' resolves against
// the filesystem root in that last case, and the page comes up blank. A host
// that needs an absolute base can still set VITE_BASE_PATH.
//
// The manifest's scope/start_url below are derived from it either way — an
// installed app whose start_url sits outside its scope opens in a browser tab
// instead of standalone. Relative values there resolve against the manifest's
// own URL, which is the same answer without having to be told the path.
const base = process.env.VITE_BASE_PATH ?? './'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'BestCast — a forecast, and how sure it is',
        short_name: 'BestCast',
        description: 'A local forecast with its uncertainty shown: rain, chance of rain, temperature and wind, day by day and hour by hour.',
        // The installed shortcut needs one fixed language; the app itself
        // switches between Vietnamese, English and Japanese at runtime.
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        // The splash screen and title bar of the installed app open in the
        // clear-day sky the forecast screen starts from.
        background_color: '#1b5fae',
        theme_color: '#1b5fae',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Map tiles and forecasts are the two things worth having when the
        // network is gone. Both are cached with a network-first strategy: a
        // live answer when there is signal, the last good one when there is
        // not — which is exactly the situation this app is for.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'forecast-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // The two heavy libraries get chunks of their own, so an app edit
        // doesn't invalidate them in installed users' caches. Both are loaded
        // on demand — the map when someone chooses on it, the charts when they
        // are opened — so neither is in the first download.
        //
        // React gets a chunk of its own too, and that is what keeps the other
        // two lazy: Rollup places any dependency of a manual chunk that has
        // no chunk of its own INSIDE it, so React ended up in the chart chunk
        // and the app's entry had to import — and preload — the whole chart
        // and map libraries just to reach it.
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          if (/node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/.test(id)) return 'leaflet'
          if (/node_modules[\\/](chart\.js|react-chartjs-2|@kurkle)[\\/]/.test(id)) return 'charts'
          return undefined
        },
      },
    },
  },
})
