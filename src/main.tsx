import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { instalarRecargaPorVersion } from './utils/recargaPorVersion';

// Antes de montar: si quedó cargada una versión anterior del sitio, se recarga sola.
instalarRecargaPorVersion();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);