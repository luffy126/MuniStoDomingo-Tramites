import { ResultSetHeader, RowDataPacket } from 'mysql2';
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
 * @returns La notificación creada en formato frontend.
 */
export async function create(
  usuarioId: number,
  solicitudId: number | null,
  titulo: string,
  mensaje: string
): Promise<NotificacionFrontend> {
  const [result] = await pool.execute<ResultSetHeader>(
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
    'SELECT id, usuario_id, solicitud_id, titulo, mensaje, leida, creada_en FROM notificacion WHERE usuario_id = ? ORDER BY creada_en DESC',
    [usuarioId]
  );
  return rows.map(toFrontend);
}

/**
 * Marca una notificación como leída.
 *
 * @param id Id numérico de la notificación.
 * @returns true si existía y se actualizó, false si no existe.
 */
export async function markAsRead(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE notificacion SET leida = TRUE WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}
