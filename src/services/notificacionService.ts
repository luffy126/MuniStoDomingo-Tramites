import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Connection } from 'mysql2/promise';
import pool from '../config/database';
import { NotificacionDB, NotificacionFrontend, formatearFecha } from '../types';
import {
  PRIMERA_PAGINA,
  PaginatedResult,
  PaginationParams,
  buildPaginationMeta,
  limitOffset,
} from '../utils/pagination';

/** Fila de la tabla notificacion. */
interface FilaNotificacion extends RowDataPacket, NotificacionDB {}

/**
 * Traduce una fila de la base de datos al formato del frontend.
 *
 * El id se entrega como texto y `leida` se normaliza a booleano, porque MySQL
 * devuelve los BOOLEAN como 0 o 1.
 */
function toFrontend(fila: FilaNotificacion): NotificacionFrontend {
  return {
    id: String(fila.id),
    titulo: fila.titulo,
    mensaje: fila.mensaje,
    fecha: formatearFecha(fila.creada_en),
    leida: Boolean(fila.leida),
  };
}

/**
 * Crea una notificación dirigida a un usuario.
 *
 * @param usuarioId Destinatario del aviso.
 * @param solicitudId Solicitud relacionada, o null si el aviso es general.
 * @param titulo Título breve.
 * @param mensaje Cuerpo del aviso.
 * @param db Conexión o pool donde ejecutar el INSERT. Se pasa la conexión de una
 *           transacción para que el aviso se confirme o revierta junto con ella.
 * @returns La notificación creada en formato frontend.
 */
export async function create(
  usuarioId: number,
  solicitudId: number | null,
  titulo: string,
  mensaje: string,
  db: Connection = pool
): Promise<NotificacionFrontend> {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO notificacion (usuario_id, solicitud_id, titulo, mensaje) VALUES (?, ?, ?, ?)',
    [usuarioId, solicitudId, titulo, mensaje]
  );

  return {
    id: String(result.insertId),
    titulo,
    mensaje,
    fecha: formatearFecha(new Date()),
    leida: false,
  };
}

/** Resultado de `getByUsuario`: una página más el total de avisos sin leer. */
export interface PaginaNotificaciones extends PaginatedResult<NotificacionFrontend> {
  /** Avisos sin leer del usuario en TODAS las páginas, para el contador de la interfaz. */
  noLeidas: number;
}

/**
 * Lista una página de las notificaciones de un usuario, de la más reciente a
 * la más antigua.
 *
 * El total y las no leídas salen de una sola consulta, que el índice
 * `idx_notificacion_usuario (usuario_id, leida)` resuelve sin leer la tabla.
 *
 * @param usuarioId Id del usuario dueño de las notificaciones.
 * @param pagination Página pedida. Por defecto, la primera.
 */
export async function getByUsuario(
  usuarioId: number,
  pagination: PaginationParams = PRIMERA_PAGINA
): Promise<PaginaNotificaciones> {
  interface FilaTotales extends RowDataPacket {
    total: number;
    no_leidas: number | null;
  }
  const [totales] = await pool.execute<FilaTotales[]>(
    'SELECT COUNT(*) AS total, SUM(leida = FALSE) AS no_leidas FROM notificacion WHERE usuario_id = ?',
    [usuarioId]
  );

  const [rows] = await pool.execute<FilaNotificacion[]>(
    'SELECT id, usuario_id, solicitud_id, titulo, mensaje, leida, creada_en FROM notificacion WHERE usuario_id = ? ORDER BY creada_en DESC, id DESC LIMIT ? OFFSET ?',
    [usuarioId, ...limitOffset(pagination)]
  );

  return {
    items: rows.map(toFrontend),
    pagination: buildPaginationMeta(pagination.page, pagination.limit, Number(totales[0].total)),
    // SUM devuelve NULL cuando el usuario no tiene avisos.
    noLeidas: Number(totales[0].no_leidas ?? 0),
  };
}

/**
 * Marca una notificación como leída, solo si pertenece al usuario indicado.
 *
 * @param id Id numérico de la notificación.
 * @param usuarioId Id del usuario que hace la petición.
 * @returns La notificación ya marcada como leída, o null si no existe o es de otro usuario.
 *          Es idempotente: marcar una notificación ya leída también la devuelve.
 */
export async function markAsRead(id: number, usuarioId: number): Promise<NotificacionFrontend | null> {
  await pool.execute(
    'UPDATE notificacion SET leida = TRUE WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );

  const [rows] = await pool.execute<FilaNotificacion[]>(
    'SELECT id, usuario_id, solicitud_id, titulo, mensaje, leida, creada_en FROM notificacion WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  return rows.length === 0 ? null : toFrontend(rows[0]);
}
