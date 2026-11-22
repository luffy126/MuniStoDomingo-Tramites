import { useContext } from 'react';
import { NotificacionesContext } from '../context/notificacionesContextDefinition';
import type { NotificacionesContexto } from '../context/notificacionesContextDefinition';

export const useNotificaciones = (): NotificacionesContexto => {
  const contexto = useContext(NotificacionesContext);
  if (contexto === null) {
    throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  }
  return contexto;
};
