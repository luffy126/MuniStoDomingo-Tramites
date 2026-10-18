import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import {
  EstadoSolicitud,
  ResumenPorEstado,
  SolicitudDB,
  SolicitudFrontend,
  formatearFecha,
} from '../types';

/** Fila del SELECT base: la solicitud más el nombre del vecino que la ingresó. */
interface FilaSolicitud extends RowDataPacket, SolicitudDB {
  vecino_nombre: string;
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
 * @param folio Folio único, generado con `generarFolio()`.
 * @param tramiteId Identificador del trámite solicitado.
 * @param vecinoId Id del vecino que inicia el trámite.
 * @param observaciones Comentario opcional del vecino.
 * @returns La solicitud creada en formato frontend.
 */
export async function create(
  folio: string,
  tramiteId: string,
  vecinoId: number,
  observaciones?: string
): Promise<SolicitudFrontend> {
  await pool.execute<ResultSetHeader>(
    'INSERT INTO solicitud (folio, tramite_id, vecino_id, observaciones) VALUES (?, ?, ?, ?)',
    [folio, tramiteId, vecinoId, observaciones ?? null]
  );

  const [rows] = await pool.execute<FilaSolicitud[]>(`${BASE_SELECT} WHERE s.folio = ?`, [folio]);
  return toFrontend(rows[0]);
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

/**
 * Cambia el estado de una solicitud y registra qué funcionario la resolvió.
 *
 * `resuelta_en` solo se completa cuando el trámite llega a un estado final
 * (aprobado o rechazado). Si no se envían observaciones, se conservan las que
 * ya tuviera la solicitud.
 *
 * @param folio Folio de la solicitud.
 * @param estado Nuevo estado.
 * @param funcionarioId Id del funcionario que resuelve.
 * @param observaciones Comentario opcional dirigido al vecino.
 * @returns La solicitud actualizada o null si el folio no existe.
 */
export async function updateEstado(
  folio: string,
  estado: EstadoSolicitud,
  funcionarioId: number,
  observaciones?: string
): Promise<SolicitudFrontend | null> {
  const resueltaEn = estado === 'aprobado' || estado === 'rechazado' ? new Date() : null;

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE solicitud
     SET estado = ?, funcionario_id = ?, observaciones = COALESCE(?, observaciones), resuelta_en = ?
     WHERE folio = ?`,
    [estado, funcionarioId, observaciones ?? null, resueltaEn, folio]
  );

  if (result.affectedRows === 0) {
    return null;
  }
  return getById(folio);
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
 * Calcula el siguiente folio disponible con el formato SOL-XXXX.
 *
 * Se apoya en el mayor id de la tabla, de modo que el primer folio sea
 * SOL-1001 cuando la tabla está vacía.
 */
export async function generarFolio(): Promise<string> {
  interface FilaMax extends RowDataPacket {
    maxId: number | null;
  }

  const [rows] = await pool.execute<FilaMax[]>('SELECT MAX(id) AS maxId FROM solicitud');
  const maxId = rows[0]?.maxId ?? 0;
  return `SOL-${1000 + Number(maxId) + 1}`;
}
