/**
 * Recupera la app cuando quedó cargada una versión anterior del sitio.
 *
 * Cada compilación cambia el nombre de los archivos de `assets/` (por ejemplo
 * los componentes de Ionic, que se cargan bajo demanda). Si una pestaña abierta
 * o un `index.html` guardado en caché pide un archivo de la versión anterior, ya
 * no existe: la carga falla y la app quedaría congelada en el spinner hasta un
 * refresco forzado. Aquí se detecta ese fallo y se recarga la página una vez,
 * que trae el `index.html` nuevo con los nombres actuales.
 */

const CLAVE = 'muni-recarga-por-version';
/** Si ya se recargó hace menos de esto, no se insiste: evita un ciclo de recargas. */
const ESPERA_MS = 30_000;

/** Mensajes con que los navegadores informan un `import()` dinámico que falló. */
const ES_ERROR_DE_CARGA =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|is not a valid JavaScript MIME type/i;

/**
 * Recarga la página salvo que ya se haya recargado por este motivo hace poco.
 *
 * @returns true si pidió la recarga.
 */
export const recargarUnaVez = (
  ahora: number = Date.now(),
  almacen: Pick<Storage, 'getItem' | 'setItem'> | null = obtenerAlmacen(),
  recargar: () => void = () => window.location.reload(),
): boolean => {
  const ultima = Number(almacen?.getItem(CLAVE) ?? 0);
  if (ahora - ultima < ESPERA_MS) return false;
  almacen?.setItem(CLAVE, String(ahora));
  recargar();
  return true;
};

/** Indica si un error corresponde a un archivo de la app que no se pudo cargar. */
export const esErrorDeCarga = (error: unknown): boolean => {
  const mensaje = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return ES_ERROR_DE_CARGA.test(mensaje);
};

function obtenerAlmacen(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Instala los avisos. Se llama una sola vez, antes de montar la app. */
export const instalarRecargaPorVersion = (): void => {
  // Vite emite este evento cuando falla la carga de un archivo de la app.
  window.addEventListener('vite:preloadError', (evento) => {
    if (recargarUnaVez()) evento.preventDefault();
  });

  // Respaldo: un import() que falló sin pasar por Vite (p. ej. el cargador de Ionic).
  window.addEventListener('unhandledrejection', (evento) => {
    if (esErrorDeCarga(evento.reason)) recargarUnaVez();
  });
};
