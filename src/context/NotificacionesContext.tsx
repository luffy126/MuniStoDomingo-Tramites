import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRecargaAutomatica } from '../hooks/useRecargaAutomatica';
import { getNotificacionesPagina } from '../services/tramiteService';
import { NotificacionesContext } from './notificacionesContextDefinition';

/**
 * Mantiene el contador de notificaciones sin leer para la barra de pestañas.
 * Se monta solo dentro de la sesión del vecino y nunca cachea el contenido.
 */
export const NotificacionesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sinLeer, setSinLeer] = useState(0);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      const pagina = await getNotificacionesPagina(1, 1);
      setSinLeer(pagina.pagination.unread ?? 0);
    } catch {
      // Es un contador secundario: si falla, la página de notificaciones muestra el error real.
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);
  useRecargaAutomatica(true, cargar);

  const valor = useMemo(
    () => ({ sinLeer, refrescar: cargar, actualizarSinLeer: setSinLeer }),
    [sinLeer, cargar],
  );

  return <NotificacionesContext.Provider value={valor}>{children}</NotificacionesContext.Provider>;
};
