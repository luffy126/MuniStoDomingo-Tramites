import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import { instalarRecargaPorVersion } from './utils/recargaPorVersion';

// Antes de montar: si quedó cargada una versión anterior del sitio, se recarga sola.
instalarRecargaPorVersion();

/** El service worker solo se activa en el build instalable; en dev estorba al HMR. */
const registrarServiceWorker = (): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si el navegador lo bloquea, la app sigue funcionando en línea.
    });
  });
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

registrarServiceWorker();