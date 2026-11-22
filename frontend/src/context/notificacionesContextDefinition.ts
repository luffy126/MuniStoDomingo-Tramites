import { createContext } from 'react';

export interface NotificacionesContexto {
  /** Total de no leídas en todas las páginas. */
  sinLeer: number;
  refrescar: () => Promise<void>;
  actualizarSinLeer: (cantidad: number) => void;
}

export const NotificacionesContext = createContext<NotificacionesContexto | null>(null);
