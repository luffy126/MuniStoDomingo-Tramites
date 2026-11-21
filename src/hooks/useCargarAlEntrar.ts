import { useEffect, useRef } from 'react';
import { useMatch } from 'react-router-dom';

/**
 * Ejecuta `cargar` cuando la vista asociada a `ruta` entra por primera vez y
 * cuando cambian sus dependencias (filtros, `:id`, etc.).
 *
 * Al volver a una pestaña ya visitada usa `alVolver`, que por defecto es la
 * misma carga completa. Los listados pasan su `recargar` silencioso: así el
 * usuario recupera datos frescos sin volver a ver el esqueleto de carga cada
 * vez que cambia de pestaña.
 *
 * Reemplaza al hook de Ionic para `ionViewWillEnter`: en Ionic React Router
 * 9.0.4 el cambio de pestaña dentro de `IonTabs` no lo despacha, y las páginas
 * siguen montadas, así que un `useEffect` de montaje tampoco recarga. Se usa la
 * ruta activa de React Router, que sí cambia en todos los casos.
 *
 * La referencia evita una segunda carga cuando React.StrictMode ejecuta dos
 * veces los efectos en desarrollo.
 *
 * @param ruta Patrón de la ruta, p. ej. '/vecino/mis-tramites'.
 * @param cargar Carga completa, con spinner si la vista lo necesita.
 * @param alVolver Actualización al reentrar; por defecto, `cargar`.
 */
export const useCargarAlEntrar = (
  ruta: string,
  cargar: () => void,
  alVolver: () => void = cargar,
): void => {
  const activa = useMatch(ruta) !== null;
  const estado = useRef({
    activa,
    cargar,
    alVolver,
    iniciado: false,
    ultimoCargar: cargar,
  });

  // Las callbacks se leen del ref para no disparar recargas por identidad sola.
  estado.current.cargar = cargar;
  estado.current.alVolver = alVolver;

  useEffect(() => {
    const actual = estado.current;
    const cambioDeRuta = activa !== actual.activa;
    actual.activa = activa;

    if (!activa) return;

    if (!actual.iniciado) {
      actual.iniciado = true;
      actual.ultimoCargar = cargar;
      cargar();
      return;
    }

    if (cambioDeRuta) {
      actual.ultimoCargar = cargar;
      alVolver();
      return;
    }

    if (actual.ultimoCargar !== cargar) {
      actual.ultimoCargar = cargar;
      cargar();
    }
  }, [activa, cargar, alVolver]);
};
