/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
   // host de prueba para pasar la pag facilmente
    allowedHosts: ['ingweb.simonholic.sbs'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
