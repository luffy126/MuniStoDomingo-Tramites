import { useEffect, useRef } from 'react';
import { useMatch } from 'react-router-dom';

/**
 * Ejecuta `cargar` cada vez que la vista asociada a `ruta` pasa a estar activa.
 *
 * Reemplaza al hook de Ionic para el evento ionViewWillEnter: en Ionic React
 * Router 9.0.4 el cambio de pestaña dentro de IonTabs no lo despacha, y las páginas de las
 * pestañas siguen montadas, así que un useEffect de montaje tampoco recarga.
 * Se usa la ruta activa de React Router, que sí cambia en todos los casos
 * (pestañas, navigate() y recarga).
 *
 * La referencia evita una segunda carga cuando React.StrictMode ejecuta dos
 * veces los efectos en desarrollo; si `cargar` cambia (otro :id), se recarga.
 *
 * @param ruta Patrón de la ruta, p. ej. '/vecino/mis-tramites' o '/funcionario/solicitud/:id'.
 * @param cargar Función de carga memorizada con useCallback.
 */
export const useCargarAlEntrar = (ruta: string, cargar: () => void): void => {
  const activa = useMatch(ruta) !== null;
  const ultimaCarga = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!activa) {
      ultimaCarga.current = null;
      return;
    }
    if (ultimaCarga.current === cargar) return;
    ultimaCarga.current = cargar;
    cargar();
  }, [activa, cargar]);
};
