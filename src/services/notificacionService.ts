import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Connection } from 'mysql2/promise';
import pool from '../config/database';
import { NotificacionDB, NotificacionFrontend, formatearFecha } from '../types';

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

/**
 * Lista las notificaciones de un usuario, de la más reciente a la más antigua.
 *
 * @param usuarioId Id del usuario dueño de las notificaciones.
 */
export async function getByUsuario(usuarioId: number): Promise<NotificacionFrontend[]> {
  const [rows] = await pool.execute<FilaNotificacion[]>(
    'SELECT id, usuario_id, solicitud_id, titulo, mensaje, leida, creada_en FROM notificacion WHERE usuario_id = ? ORDER BY creada_en DESC, id DESC',
    [usuarioId]
  );
  return rows.map(toFrontend);
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
