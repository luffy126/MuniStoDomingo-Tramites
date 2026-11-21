/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
/**
 * Cabeceras de seguridad del documento HTML (desarrollo y preview).
 *
 * `script-src` admite `'unsafe-inline'` y `data:` a propósito: el shell de arranque
 * en index.html (que evita el destello de tema) y el legado de Ionic inyectan scripts
 * inline y `data:`. Con `'unsafe-inline'` ya presente, `data:` no abre un vector nuevo
 * frente a inyección de HTML. El resto de las directivas sí restringen. En producción
 * el proxy inverso debe replicar estas cabeceras.
 */
const CABECERAS_SEGURIDAD = {
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; " +
    "form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:; script-src 'self' 'unsafe-inline' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const PROXY_API = {
  '/api': {
    target: process.env.BACKEND_URL || 'http://localhost:3000',
    changeOrigin: true,
    xfwd: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: PROXY_API,
    headers: CABECERAS_SEGURIDAD,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    proxy: PROXY_API,
    headers: CABECERAS_SEGURIDAD,
   // host de prueba para pasar la pag facilmente
    allowedHosts: ['ingweb.simonholic.sbs'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
