/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/round_bell/ — must match the repo name.
const base = '/round_bell/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
      manifest: {
        name: 'RoundBell',
        short_name: 'RoundBell',
        description: 'Ad-free round timer for boxing and interval training',
        theme_color: '#0F0F12',
        background_color: '#0F0F12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
