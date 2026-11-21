/**
 * Tipos compartidos entre la capa de servicios y los controladores.
 *
 * Convención: los tipos con sufijo `DB` reflejan las columnas tal como están en
 * la base de datos (snake_case). Los tipos con sufijo `Frontend` o `Publico`
 * son los que viajan al cliente, ya mapeados a camelCase.
 */

export type Rol = 'vecino' | 'funcionario';
export type CategoriaTramite = 'certificados' | 'permisos' | 'reclamos' | 'solicitudes';
export type EstadoSolicitud = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
export type PrioridadSolicitud = 'baja' | 'media' | 'alta' | 'urgente';

// --- Usuario ---

/** Fila completa de la tabla usuario. Incluye password_hash: SOLO para uso interno. */
export interface UsuarioDB {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  telefono: string | null;
  direccion: string | null;
  token_version: number;
  /** Verificación en dos pasos por correo activa. MySQL la devuelve como 0/1. */
  dos_factores: boolean | number;
  creado_en: Date;
}

/** Usuario sin contraseña: lo que puede devolverse al frontend. */
export interface UsuarioPublico {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  direccion: string | null;
}

/** Usuario público más la versión de sesión con que se firman sus tokens. */
export interface UsuarioSesion extends UsuarioPublico {
  token_version: number;
}

// --- Trámite ---

export interface TramiteDB {
  id: string;
  nombre: string;
  categoria: CategoriaTramite;
  descripcion: string;
  icono: string;
  activo: boolean;
}

export interface RequisitoDB {
  id: number;
  tramite_id: string;
  descripcion: string;
  orden: number;
}

/** Trámite con sus requisitos como arreglo de strings, que es lo que espera el frontend. */
export interface TramiteConRequisitos {
  id: string;
  nombre: string;
  categoria: CategoriaTramite;
  descripcion: string;
  icono: string;
  requisitos: string[];
  /** Los mismos requisitos con su tipo: los de tipo 'documento' se adjuntan al iniciar. */
  requisitosDetalle: RequisitoDetalle[];
}

export interface RequisitoDetalle {
  id: string;
  descripcion: string;
  tipo: 'documento' | 'dato';
  obligatorio: boolean;
}

// --- Solicitud ---

export interface SolicitudDB {
  id: number;
  folio: string;
  tramite_id: string;
  vecino_id: number;
  funcionario_id: number | null;
  estado: EstadoSolicitud;
  prioridad: PrioridadSolicitud;
  fecha_limite: Date | null;
  observaciones: string | null;
  creada_en: Date;
  resuelta_en: Date | null;
}

/** Evento de la línea de tiempo de una solicitud. */
export interface EventoHistorial {
  id: string;
  estadoAnterior: EstadoSolicitud | 'cancelada' | null;
  estadoNuevo: EstadoSolicitud | 'cancelada';
  actorNombre: string;
  observaciones?: string;
  fecha: string;
}

/** Solicitud mapeada al formato del frontend. `id` es el folio, no el id numérico. */
export interface SolicitudFrontend {
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
  /** Solo en el detalle. */
  historial?: EventoHistorial[];
}

// --- Notificación ---

export interface NotificacionDB {
  id: number;
  usuario_id: number;
  solicitud_id: number | null;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creada_en: Date;
}

/** Notificación mapeada al formato del frontend. */
export interface NotificacionFrontend {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  /** Folio de la solicitud relacionada, para navegar al detalle. */
  folio?: string;
}

// --- Documentos ---

export interface DocumentoDB {
  id: number;
  solicitud_id: number;
  subido_por: number | null;
  nombre_original: string;
  nombre_almacenado: string;
  tipo: string;
  tamano: number;
  requisito_id: number | null;
  creado_en: Date;
}

/** Documento adjunto mapeado al formato del frontend. */
export interface DocumentoSolicitud {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  fecha: string;
  subidoPor: string | null;
  /** Requisito que cumple, si se adjuntó para uno. */
  requisitoId?: string;
  requisito?: string;
}

// --- Reportes ---

export interface ResumenPorEstado {
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
  porEstado: ResumenPorEstado;
  porTramite: GrupoReporte[];
  porPrioridad: GrupoReporte[];
  vencidas: number;
  promedioResolucionDias: number | null;
}

/**
 * Formatea una fecha de la base de datos como `YYYY-MM-DD`.
 *
 * Se construye a partir de los componentes locales en lugar de `toISOString()`,
 * porque ese método convierte a UTC y puede correr la fecha un día cuando el
 * registro se creó de noche (en Chile, UTC-3/-4).
 */
export function formatearFecha(valor: Date | string): string {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Igual que `formatearFecha`, pero conserva la hora local para la línea de tiempo. */
export function formatearFechaHora(valor: Date | string): string {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  return `${formatearFecha(fecha)}T${hora}:${minuto}:00`;
}
