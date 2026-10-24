import apiClient, { ApiError } from './apiClient';

export type CategoriaTramite = 'certificados' | 'permisos' | 'reclamos' | 'solicitudes';
export type EstadoSolicitud = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface Tramite {
  id: string;
  nombre: string;
  categoria: CategoriaTramite;
  descripcion: string;
  requisitos: string[];
  icono: string;
}

export interface Solicitud {
  id: string;
  tramiteId: string;
  vecinoNombre: string;
  fecha: string;
  estado: EstadoSolicitud;
  observaciones?: string;
}

export interface NuevaSolicitud {
  tramiteId: string;
  vecinoNombre: string;
  observaciones?: string;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

interface BackendTramite extends Omit<Tramite, 'requisitos'> {
  requisitos?: string[];
}

interface BackendSolicitud {
  id: string;
  tramiteId: string;
  vecinoNombre: string;
  fecha: string;
  estado: EstadoSolicitud;
  observaciones?: string | null;
}

interface BackendNotificacion extends Omit<Notificacion, 'id'> {
  id: string | number;
}

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const COLOR_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'warning',
  en_revision: 'secondary',
  aprobado: 'success',
  rechazado: 'danger',
};

export const ETIQUETA_CATEGORIA: Record<CategoriaTramite, string> = {
  certificados: 'Certificados',
  permisos: 'Permisos',
  reclamos: 'Reclamos',
  solicitudes: 'Solicitudes',
};

const adaptarTramite = (tramite: BackendTramite): Tramite => ({
  ...tramite,
  id: String(tramite.id),
  requisitos: tramite.requisitos ?? [],
});

const adaptarSolicitud = (solicitud: BackendSolicitud): Solicitud => ({
  id: String(solicitud.id),
  tramiteId: String(solicitud.tramiteId),
  vecinoNombre: solicitud.vecinoNombre,
  fecha: solicitud.fecha.slice(0, 10),
  estado: solicitud.estado,
  ...(solicitud.observaciones ? { observaciones: solicitud.observaciones } : {}),
});

const adaptarNotificacion = (notificacion: BackendNotificacion): Notificacion => ({
  ...notificacion,
  id: String(notificacion.id),
  fecha: notificacion.fecha.slice(0, 10),
});

export const getTramites = async (): Promise<Tramite[]> =>
  (await apiClient.get<BackendTramite[]>('/api/tramites')).map(adaptarTramite);

export const buscarTramites = async (termino: string): Promise<Tramite[]> => {
  const tramites = await getTramites();
  const query = termino.trim().toLowerCase();
  if (!query) return tramites;
  return tramites.filter(
    (tramite) =>
      tramite.nombre.toLowerCase().includes(query) ||
      tramite.descripcion.toLowerCase().includes(query) ||
      ETIQUETA_CATEGORIA[tramite.categoria].toLowerCase().includes(query),
  );
};

export const getTramiteById = async (id: string): Promise<Tramite | undefined> => {
  try {
    return adaptarTramite(await apiClient.get<BackendTramite>(`/api/tramites/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
};

export const getSolicitudes = async (estado?: EstadoSolicitud): Promise<Solicitud[]> => {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return (await apiClient.get<BackendSolicitud[]>(`/api/solicitudes${query}`)).map(adaptarSolicitud);
};

export const getSolicitudesPorVecino = async (_vecinoNombre: string): Promise<Solicitud[]> =>
  getSolicitudes();

export const getSolicitudById = async (folio: string): Promise<Solicitud | undefined> => {
  try {
    return adaptarSolicitud(
      await apiClient.get<BackendSolicitud>(`/api/solicitudes/${encodeURIComponent(folio)}`),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
};

export const crearSolicitud = async (data: NuevaSolicitud): Promise<Solicitud> =>
  adaptarSolicitud(
    await apiClient.post<BackendSolicitud>('/api/solicitudes', {
      tramiteId: data.tramiteId,
      ...(data.observaciones ? { observaciones: data.observaciones } : {}),
    }),
  );

export const actualizarEstadoSolicitud = async (
  folio: string,
  estado: EstadoSolicitud,
  observaciones?: string,
): Promise<Solicitud> =>
  adaptarSolicitud(
    await apiClient.patch<BackendSolicitud>(`/api/solicitudes/${encodeURIComponent(folio)}`, {
      estado,
      ...(observaciones === undefined ? {} : { observaciones }),
    }),
  );

export const getNotificaciones = async (): Promise<Notificacion[]> =>
  (await apiClient.get<BackendNotificacion[]>('/api/notificaciones')).map(adaptarNotificacion);

export const marcarNotificacionLeida = async (id: string): Promise<void> => {
  await apiClient.patch<{ message: string }>(`/api/notificaciones/${encodeURIComponent(id)}`);
};

export const getResumenPorEstado = async (): Promise<Record<EstadoSolicitud, number>> =>
  apiClient.get<Record<EstadoSolicitud, number>>('/api/solicitudes/reportes');
