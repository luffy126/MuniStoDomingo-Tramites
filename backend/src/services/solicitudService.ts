import { randomBytes } from 'node:crypto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import {
  EstadoSolicitud,
  ResumenPorEstado,
  SolicitudDB,
  SolicitudFrontend,
  formatearFecha,
} from '../types';
import * as notificacionService from './notificacionService';

/** Fila del SELECT base: la solicitud más el nombre del vecino que la ingresó. */
interface FilaSolicitud extends RowDataPacket, SolicitudDB {
  vecino_nombre: string;
}

/** Fila bloqueada por `updateEstado`: lo necesario para validar la transición y avisar al vecino. */
interface FilaActual extends RowDataPacket {
  id: number;
  vecino_id: number;
  estado: EstadoSolicitud;
  observaciones: string | null;
  tramite_id: string;
}

/** Nombre de un trámite, para el texto del aviso. */
interface FilaTramiteNombre extends RowDataPacket {
  nombre: string;
}

/** Datos mínimos para decidir por qué no se pudo cancelar una solicitud. */
interface FilaEstado extends RowDataPacket {
  vecino_id: number;
  estado: EstadoSolicitud;
}

/**
 * Consulta base. El JOIN con usuario trae el nombre del vecino, que el frontend
 * muestra en la bandeja del funcionario.
 */
const BASE_SELECT = `
  SELECT s.id, s.folio, s.tramite_id, s.vecino_id, s.funcionario_id,
         s.estado, s.observaciones, s.creada_en, s.resuelta_en,
         u.nombre AS vecino_nombre
  FROM solicitud s
  JOIN usuario u ON s.vecino_id = u.id
`;

/**
 * Traduce una fila de la base de datos al formato del frontend.
 *
 * El frontend identifica cada solicitud por su folio, no por el id numérico,
 * y espera las fechas como `YYYY-MM-DD`. Las observaciones solo se incluyen
 * cuando tienen contenido.
 */
function toFrontend(fila: FilaSolicitud): SolicitudFrontend {
  return {
    id: fila.folio,
    tramiteId: fila.tramite_id,
    vecinoNombre: fila.vecino_nombre,
    fecha: formatearFecha(fila.creada_en),
    estado: fila.estado,
    ...(fila.observaciones ? { observaciones: fila.observaciones } : {}),
  };
}

/**
 * Registra una nueva solicitud de un vecino.
 *
 * El folio se deriva del id autoincremental (`SOL-` + 1000 + id), así dos
 * creaciones simultáneas nunca coinciden. Para eso se inserta primero con un
 * folio temporal único y se reemplaza por el definitivo dentro de la misma
 * transacción; nadie ve la fila con el folio temporal.
 *
 * @param tramiteId Identificador del trámite solicitado.
 * @param vecinoId Id del vecino que inicia el trámite.
 * @param observaciones Comentario opcional del vecino.
 * @returns La solicitud creada en formato frontend.
 */
export async function create(
  tramiteId: string,
  vecinoId: number,
  observaciones?: string
): Promise<SolicitudFrontend> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const folioTemporal = `TMP-${randomBytes(8).toString('hex')}`;
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO solicitud (folio, tramite_id, vecino_id, observaciones) VALUES (?, ?, ?, ?)',
      [folioTemporal, tramiteId, vecinoId, observaciones ?? null]
    );

    const folio = `SOL-${1000 + result.insertId}`;
    await conn.execute('UPDATE solicitud SET folio = ? WHERE id = ?', [folio, result.insertId]);

    const [rows] = await conn.execute<FilaSolicitud[]>(`${BASE_SELECT} WHERE s.id = ?`, [
      result.insertId,
    ]);
    await conn.commit();
    return toFrontend(rows[0]);
  } catch (err) {
    // Si el rollback también falla (conexión caída) se conserva el error original.
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Lista las solicitudes de un vecino, de la más reciente a la más antigua.
 *
 * @param vecinoId Id del vecino dueño de las solicitudes.
 */
export async function getByVecino(vecinoId: number): Promise<SolicitudFrontend[]> {
  const [rows] = await pool.execute<FilaSolicitud[]>(
    `${BASE_SELECT} WHERE s.vecino_id = ? ORDER BY s.creada_en DESC`,
    [vecinoId]
  );
  return rows.map(toFrontend);
}

/**
 * Lista todas las solicitudes del sistema, opcionalmente filtradas por estado.
 * Es la vista del funcionario.
 *
 * @param estado Estado por el que filtrar. Si se omite, devuelve todas.
 */
export async function getAll(estado?: EstadoSolicitud): Promise<SolicitudFrontend[]> {
  if (estado !== undefined) {
    const [rows] = await pool.execute<FilaSolicitud[]>(
      `${BASE_SELECT} WHERE s.estado = ? ORDER BY s.creada_en DESC`,
      [estado]
    );
    return rows.map(toFrontend);
  }

  const [rows] = await pool.execute<FilaSolicitud[]>(`${BASE_SELECT} ORDER BY s.creada_en DESC`);
  return rows.map(toFrontend);
}

/**
 * Busca una solicitud por su folio, que es el identificador que usa el frontend.
 *
 * @param folio Folio de la solicitud, por ejemplo 'SOL-1001'.
 * @returns La solicitud o null si no existe.
 */
export async function getById(folio: string): Promise<SolicitudFrontend | null> {
  const [rows] = await pool.execute<FilaSolicitud[]>(`${BASE_SELECT} WHERE s.folio = ?`, [folio]);

  if (rows.length === 0) {
    return null;
  }
  return toFrontend(rows[0]);
}

/** Estados a los que puede pasar una solicitud según su estado actual. */
export const TRANSICIONES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  pendiente: ['en_revision', 'aprobado', 'rechazado'],
  // en_revision -> en_revision solo se acepta con observaciones nuevas (agregar información);
  // sin ellas, o repitiendo las guardadas, no aportaría nada y llenaría la bandeja del vecino
  // con avisos repetidos.
  en_revision: ['en_revision', 'aprobado', 'rechazado'],
  // aprobado y rechazado son estados finales.
  aprobado: [],
  rechazado: [],
};

/** Resultado de intentar cambiar el estado de una solicitud. */
export type ResultadoCambioEstado =
  | { tipo: 'actualizada'; solicitud: SolicitudFrontend }
  | { tipo: 'no_encontrada' }
  | { tipo: 'transicion_invalida'; estadoActual: EstadoSolicitud };

/** Título y texto base del aviso que recibe el vecino según el nuevo estado. */
const AVISO_POR_ESTADO: Record<Exclude<EstadoSolicitud, 'pendiente'>, { titulo: string; accion: string }> = {
  en_revision: { titulo: 'Solicitud en revisión', accion: 'está en revisión' },
  aprobado: { titulo: 'Solicitud aprobada', accion: 'fue aprobada' },
  rechazado: { titulo: 'Solicitud rechazada', accion: 'fue rechazada' },
};

/**
 * Cambia el estado de una solicitud, registra qué funcionario la resolvió y
 * avisa al vecino dueño.
 *
 * Todo ocurre en una transacción: la fila se lee con `FOR UPDATE` (dos
 * funcionarios simultáneos no pueden resolver la misma solicitud dos veces), se
 * valida la transición contra el estado actual (ver `TRANSICIONES`; pasar al
 * mismo estado exige observaciones nuevas), se actualiza y se crea UNA notificación para
 * el vecino. El bloqueo es solo sobre la fila de `solicitud`: el nombre del
 * trámite se lee aparte, sin bloqueo. Si algo falla, no queda un cambio
 * de estado sin su aviso.
 *
 * `resuelta_en` solo se completa cuando el trámite llega a un estado final
 * (aprobado o rechazado). Si no se envían observaciones, se conservan las que
 * ya tuviera la solicitud.
 *
 * @param folio Folio de la solicitud.
 * @param estado Nuevo estado.
 * @param funcionarioId Id del funcionario que resuelve.
 * @param observaciones Comentario opcional dirigido al vecino.
 * @returns La solicitud actualizada, o el motivo por el que no se pudo cambiar.
 */
export async function updateEstado(
  folio: string,
  estado: EstadoSolicitud,
  funcionarioId: number,
  observaciones?: string
): Promise<ResultadoCambioEstado> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [actuales] = await conn.execute<FilaActual[]>(
      'SELECT id, vecino_id, estado, observaciones, tramite_id FROM solicitud WHERE folio = ? FOR UPDATE',
      [folio]
    );

    if (actuales.length === 0) {
      await conn.rollback();
      return { tipo: 'no_encontrada' };
    }

    const actual = actuales[0];
    // Repetir el estado solo aporta si las observaciones traen algo distinto de lo ya guardado
    // (la UI precarga las actuales: reenviarlas iguales no es información nueva).
    const nuevas = observaciones?.trim() ?? '';
    const sinInformacionNueva =
      actual.estado === estado && (nuevas === '' || nuevas === (actual.observaciones ?? '').trim());
    if (!TRANSICIONES[actual.estado].includes(estado) || sinInformacionNueva) {
      await conn.rollback();
      return { tipo: 'transicion_invalida', estadoActual: actual.estado };
    }

    // Sin FOR UPDATE: solo se necesita el nombre para el texto del aviso.
    const [tramites] = await conn.execute<FilaTramiteNombre[]>(
      'SELECT nombre FROM tramite WHERE id = ?',
      [actual.tramite_id]
    );

    const resueltaEn = estado === 'aprobado' || estado === 'rechazado' ? new Date() : null;
    await conn.execute(
      `UPDATE solicitud
       SET estado = ?, funcionario_id = ?, observaciones = COALESCE(?, observaciones), resuelta_en = ?
       WHERE id = ?`,
      [estado, funcionarioId, observaciones ?? null, resueltaEn, actual.id]
    );

    // 'pendiente' no es un destino válido (ver TRANSICIONES), así que siempre hay aviso.
    const aviso = AVISO_POR_ESTADO[estado as Exclude<EstadoSolicitud, 'pendiente'>];
    const comentario = observaciones?.trim() ? ` Observaciones: ${observaciones.trim()}` : '';
    await notificacionService.create(
      actual.vecino_id,
      actual.id,
      aviso.titulo,
      `Tu solicitud ${folio} (${tramites[0].nombre}) ${aviso.accion}.${comentario}`,
      conn
    );

    const [rows] = await conn.execute<FilaSolicitud[]>(`${BASE_SELECT} WHERE s.id = ?`, [actual.id]);
    await conn.commit();
    return { tipo: 'actualizada', solicitud: toFrontend(rows[0]) };
  } catch (err) {
    // Si el rollback también falla (conexión caída) se conserva el error original.
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Cuenta las solicitudes agrupadas por estado, para el panel de reportes.
 *
 * Los cuatro estados siempre vienen en el resultado, en cero si no hay
 * solicitudes de ese tipo, para que el frontend no tenga que comprobarlo.
 */
export async function getResumenPorEstado(): Promise<ResumenPorEstado> {
  interface FilaResumen extends RowDataPacket {
    estado: EstadoSolicitud;
    total: number;
  }

  const [rows] = await pool.execute<FilaResumen[]>(
    'SELECT estado, COUNT(*) AS total FROM solicitud GROUP BY estado'
  );

  const resumen: ResumenPorEstado = {
    pendiente: 0,
    en_revision: 0,
    aprobado: 0,
    rechazado: 0,
  };

  for (const fila of rows) {
    if (fila.estado in resumen) {
      resumen[fila.estado] = Number(fila.total);
    }
  }

  return resumen;
}

/**
 * Devuelve el id del vecino dueño de una solicitud. Se usa para autorizar el
 * acceso sin exponer `vecino_id` en el formato del frontend.
 *
 * @param folio Folio de la solicitud.
 * @returns El id del vecino o null si el folio no existe.
 */
export async function getOwnerId(folio: string): Promise<number | null> {
  interface FilaOwner extends RowDataPacket {
    vecino_id: number;
  }

  const [rows] = await pool.execute<FilaOwner[]>(
    'SELECT vecino_id FROM solicitud WHERE folio = ?',
    [folio]
  );
  return rows.length === 0 ? null : rows[0].vecino_id;
}

/** Resultado de intentar cancelar una solicitud. */
export type ResultadoCancelacion = 'cancelada' | 'no_encontrada' | 'no_pendiente';

/**
 * Elimina una solicitud pendiente de un vecino (cancelación).
 *
 * El DELETE exige las tres condiciones a la vez (folio, dueño y estado
 * pendiente), así que es atómico frente a un cambio de estado concurrente del
 * funcionario. Si no borra nada, se consulta el motivo para que el controlador
 * responda 404 (no existe o es de otro vecino) o 409 (ya no está pendiente).
 * Los avisos de la solicitud se conservan: `notificacion.solicitud_id` es
 * ON DELETE SET NULL.
 *
 * @param folio Folio de la solicitud.
 * @param vecinoId Id del vecino que pide la cancelación.
 */
export async function cancelar(folio: string, vecinoId: number): Promise<ResultadoCancelacion> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM solicitud WHERE folio = ? AND vecino_id = ? AND estado = 'pendiente'",
    [folio, vecinoId]
  );
  if (result.affectedRows > 0) {
    return 'cancelada';
  }

  const [rows] = await pool.execute<FilaEstado[]>(
    'SELECT vecino_id, estado FROM solicitud WHERE folio = ?',
    [folio]
  );
  // Misma respuesta para "no existe" y "es de otro vecino": no se revela el folio.
  return rows.length === 0 || rows[0].vecino_id !== vecinoId ? 'no_encontrada' : 'no_pendiente';
}
