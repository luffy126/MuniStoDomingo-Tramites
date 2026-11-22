/*
 * Service worker del MVP: solo el "shell" de la aplicación.
 *
 * Regla de seguridad: NINGUNA petición a /api pasa por caché. Las respuestas
 * autenticadas (perfil, solicitudes, notificaciones, documentos) siempre van a
 * la red, para no filtrar datos de un vecino a otro ni mostrar información
 * desactualizada tras un cambio de sesión.
 */
const CACHE = 'munisd-shell-v2';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/logo-municipal.png',
  '/logo-municipal-transparente.png',
  '/fonts/montserrat-latin.woff2',
  '/fonts/poppins-500-latin.woff2',
  '/fonts/poppins-600-latin.woff2',
  '/fonts/poppins-700-latin.woff2',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves
          .filter((clave) => clave.startsWith('munisd-shell-') && clave !== CACHE)
          .map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const solicitud = event.request;
  if (solicitud.method !== 'GET') return;

  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // Network-only, sin caché.

  // Navegación: network-first para tomar el index.html nuevo en cada despliegue;
  // si no hay red, se sirve el último shell guardado.
  if (solicitud.mode === 'navigate') {
    event.respondWith(
      fetch(solicitud)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            void caches.open(CACHE).then((cache) => cache.put('/index.html', copia));
          }
          return respuesta;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets del shell (JS, CSS, íconos, fuentes locales): cache-first.
  if (['script', 'style', 'image', 'font'].includes(solicitud.destination)) {
    event.respondWith(
      caches.match(solicitud).then((guardado) => guardado ?? fetch(solicitud).then((respuesta) => {
        if (respuesta.ok && respuesta.type === 'basic') {
          const copia = respuesta.clone();
          void caches.open(CACHE).then((cache) => cache.put(solicitud, copia));
        }
        return respuesta;
      }))
    );
  }
});
