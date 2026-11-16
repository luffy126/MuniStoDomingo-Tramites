import { useCallback, useRef, useState } from 'react';
import type { Pagina, Paginacion } from '../services/apiClient';
import { unirPaginas } from '../utils/paginacion';

/**
 * Estado de un listado paginado con "Cargar más".
 *
 * `cargar()` trae la página 1 (reemplaza lo que hubiera) y `cargarMas()` agrega la
 * siguiente mientras `pagination.hasNext`. `recargar()` hace lo mismo que `cargar()`
 * pero sin el spinner de pantalla completa (la lista sigue visible mientras tanto)
 * y devuelve una promesa, para el gesto de tirar hacia abajo. `actualizarEnSilencio()`
 * vuelve a pedir todas las páginas ya cargadas y las reemplaza sin spinner ni
 * avisos de error: es la recarga automática, que no debe mover al usuario. Una respuesta que llega tarde, después de
 * volver a llamar `cargar()` (p. ej. al cambiar de filtro), se descarta para que no
 * mezcle datos de dos consultas.
 *
 * @param cargarPagina Función memorizada con useCallback; si cambia, la pantalla debe volver a llamar `cargar()`.
 */
export const useListaPaginada = <T extends { id: string }>(cargarPagina: (page: number) => Promise<Pagina<T>>) => {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Paginacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const consulta = useRef(0);

  const pedirPrimera = useCallback((conSpinner: boolean): Promise<void> => {
    const mia = ++consulta.current;
    if (conSpinner) setCargando(true);
    setCargandoMas(false);
    setError('');
    return cargarPagina(1)
      .then((pagina) => {
        if (mia !== consulta.current) return;
        setItems(pagina.data);
        setPagination(pagina.pagination);
      })
      .catch((e: unknown) => {
        if (mia === consulta.current) setError(e instanceof Error ? e.message : 'No se pudo cargar la lista.');
      })
      .finally(() => {
        if (mia === consulta.current) setCargando(false);
      });
  }, [cargarPagina]);

  const cargar = useCallback((): void => { void pedirPrimera(true); }, [pedirPrimera]);
  const recargar = useCallback((): Promise<void> => pedirPrimera(false), [pedirPrimera]);

  const cargarMas = useCallback((): void => {
    if (!pagination?.hasNext || cargando || cargandoMas) return;
    const mia = consulta.current;
    setCargandoMas(true);
    cargarPagina(pagination.page + 1)
      .then((pagina) => {
        if (mia !== consulta.current) return;
        setItems((actuales) => unirPaginas(actuales, pagina.data));
        setPagination(pagina.pagination);
      })
      .catch((e: unknown) => {
        if (mia === consulta.current) setError(e instanceof Error ? e.message : 'No se pudo cargar más.');
      })
      .finally(() => {
        if (mia === consulta.current) setCargandoMas(false);
      });
  }, [cargarPagina, pagination, cargando, cargandoMas]);

  // Estado vivo para la actualización automática, que corre desde un temporizador.
  const estado = useRef({ pagination, cargando, cargandoMas });
  estado.current = { pagination, cargando, cargandoMas };

  const actualizarEnSilencio = useCallback(async (): Promise<void> => {
    const { pagination: actual, cargando: ocupada, cargandoMas: ocupadaMas } = estado.current;
    // Sin datos todavía o con otra carga en curso: esa carga ya trae lo nuevo.
    if (actual === null || ocupada || ocupadaMas) return;
    const mia = consulta.current;
    const paginas = Array.from({ length: Math.max(1, actual.page) }, (_, i) => i + 1);
    try {
      const resultado = await Promise.all(paginas.map((page) => cargarPagina(page)));
      // Si mientras tanto hubo un cargar(), un filtro nuevo o un "Cargar más", se descarta.
      if (mia !== consulta.current || estado.current.cargandoMas) return;
      setItems(resultado.reduce<T[]>((todos, pagina) => unirPaginas(todos, pagina.data), []));
      setPagination(resultado[resultado.length - 1].pagination);
    } catch {
      // Un fallo pasajero no se muestra: la próxima actualización lo reintenta.
    }
  }, [cargarPagina]);

  const limpiarError = useCallback((): void => setError(''), []);

  return {
    items, setItems, pagination, setPagination,
    cargando, cargandoMas, error, limpiarError, cargar, recargar, cargarMas, actualizarEnSilencio,
  };
};

