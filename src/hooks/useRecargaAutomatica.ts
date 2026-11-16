import { useEffect, useRef } from 'react';

/** Cada cuánto se actualiza una vista abierta y visible. */
export const INTERVALO_RECARGA_MS = 30_000;
/** Al volver a la pestaña no se repite una actualización hecha hace menos de esto. */
const MINIMO_ENTRE_RECARGAS_MS = 5_000;

const visible = (): boolean => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/**
 * Mantiene al día una vista sin que el usuario tenga que recargar: llama a
 * `actualizar` cada `intervalo` mientras la vista esté activa y la pestaña del
 * navegador visible, y apenas el usuario vuelve a la pestaña.
 *
 * Con la pestaña en segundo plano se detiene (no gasta batería ni peticiones).
 * Nunca hay dos actualizaciones a la vez: si una tarda, la siguiente se salta.
 *
 * @param activa Si la vista está en pantalla (en Ionic las páginas siguen montadas al cambiar de pestaña).
 * @param actualizar Recarga silenciosa: sin spinner y sin avisos de error.
 */
export const useRecargaAutomatica = (
  activa: boolean,
  actualizar: () => Promise<unknown>,
  intervalo: number = INTERVALO_RECARGA_MS,
): void => {
  // La función más reciente, sin reiniciar el temporizador cada vez que cambia.
  const actualizarRef = useRef(actualizar);
  actualizarRef.current = actualizar;

  useEffect(() => {
    if (!activa) return undefined;

    let enCurso = false;
    // Al activarse la vista ya se cargó (useCargarAlEntrar): cuenta como reciente.
    let ultima = Date.now();
    let temporizador: number | undefined;

    const ejecutar = (): void => {
      if (enCurso || !visible()) return;
      enCurso = true;
      ultima = Date.now();
      void actualizarRef.current()
        .catch(() => undefined)
        .finally(() => { enCurso = false; });
    };

    const iniciar = (): void => {
      window.clearInterval(temporizador);
      temporizador = window.setInterval(ejecutar, intervalo);
    };

    const alCambiarVisibilidad = (): void => {
      if (!visible()) {
        window.clearInterval(temporizador);
        return;
      }
      if (Date.now() - ultima >= MINIMO_ENTRE_RECARGAS_MS) ejecutar();
      iniciar();
    };

    if (visible()) iniciar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('focus', alCambiarVisibilidad);
    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('focus', alCambiarVisibilidad);
    };
  }, [activa, intervalo]);
};
