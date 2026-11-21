import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { RequisitoDetalle, TramiteConRequisitos, TramiteDB } from '../types';

/** Fila de la consulta de requisitos agrupados. */
interface FilaRequisito extends RowDataPacket {
  id: number;
  tramite_id: string;
  descripcion: string;
  tipo: 'documento' | 'dato';
  obligatorio: number | boolean;
}

const aDetalle = (fila: FilaRequisito): RequisitoDetalle => ({
  id: String(fila.id),
  descripcion: fila.descripcion,
  tipo: fila.tipo === 'dato' ? 'dato' : 'documento',
  obligatorio: Boolean(fila.obligatorio),
});

/** Fila de la consulta de trámites. */
interface FilaTramite extends RowDataPacket, TramiteDB {}

/**
 * Devuelve el catálogo completo de trámites activos, cada uno con sus requisitos.
 *
 * Los requisitos se piden en una sola consulta y se agrupan en memoria, en vez
 * de consultar por cada trámite, para no hacer N+1 consultas.
 */
export async function getAll(): Promise<TramiteConRequisitos[]> {
  const [tramites] = await pool.execute<FilaTramite[]>(
    'SELECT id, nombre, categoria, descripcion, icono, activo FROM tramite WHERE activo = TRUE ORDER BY nombre ASC'
  );

  const [requisitos] = await pool.execute<FilaRequisito[]>(
    'SELECT id, tramite_id, descripcion, tipo, obligatorio FROM requisito ORDER BY tramite_id ASC, orden ASC, id ASC'
  );

  const requisitosPorTramite = new Map<string, RequisitoDetalle[]>();
  for (const requisito of requisitos) {
    const lista = requisitosPorTramite.get(requisito.tramite_id) ?? [];
    lista.push(aDetalle(requisito));
    requisitosPorTramite.set(requisito.tramite_id, lista);
  }

  return tramites.map((tramite) => ({
    id: tramite.id,
    nombre: tramite.nombre,
    categoria: tramite.categoria,
    descripcion: tramite.descripcion,
    icono: tramite.icono,
    requisitos: (requisitosPorTramite.get(tramite.id) ?? []).map((r) => r.descripcion),
    requisitosDetalle: requisitosPorTramite.get(tramite.id) ?? [],
  }));
}

/**
 * Busca un trámite por su identificador, sin los requisitos.
 *
 * @param id Identificador del trámite, por ejemplo 'cert-residencia'.
 * @returns El trámite o null si no existe.
 */
export async function getById(id: string): Promise<TramiteDB | null> {
  const [rows] = await pool.execute<FilaTramite[]>(
    'SELECT id, nombre, categoria, descripcion, icono, activo FROM tramite WHERE id = ?',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

/**
 * Busca un trámite con sus requisitos en el formato que consume el frontend.
 *
 * @param id Identificador del trámite.
 * @returns El trámite con su lista de requisitos, o null si no existe o está inactivo.
 */
export async function getByIdWithRequisitos(id: string): Promise<TramiteConRequisitos | null> {
  const tramite = await getById(id);
  if (tramite === null || !tramite.activo) {
    return null;
  }

  const [requisitos] = await pool.execute<FilaRequisito[]>(
    'SELECT id, tramite_id, descripcion, tipo, obligatorio FROM requisito WHERE tramite_id = ? ORDER BY orden ASC, id ASC',
    [id]
  );

  return {
    id: tramite.id,
    nombre: tramite.nombre,
    categoria: tramite.categoria,
    descripcion: tramite.descripcion,
    icono: tramite.icono,
    requisitos: requisitos.map((requisito) => requisito.descripcion),
    requisitosDetalle: requisitos.map(aDetalle),
  };
}
