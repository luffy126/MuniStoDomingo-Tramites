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

// --- Usuario ---

/** Fila completa de la tabla usuario. Incluye password_hash: SOLO para uso interno. */
export interface UsuarioDB {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  creado_en: Date;
}

/** Usuario sin contraseña: lo que puede devolverse al frontend. */
export interface UsuarioPublico {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
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
}

// --- Solicitud ---

export interface SolicitudDB {
  id: number;
  folio: string;
  tramite_id: string;
  vecino_id: number;
  funcionario_id: number | null;
  estado: EstadoSolicitud;
  observaciones: string | null;
  creada_en: Date;
  resuelta_en: Date | null;
}

/** Solicitud mapeada al formato del frontend. `id` es el folio, no el id numérico. */
export interface SolicitudFrontend {
  id: string;
  tramiteId: string;
  vecinoNombre: string;
  fecha: string;
  estado: EstadoSolicitud;
  observaciones?: string;
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
}

// --- Reportes ---

export interface ResumenPorEstado {
  pendiente: number;
  en_revision: number;
  aprobado: number;
  rechazado: number;
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
