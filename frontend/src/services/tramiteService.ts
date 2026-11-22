import apiClient, { ApiError } from './apiClient';
import type { Pagina } from './apiClient';
import { LIMITE_DOCUMENTO_BYTES, LIMITE_DOCUMENTOS } from '../utils/documentos';

export { LIMITE_DOCUMENTO_BYTES, LIMITE_DOCUMENTOS };

export type CategoriaTramite = 'certificados' | 'permisos' | 'reclamos' | 'solicitudes';
export type EstadoSolicitud = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
export type PrioridadSolicitud = 'baja' | 'media' | 'alta' | 'urgente';

export interface EventoHistorial {
  id: string;
  estadoAnterior: EstadoSolicitud | 'cancelada' | null;
  estadoNuevo: EstadoSolicitud | 'cancelada';
  actorNombre: string;
  observaciones?: string;
  fecha: string;
}

export interface Tramite {
  id: string;
  nombre: string;
  categoria: CategoriaTramite;
  descripcion: string;
  requisitos: string[];
  /** Requisitos con su tipo; los de tipo 'documento' se adjuntan al iniciar el trámite. */
  requisitosDetalle: RequisitoDetalle[];
  icono: string;
}

export interface RequisitoDetalle {
  id: string;
  descripcion: string;
  tipo: 'documento' | 'dato';
  obligatorio: boolean;
}

export interface Solicitud {
  id: string;
  tramiteId: string;
  tramiteNombre: string;
  vecinoNombre: string;
  fecha: string;
  estado: EstadoSolicitud;
  prioridad: PrioridadSolicitud;
  fechaLimite?: string;
  fechaResolucion?: string;
  observaciones?: string;
  historial?: EventoHistorial[];
}

export interface NuevaSolicitud {
  tramiteId: string;
  observaciones?: string;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  /** Folio de la solicitud relacionada, si el aviso viene de un trámite. */
  folio?: string;
}

export interface DocumentoSolicitud {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  fecha: string;
  subidoPor: string | null;
  requisitoId?: string;
  requisito?: string;
}

export const TIPOS_DOCUMENTO_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png'];

interface BackendTramite extends Omit<Tramite, 'requisitos' | 'requisitosDetalle'> {
  requisitos?: string[];
  requisitosDetalle?: RequisitoDetalle[];
}

interface BackendSolicitud {
  id: string;
  tramiteId: string;
  tramiteNombre: string;
  vecinoNombre: string;
  fecha: string;
  estado: EstadoSolicitud;
  prioridad: PrioridadSolicitud;
  fechaLimite?: string | null;
  fechaResolucion?: string | null;
  observaciones?: string | null;
  historial?: Array<{
    id: string;
    estadoAnterior: EventoHistorial['estadoAnterior'];
    estadoNuevo: EventoHistorial['estadoNuevo'];
    actorNombre: string;
    observaciones?: string | null;
    fecha: string;
  }>;
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

export const ETIQUETA_PRIORIDAD: Record<PrioridadSolicitud, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const COLOR_PRIORIDAD: Record<PrioridadSolicitud, string> = {
  baja: 'medium',
  media: 'primary',
  alta: 'warning',
  urgente: 'danger',
};

export const PRIORIDADES: PrioridadSolicitud[] = ['baja', 'media', 'alta', 'urgente'];

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
  requisitosDetalle: tramite.requisitosDetalle ?? [],
});

const adaptarSolicitud = (solicitud: BackendSolicitud): Solicitud => ({
  id: String(solicitud.id),
  tramiteId: String(solicitud.tramiteId),
  tramiteNombre: solicitud.tramiteNombre,
  vecinoNombre: solicitud.vecinoNombre,
  fecha: solicitud.fecha.slice(0, 10),
  estado: solicitud.estado,
  prioridad: solicitud.prioridad,
  ...(solicitud.fechaLimite ? { fechaLimite: solicitud.fechaLimite.slice(0, 10) } : {}),
  ...(solicitud.fechaResolucion ? { fechaResolucion: solicitud.fechaResolucion.slice(0, 10) } : {}),
  ...(solicitud.observaciones ? { observaciones: solicitud.observaciones } : {}),
  ...(solicitud.historial
    ? {
        historial: solicitud.historial.map((evento) => ({
          id: String(evento.id),
          estadoAnterior: evento.estadoAnterior,
          estadoNuevo: evento.estadoNuevo,
          actorNombre: evento.actorNombre,
          ...(evento.observaciones ? { observaciones: evento.observaciones } : {}),
          fecha: evento.fecha,
        })),
      }
    : {}),
});

const adaptarNotificacion = (notificacion: BackendNotificacion): Notificacion => ({
  ...notificacion,
  id: String(notificacion.id),
  fecha: notificacion.fecha.slice(0, 10),
});

/**
 * Catálogo público. Se guarda en memoria unos minutos y se deduplica mientras
 * hay una petición en vuelo, para que entrar al dashboard o cambiar de pestaña
 * no vuelva a pedir lo mismo. Nunca contiene datos del vecino.
 */
const CACHE_TRAMITES_MS = 5 * 60_000;
let cacheTramites: { datos: Tramite[]; caducidad: number } | null = null;
let promesaTramites: Promise<Tramite[]> | null = null;

export const getTramites = async (fuerza = false): Promise<Tramite[]> => {
  if (!fuerza && cacheTramites !== null && Date.now() < cacheTramites.caducidad) {
    return cacheTramites.datos;
  }
  if (!fuerza && promesaTramites !== null) return promesaTramites;

  promesaTramites = apiClient
    .get<BackendTramite[]>('/api/tramites')
    .then((datos) => datos.map(adaptarTramite))
    .then((datos) => {
      cacheTramites = { datos, caducidad: Date.now() + CACHE_TRAMITES_MS };
      return datos;
    })
    .finally(() => {
      promesaTramites = null;
    });

  return promesaTramites;
};

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
  const enCache = cacheTramites?.datos.find((tramite) => tramite.id === id);
  if (enCache !== undefined) return enCache;
  try {
    return adaptarTramite(await apiClient.get<BackendTramite>(`/api/tramites/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
};

export const getSolicitudes = async (estado?: EstadoSolicitud): Promise<Solicitud[]> => {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return (await apiClient.getTodos<BackendSolicitud>(`/api/solicitudes${query}`)).map(adaptarSolicitud);
};

export interface FiltrosBandeja {
  estado?: EstadoSolicitud;
  prioridad?: PrioridadSolicitud;
  q?: string;
  desde?: string;
  hasta?: string;
  tramiteId?: string;
  orden?: 'reciente' | 'antigua' | 'prioridad' | 'limite';
  vencidas?: boolean;
}

const querySolicitudes = (filtros: FiltrosBandeja): string => {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.prioridad) params.set('prioridad', filtros.prioridad);
  if (filtros.q?.trim()) params.set('q', filtros.q.trim());
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  if (filtros.tramiteId) params.set('tramiteId', filtros.tramiteId);
  if (filtros.orden) params.set('orden', filtros.orden);
  if (filtros.vencidas) params.set('vencidas', '1');
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

/**
 * Una página de solicitudes. En la vista del funcionario los filtros se aplican
 * en el servidor: búsqueda, estado, prioridad, trámite, fechas, vencidas y orden.
 */
export const getSolicitudesPagina = async (
  page: number,
  filtros: FiltrosBandeja = {},
  limit?: number,
): Promise<Pagina<Solicitud>> => {
  const { data, pagination } = await apiClient.getPagina<BackendSolicitud>(
    `/api/solicitudes${querySolicitudes(filtros)}`,
    page,
    limit,
  );
  return { data: data.map(adaptarSolicitud), pagination };
};

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

export const actualizarPrioridadSolicitud = async (
  folio: string,
  prioridad: PrioridadSolicitud,
  fechaLimite: string | null,
): Promise<Solicitud> =>
  adaptarSolicitud(
    await apiClient.patch<BackendSolicitud>(`/api/solicitudes/${encodeURIComponent(folio)}/prioridad`, {
      prioridad,
      fechaLimite,
    }),
  );

export const cancelarSolicitud = async (folio: string): Promise<void> => {
  await apiClient.delete(`/api/solicitudes/${encodeURIComponent(folio)}`);
};

export const getDocumentos = async (folio: string): Promise<DocumentoSolicitud[]> =>
  apiClient.get<DocumentoSolicitud[]>(
    `/api/solicitudes/${encodeURIComponent(folio)}/documentos`,
  );

export const subirDocumento = async (
  folio: string,
  archivo: File,
  onProgreso?: (porcentaje: number) => void,
  requisitoId?: string
): Promise<DocumentoSolicitud> =>
  apiClient.postArchivoConProgreso<DocumentoSolicitud>(
    `/api/solicitudes/${encodeURIComponent(folio)}/documentos`,
    archivo,
    onProgreso,
    requisitoId ? { 'X-Requisito-Id': requisitoId } : undefined,
  );

export const eliminarDocumento = async (folio: string, documentoId: string): Promise<void> => {
  await apiClient.delete(
    `/api/solicitudes/${encodeURIComponent(folio)}/documentos/${encodeURIComponent(documentoId)}`,
  );
};

export const descargarDocumento = async (
  folio: string,
  documentoId: string,
): Promise<Blob> => {
  const ruta = `/api/solicitudes/${encodeURIComponent(folio)}/documentos/${encodeURIComponent(documentoId)}/descarga`;
  return (await apiClient.getBlob(ruta)).blob;
};

export const getNotificaciones = async (): Promise<Notificacion[]> =>
  (await apiClient.getTodos<BackendNotificacion>('/api/notificaciones')).map(adaptarNotificacion);

/** Una página de notificaciones; `pagination.unread` trae el total de no leídas. */
export const getNotificacionesPagina = async (
  page: number,
  limit?: number,
): Promise<Pagina<Notificacion>> => {
  const { data, pagination } = await apiClient.getPagina<BackendNotificacion>(
    '/api/notificaciones',
    page,
    limit,
  );
  return { data: data.map(adaptarNotificacion), pagination };
};

export const marcarNotificacionLeida = async (id: string): Promise<Notificacion> =>
  adaptarNotificacion(await apiClient.patch<BackendNotificacion>(`/api/notificaciones/${encodeURIComponent(id)}`));

export const marcarTodasNotificacionesLeidas = async (): Promise<number> => {
  const resultado = await apiClient.patch<{ actualizadas: number }>('/api/notificaciones/leidas');
  return resultado.actualizadas;
};

export interface ResumenReporte {
  pendiente: number;
  en_revision: number;
  aprobado: number;
  rechazado: number;
  vencidas: number;
  promedioResolucionDias: number | null;
}

export interface GrupoReporte {
  clave: string;
  etiqueta: string;
  total: number;
}

export interface ReporteSolicitudes {
  desde: string | null;
  hasta: string | null;
  total: number;
  porEstado: ResumenReporte;
  porTramite: GrupoReporte[];
  porPrioridad: GrupoReporte[];
  vencidas: number;
  promedioResolucionDias: number | null;
}

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  tramiteId?: string;
}

export const getReporte = async (filtros: FiltrosReporte = {}): Promise<ReporteSolicitudes> => {
  const params = new URLSearchParams();
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  if (filtros.tramiteId) params.set('tramiteId', filtros.tramiteId);
  const query = params.toString();
  return apiClient.get<ReporteSolicitudes>(`/api/solicitudes/reportes${query === '' ? '' : `?${query}`}`);
};
