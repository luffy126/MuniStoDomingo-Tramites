import { randomBytes } from 'node:crypto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Connection } from 'mysql2/promise';
import pool from '../config/database';
import {
  EstadoSolicitud,
  EventoHistorial,
  GrupoReporte,
  PrioridadSolicitud,
  ReporteSolicitudes,
  ResumenPorEstado,
  SolicitudDB,
  SolicitudFrontend,
  formatearFecha,
  formatearFechaHora,
} from '../types';
import * as emailService from './emailService';
import * as notificacionService from './notificacionService';
import * as userService from './userService';
import {
  PRIMERA_PAGINA,
  PaginatedResult,
  PaginationParams,
  buildPaginationMeta,
  limitOffset,
} from '../utils/pagination';

/** Fila del SELECT base: la solicitud más el nombre del vecino que la ingresó. */
interface FilaSolicitud extends RowDataPacket, SolicitudDB {
  vecino_nombre: string;
  tramite_nombre: string;
}

/** Fila de la tabla solicitud_historial con el nombre del actor ya resuelto. */
interface FilaHistorial extends RowDataPacket {
  id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  actor_nombre: string;
  observaciones: string | null;
  creado_en: Date;
}

/** Fila de un COUNT o promedio agregado. */
interface FilaAgregado extends RowDataPacket {
  clave: string;
  etiqueta?: string | null;
  total: number;
}

interface FilaPromedio extends RowDataPacket {
  promedio: number | null;
}

interface FilaNombre extends RowDataPacket {
  nombre: string;
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

/** Fila de un COUNT(*). */
interface FilaTotal extends RowDataPacket {
  total: number;
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
const JOINS_LISTADO = `
  FROM solicitud s
  JOIN usuario u ON s.vecino_id = u.id
  JOIN tramite t ON s.tramite_id = t.id
`;

const BASE_SELECT = `
  SELECT s.id, s.folio, s.tramite_id, s.vecino_id, s.funcionario_id,
         s.estado, s.prioridad, s.fecha_limite, s.observaciones, s.creada_en, s.resuelta_en,
         u.nombre AS vecino_nombre, t.nombre AS tramite_nombre
  ${JOINS_LISTADO}
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
    tramiteNombre: fila.tramite_nombre,
    fecha: formatearFecha(fila.creada_en),
    estado: fila.estado,
    prioridad: fila.prioridad,
    ...(fila.fecha_limite !== null ? { fechaLimite: formatearFecha(fila.fecha_limite) } : {}),
    ...(fila.resuelta_en !== null ? { fechaResolucion: formatearFecha(fila.resuelta_en) } : {}),
    ...(fila.observaciones ? { observaciones: fila.observaciones } : {}),
  };
}

function filaAHistorial(fila: FilaHistorial): EventoHistorial {
  return {
    id: String(fila.id),
    estadoAnterior: fila.estado_anterior as EventoHistorial['estadoAnterior'],
    estadoNuevo: fila.estado_nuevo as EventoHistorial['estadoNuevo'],
    actorNombre: fila.actor_nombre,
    ...(fila.observaciones ? { observaciones: fila.observaciones } : {}),
    fecha: formatearFechaHora(fila.creado_en),
  };
}

/** Registra una transición dentro de la transacción que la produce. */
async function registrarHistorial(
  conn: Connection,
  solicitudId: number,
  estadoAnterior: string | null,
  estadoNuevo: string,
  actorId: number | null,
  actorNombre: string,
  observaciones?: string
): Promise<void> {
  await conn.execute(
    `INSERT INTO solicitud_historial
       (solicitud_id, estado_anterior, estado_nuevo, actor_id, actor_nombre, observaciones)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [solicitudId, estadoAnterior, estadoNuevo, actorId, actorNombre, observaciones ?? null]
  );
}

/**
 * Máximo de solicitudes abiertas (pendientes o en revisión) por vecino. Limita
 * el abuso (y, con él, el espacio de adjuntos) sin afectar el uso normal.
 */
export const maxSolicitudesAbiertas = (): number => {
  const numero = Number(process.env.MAX_SOLICITUDES_ABIERTAS);
  return Number.isInteger(numero) && numero > 0 ? numero : 20;
};

/** Cuenta las solicitudes abiertas de un vecino. */
export async function contarAbiertas(vecinoId: number): Promise<number> {
  const [rows] = await pool.execute<FilaTotal[]>(
    "SELECT COUNT(*) AS total FROM solicitud WHERE vecino_id = ? AND estado IN ('pendiente', 'en_revision')",
    [vecinoId]
  );
  return Number(rows[0].total);
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

    const [vecinos] = await conn.execute<FilaNombre[]>(
      'SELECT nombre FROM usuario WHERE id = ?',
      [vecinoId]
    );
    await registrarHistorial(
      conn,
      result.insertId,
      null,
      'pendiente',
      vecinoId,
      vecinos[0]?.nombre ?? 'Vecino',
      observaciones
    );

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

export type OrdenSolicitudes = 'reciente' | 'antigua' | 'prioridad' | 'limite';

export interface FiltrosSolicitudes {
  q?: string;
  estado?: EstadoSolicitud;
  prioridad?: PrioridadSolicitud;
  desde?: string;
  hasta?: string;
  tramiteId?: string;
  vencidas?: boolean;
  orden?: OrdenSolicitudes;
}

/**
 * Orden de los listados. `s.id` desempata las solicitudes creadas en el mismo
 * segundo: sin un orden total, dos páginas consecutivas podrían repetir u
 * omitir filas.
 */
const ORDENES: Record<OrdenSolicitudes, string> = {
  reciente: 'ORDER BY s.creada_en DESC, s.id DESC',
  antigua: 'ORDER BY s.creada_en ASC, s.id ASC',
  prioridad:
    "ORDER BY FIELD(s.prioridad, 'urgente', 'alta', 'media', 'baja'), s.creada_en ASC, s.id ASC",
  limite: 'ORDER BY s.fecha_limite IS NULL, s.fecha_limite ASC, s.creada_en ASC, s.id ASC',
};

/** Condición WHERE y valores para los filtros de la bandeja. */
function construirFiltros(filtros: FiltrosSolicitudes): { where: string; valores: string[] } {
  const condiciones: string[] = [];
  const valores: string[] = [];

  if (filtros.estado !== undefined) {
    condiciones.push('s.estado = ?');
    valores.push(filtros.estado);
  }
  if (filtros.prioridad !== undefined) {
    condiciones.push('s.prioridad = ?');
    valores.push(filtros.prioridad);
  }
  if (filtros.tramiteId !== undefined) {
    condiciones.push('s.tramite_id = ?');
    valores.push(filtros.tramiteId);
  }
  if (filtros.desde !== undefined) {
    condiciones.push('s.creada_en >= ?');
    valores.push(`${filtros.desde} 00:00:00`);
  }
  if (filtros.hasta !== undefined) {
    condiciones.push('s.creada_en < DATE_ADD(?, INTERVAL 1 DAY)');
    valores.push(`${filtros.hasta} 00:00:00`);
  }
  if (filtros.vencidas === true) {
    condiciones.push("s.fecha_limite < CURDATE() AND s.estado IN ('pendiente', 'en_revision')");
  }
  const q = filtros.q?.trim();
  if (q !== undefined && q !== '') {
    const patron = `%${q}%`;
    condiciones.push('(s.folio LIKE ? OR u.nombre LIKE ? OR t.nombre LIKE ?)');
    valores.push(patron, patron, patron);
  }

  return {
    where: condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '',
    valores,
  };
}

/**
 * Devuelve una página de solicitudes y el total que cumple el filtro.
 * El COUNT usa los mismos JOIN porque la búsqueda puede mirar usuario y trámite.
 */
async function listarPagina(
  where: string,
  valores: string[],
  pagination: PaginationParams,
  orden: OrdenSolicitudes = 'reciente'
): Promise<PaginatedResult<SolicitudFrontend>> {
  const [totales] = await pool.execute<FilaTotal[]>(
    `SELECT COUNT(*) AS total ${JOINS_LISTADO} ${where}`,
    valores
  );
  const total = Number(totales[0].total);

  const [rows] = await pool.execute<FilaSolicitud[]>(
    `${BASE_SELECT} ${where} ${ORDENES[orden]} LIMIT ? OFFSET ?`,
    [...valores, ...limitOffset(pagination)]
  );

  return {
    items: rows.map(toFrontend),
    pagination: buildPaginationMeta(pagination.page, pagination.limit, total),
  };
}

/**
 * Lista una página de las solicitudes de un vecino, de la más reciente a la
 * más antigua.
 */
export async function getByVecino(
  vecinoId: number,
  pagination: PaginationParams = PRIMERA_PAGINA
): Promise<PaginatedResult<SolicitudFrontend>> {
  return listarPagina('WHERE s.vecino_id = ?', [String(vecinoId)], pagination);
}

/**
 * Lista una página de todas las solicitudes del sistema con búsqueda, filtros
 * y orden resueltos en la base. Es la vista del funcionario.
 */
export async function getAll(
  filtros: FiltrosSolicitudes = {},
  pagination: PaginationParams = PRIMERA_PAGINA
): Promise<PaginatedResult<SolicitudFrontend>> {
  const { where, valores } = construirFiltros(filtros);
  return listarPagina(where, valores, pagination, filtros.orden ?? 'reciente');
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

  const [historial] = await pool.execute<FilaHistorial[]>(
    `SELECT id, estado_anterior, estado_nuevo, actor_nombre, observaciones, creado_en
     FROM solicitud_historial
     WHERE solicitud_id = ?
     ORDER BY creado_en ASC, id ASC`,
    [rows[0].id]
  );

  return { ...toFrontend(rows[0]), historial: historial.map(filaAHistorial) };
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
 * Envía al vecino el correo de cambio de estado. Se llama SIN await después del
 * commit: la respuesta HTTP no espera al proveedor de correo y, como el cambio
 * ya quedó guardado, un fallo aquí (incluida la búsqueda del vecino) solo se
 * registra en el log. Por eso atrapa todo y nunca rechaza.
 */
async function avisarPorEmail(
  vecinoId: number,
  folio: string,
  nombreTramite: string,
  estado: Exclude<EstadoSolicitud, 'pendiente'>,
  observaciones?: string
): Promise<void> {
  try {
    const vecino = await userService.findById(vecinoId);
    if (!vecino) return;
    await emailService.enviarNotificacionEstado({
      destinatario: vecino.email,
      nombreVecino: vecino.nombre,
      folio,
      nombreTramite,
      estado,
      observaciones,
    });
  } catch (err) {
    console.error(`❌ No se pudo avisar por email el cambio de ${folio}:`, err instanceof Error ? err.message : err);
  }
}

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
 * Además del aviso dentro de la app, después del commit se envía un correo al
 * vecino (ver `avisarPorEmail`). Va fuera de la transacción a propósito: si el
 * proveedor de correo falla o demora, el cambio de estado no se revierte ni se
 * retrasa.
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
    const [funcionarios] = await conn.execute<FilaNombre[]>(
      'SELECT nombre FROM usuario WHERE id = ?',
      [funcionarioId]
    );

    const resueltaEn = estado === 'aprobado' || estado === 'rechazado' ? new Date() : null;
    await conn.execute(
      `UPDATE solicitud
       SET estado = ?, funcionario_id = ?, observaciones = COALESCE(?, observaciones), resuelta_en = ?
       WHERE id = ?`,
      [estado, funcionarioId, observaciones ?? null, resueltaEn, actual.id]
    );

    await registrarHistorial(
      conn,
      actual.id,
      actual.estado,
      estado,
      funcionarioId,
      funcionarios[0]?.nombre ?? 'Funcionario',
      observaciones?.trim() || undefined
    );

    // 'pendiente' no es un destino válido (ver TRANSICIONES), así que siempre hay aviso.
    const estadoNuevo = estado as Exclude<EstadoSolicitud, 'pendiente'>;
    const aviso = AVISO_POR_ESTADO[estadoNuevo];
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

    // Sin await: el correo no forma parte de la respuesta (ver avisarPorEmail).
    void avisarPorEmail(actual.vecino_id, folio, tramites[0].nombre, estadoNuevo, observaciones?.trim() || undefined);

    return { tipo: 'actualizada', solicitud: toFrontend(rows[0]) };
  } catch (err) {
    // Si el rollback también falla (conexión caída) se conserva el error original.
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  tramiteId?: string;
}

/**
 * Agregados para el panel de reportes: totales por estado, por trámite y por
 * prioridad, además de vencidas y tiempo promedio de resolución.
 *
 * Los cuatro estados siempre vienen, en cero si no hay solicitudes. El promedio
 * se calcula solo sobre solicitudes resueltas y se redondea a un decimal.
 */
export async function getReporte(filtros: FiltrosReporte = {}): Promise<ReporteSolicitudes> {
  const { where, valores } = construirFiltros(filtros);
  const condicion = (extra: string): string =>
    where === '' ? `WHERE ${extra}` : `${where} AND ${extra}`;

  const [totales] = await pool.execute<FilaTotal[]>(
    `SELECT COUNT(*) AS total ${JOINS_LISTADO} ${where}`,
    valores
  );

  const [estados] = await pool.execute<FilaAgregado[]>(
    `SELECT s.estado AS clave, COUNT(*) AS total ${JOINS_LISTADO} ${where} GROUP BY s.estado`,
    valores
  );
  const porEstado: ResumenPorEstado = {
    pendiente: 0,
    en_revision: 0,
    aprobado: 0,
    rechazado: 0,
    vencidas: 0,
    promedioResolucionDias: null,
  };
  for (const fila of estados) {
    if (fila.clave in porEstado) {
      porEstado[fila.clave as keyof Pick<ResumenPorEstado, 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado'>] =
        Number(fila.total);
    }
  }

  const [porTramite] = await pool.execute<FilaAgregado[]>(
    `SELECT s.tramite_id AS clave, t.nombre AS etiqueta, COUNT(*) AS total
     ${JOINS_LISTADO} ${where}
     GROUP BY s.tramite_id, t.nombre
     ORDER BY total DESC, etiqueta ASC`,
    valores
  );

  const [porPrioridad] = await pool.execute<FilaAgregado[]>(
    `SELECT s.prioridad AS clave, COUNT(*) AS total
     ${JOINS_LISTADO} ${where}
     GROUP BY s.prioridad
     ORDER BY FIELD(s.prioridad, 'urgente', 'alta', 'media', 'baja')`,
    valores
  );

  const [vencidas] = await pool.execute<FilaTotal[]>(
    `SELECT COUNT(*) AS total ${JOINS_LISTADO}
     ${condicion("s.fecha_limite < CURDATE() AND s.estado IN ('pendiente', 'en_revision')")}`,
    valores
  );

  const [promedios] = await pool.execute<FilaPromedio[]>(
    `SELECT AVG(TIMESTAMPDIFF(HOUR, s.creada_en, s.resuelta_en)) / 24 AS promedio
     ${JOINS_LISTADO}
     ${condicion('s.resuelta_en IS NOT NULL')}`,
    valores
  );

  const vencidasTotal = Number(vencidas[0].total);
  const promedioCrudo = promedios[0].promedio;
  porEstado.vencidas = vencidasTotal;
  porEstado.promedioResolucionDias =
    promedioCrudo === null ? null : Math.round(Number(promedioCrudo) * 10) / 10;

  const mapear = (filas: FilaAgregado[]): GrupoReporte[] =>
    filas.map((fila) => ({
      clave: fila.clave,
      etiqueta: fila.etiqueta ?? fila.clave,
      total: Number(fila.total),
    }));

  return {
    desde: filtros.desde ?? null,
    hasta: filtros.hasta ?? null,
    total: Number(totales[0].total),
    porEstado,
    porTramite: mapear(porTramite),
    porPrioridad: mapear(porPrioridad),
    vencidas: vencidasTotal,
    promedioResolucionDias: porEstado.promedioResolucionDias,
  };
}

export type ResultadoPrioridad =
  | { tipo: 'actualizada'; solicitud: SolicitudFrontend }
  | { tipo: 'no_encontrada' }
  | { tipo: 'estado_final'; estadoActual: EstadoSolicitud };

/**
 * Cambia la prioridad y, opcionalmente, la fecha límite de una solicitud.
 * Solo se permite mientras esté abierta: en un estado final ya no hay cola que ordenar.
 */
export async function updatePrioridad(
  folio: string,
  prioridad: PrioridadSolicitud,
  fechaLimite: string | null
): Promise<ResultadoPrioridad> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE solicitud SET prioridad = ?, fecha_limite = ?
     WHERE folio = ? AND estado IN ('pendiente', 'en_revision')`,
    [prioridad, fechaLimite, folio]
  );

  if (result.affectedRows === 0) {
    const [rows] = await pool.execute<FilaEstado[]>(
      'SELECT vecino_id, estado FROM solicitud WHERE folio = ?',
      [folio]
    );
    if (rows.length === 0) return { tipo: 'no_encontrada' };
    return { tipo: 'estado_final', estadoActual: rows[0].estado };
  }

  const solicitud = await getById(folio);
  if (solicitud === null) return { tipo: 'no_encontrada' };
  return { tipo: 'actualizada', solicitud };
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
