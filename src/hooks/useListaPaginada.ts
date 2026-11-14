import { useCallback, useRef, useState } from 'react';
import type { Pagina, Paginacion } from '../services/apiClient';
import { unirPaginas } from '../utils/paginacion';

/**
 * Estado de un listado paginado con "Cargar más".
 *
 * `cargar()` trae la página 1 (reemplaza lo que hubiera) y `cargarMas()` agrega la
 * siguiente mientras `pagination.hasNext`. Una respuesta que llega tarde, después de
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

  const cargar = useCallback((): void => {
    const mia = ++consulta.current;
    setCargando(true);
    setCargandoMas(false);
    setError('');
    cargarPagina(1)
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

  const limpiarError = useCallback((): void => setError(''), []);

  return {
    items, setItems, pagination, setPagination,
    cargando, cargandoMas, error, limpiarError, cargar, cargarMas,
  };
};

