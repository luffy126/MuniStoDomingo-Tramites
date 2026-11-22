import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { formatearFechaHora } from '../types';
import type { DocumentoDB, DocumentoSolicitud } from '../types';

/** Tamaño máximo por archivo. Debe coincidir con el `limit` de express.raw. */
export const LIMITE_BYTES = 5 * 1024 * 1024;
/** Máximo de documentos por solicitud. */
export const LIMITE_DOCUMENTOS = 10;

const enteroPositivo = (valor: string | undefined, porDefecto: number): number => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
};

/**
 * Espacio total que puede ocupar un vecino sumando todos sus adjuntos (50 MB
 * por defecto). Sin este tope, crear solicitudes y adjuntar 10 archivos a cada
 * una permitiría llenar el disco del servidor.
 */
export const CUOTA_BYTES_USUARIO = enteroPositivo(
  process.env.CUOTA_DOCUMENTOS_MB, 50
) * 1024 * 1024;

/** Carpeta de almacenamiento local del MVP; se puede mover con UPLOAD_DIR. */
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
);

const TIPOS_PERMITIDOS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

/** Detecta el tipo real por la firma del archivo, sin confiar en el encabezado. */
export function detectarTipo(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'application/pdf';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  return null;
}

/**
 * Normaliza el nombre visible y le impone la extensión que corresponde al tipo
 * real. Así un PDF llamado `factura.html` se muestra como `factura.pdf` y un
 * polyglot con doble extensión no engaña al vecino ni al funcionario.
 */
export function nombreSeguro(nombre: string, tipo: string): string {
  const extension = TIPOS_PERMITIDOS[tipo] ?? '';
  const sinRutas = String(nombre).split(/[\\/]/).pop() ?? '';
  const limpio = sinRutas
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[<>:"|?*]/g, '-')
    .trim();
  const ultimoPunto = limpio.lastIndexOf('.');
  const base = ultimoPunto > 0 ? limpio.slice(0, ultimoPunto) : limpio;
  const nombreFinal = base === '' || base === '.' || base === '..' ? 'documento' : base;
  return `${nombreFinal.slice(0, 240)}${extension}`;
}

interface FilaSolicitud extends RowDataPacket {
  id: number;
  vecino_id: number;
  estado: string;
  tramite_id: string;
}

interface FilaDocumento extends DocumentoDB, RowDataPacket {
  subido_por_nombre: string | null;
  requisito_descripcion?: string | null;
  /** Presente solo en las consultas que hacen JOIN con solicitud. */
  estado?: string;
}

interface FilaTotal extends RowDataPacket {
  total: number;
}

function aFrontend(fila: FilaDocumento): DocumentoSolicitud {
  return {
    id: String(fila.id),
    nombre: fila.nombre_original,
    tipo: fila.tipo,
    tamano: Number(fila.tamano),
    fecha: formatearFechaHora(fila.creado_en),
    subidoPor: fila.subido_por_nombre,
    ...(fila.requisito_id != null ? { requisitoId: String(fila.requisito_id) } : {}),
    ...(fila.requisito_descripcion ? { requisito: fila.requisito_descripcion } : {}),
  };
}

/** Lista los documentos de una solicitud por folio, del más antiguo al más nuevo. */
export async function listar(folio: string): Promise<DocumentoSolicitud[]> {
  const [filas] = await pool.execute<FilaDocumento[]>(
    `SELECT d.id, d.solicitud_id, d.subido_por, d.nombre_original, d.nombre_almacenado,
            d.tipo, d.tamano, d.requisito_id, d.creado_en, u.nombre AS subido_por_nombre,
            r.descripcion AS requisito_descripcion
     FROM documento d
     JOIN solicitud s ON d.solicitud_id = s.id
     LEFT JOIN usuario u ON d.subido_por = u.id
     LEFT JOIN requisito r ON d.requisito_id = r.id
     WHERE s.folio = ?
     ORDER BY d.creado_en ASC, d.id ASC`,
    [folio]
  );
  return filas.map(aFrontend);
}

export type ResultadoSubida =
  | { tipo: 'ok'; documento: DocumentoSolicitud }
  | { tipo: 'no_encontrada' }
  | { tipo: 'estado_final' }
  | { tipo: 'limite' }
  | { tipo: 'cuota' }
  | { tipo: 'requisito_invalido' }
  | { tipo: 'tipo_invalido' }
  | { tipo: 'archivo_vacio' }
  | { tipo: 'muy_grande' };

/**
 * Guarda un adjunto del vecino dueño. Solo se acepta mientras la solicitud esté
 * abierta (pendiente o en revisión), hasta 10 documentos de 5 MB.
 *
 * El nombre visible se limpia y el archivo se guarda con un UUID, así que el
 * nombre que envía el cliente nunca se usa como ruta.
 */
export async function subir(
  folio: string,
  usuarioId: number,
  buffer: Buffer,
  nombre: string,
  tipoDeclarado: string,
  requisitoId: number | null = null
): Promise<ResultadoSubida> {
  if (buffer.length === 0) return { tipo: 'archivo_vacio' };
  if (buffer.length > LIMITE_BYTES) return { tipo: 'muy_grande' };

  const [solicitudes] = await pool.execute<FilaSolicitud[]>(
    'SELECT id, vecino_id, estado, tramite_id FROM solicitud WHERE folio = ?',
    [folio]
  );
  if (solicitudes.length === 0 || solicitudes[0].vecino_id !== usuarioId) {
    return { tipo: 'no_encontrada' };
  }
  const solicitud = solicitudes[0];
  if (solicitud.estado === 'aprobado' || solicitud.estado === 'rechazado') {
    return { tipo: 'estado_final' };
  }

  // El requisito debe ser de tipo documento y del mismo trámite de la solicitud.
  if (requisitoId !== null) {
    const [requisitos] = await pool.execute<FilaTotal[]>(
      "SELECT COUNT(*) AS total FROM requisito WHERE id = ? AND tramite_id = ? AND tipo = 'documento'",
      [requisitoId, solicitud.tramite_id]
    );
    if (Number(requisitos[0].total) === 0) return { tipo: 'requisito_invalido' };
  }

  const tipoReal = detectarTipo(buffer);
  const tipo = tipoDeclarado === 'image/jpg' ? 'image/jpeg' : tipoDeclarado;
  if (tipoReal === null || tipoReal !== tipo || TIPOS_PERMITIDOS[tipo] === undefined) {
    return { tipo: 'tipo_invalido' };
  }

  const [totales] = await pool.execute<FilaTotal[]>(
    'SELECT COUNT(*) AS total FROM documento WHERE solicitud_id = ?',
    [solicitud.id]
  );
  if (Number(totales[0].total) >= LIMITE_DOCUMENTOS) return { tipo: 'limite' };

  const [usados] = await pool.execute<FilaTotal[]>(
    'SELECT COALESCE(SUM(tamano), 0) AS total FROM documento WHERE subido_por = ?',
    [usuarioId]
  );
  if (Number(usados[0].total) + buffer.length > CUOTA_BYTES_USUARIO) return { tipo: 'cuota' };

  await mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 });
  const nombreAlmacenado = `${randomUUID()}${TIPOS_PERMITIDOS[tipo]}`;
  const ruta = path.join(UPLOAD_DIR, nombreAlmacenado);
  await writeFile(ruta, buffer, { flag: 'wx', mode: 0o600 });

  try {
    const [resultado] = await pool.execute<ResultSetHeader>(
      `INSERT INTO documento
         (solicitud_id, subido_por, nombre_original, nombre_almacenado, tipo, tamano, requisito_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [solicitud.id, usuarioId, nombreSeguro(nombre, tipo), nombreAlmacenado, tipo, buffer.length, requisitoId]
    );

    const [filas] = await pool.execute<FilaDocumento[]>(
      `SELECT d.id, d.solicitud_id, d.subido_por, d.nombre_original, d.nombre_almacenado,
              d.tipo, d.tamano, d.requisito_id, d.creado_en, u.nombre AS subido_por_nombre,
              r.descripcion AS requisito_descripcion
       FROM documento d
       LEFT JOIN usuario u ON d.subido_por = u.id
       LEFT JOIN requisito r ON d.requisito_id = r.id
       WHERE d.id = ?`,
      [resultado.insertId]
    );
    return { tipo: 'ok', documento: aFrontend(filas[0]) };
  } catch (error) {
    // Si la fila no se guardó, el archivo no debe quedar huérfano.
    await unlink(ruta).catch(() => undefined);
    throw error;
  }
}

export interface DocumentoDescarga {
  ruta: string;
  nombre: string;
  tipo: string;
  tamano: number;
}

/**
 * Datos para descargar un documento, comprobando que pertenezca al folio.
 * La autorización por rol/dueño se resuelve en el controlador.
 */
export async function obtenerParaDescarga(
  folio: string,
  documentoId: number
): Promise<DocumentoDescarga | null> {
  const [filas] = await pool.execute<FilaDocumento[]>(
    `SELECT d.id, d.solicitud_id, d.subido_por, d.nombre_original, d.nombre_almacenado,
            d.tipo, d.tamano, d.creado_en, u.nombre AS subido_por_nombre
     FROM documento d
     JOIN solicitud s ON d.solicitud_id = s.id
     LEFT JOIN usuario u ON d.subido_por = u.id
     WHERE s.folio = ? AND d.id = ?`,
    [folio, documentoId]
  );
  if (filas.length === 0) return null;
  return {
    ruta: path.join(UPLOAD_DIR, path.basename(filas[0].nombre_almacenado)),
    nombre: filas[0].nombre_original,
    tipo: filas[0].tipo,
    tamano: Number(filas[0].tamano),
  };
}

/** Rutas físicas de una solicitud, usadas para borrar archivos al cancelar. */
export async function rutasPorFolio(folio: string): Promise<string[]> {
  const [filas] = await pool.execute<FilaDocumento[]>(
    `SELECT d.nombre_almacenado
     FROM documento d JOIN solicitud s ON d.solicitud_id = s.id
     WHERE s.folio = ?`,
    [folio]
  );
  return filas.map((fila) => path.join(UPLOAD_DIR, path.basename(fila.nombre_almacenado)));
}

/** Borra archivos huérfanos tras un borrado en cascada o una cancelación. */
export async function eliminarArchivos(rutas: string[]): Promise<void> {
  await Promise.all(rutas.map((ruta) => unlink(ruta).catch(() => undefined)));
}

export type ResultadoEliminacion =
  | { tipo: 'ok' }
  | { tipo: 'no_encontrada' }
  | { tipo: 'estado_final' };

/**
 * Quita un adjunto del vecino dueño mientras la solicitud siga abierta.
 * La fila se borra primero; si falla el `unlink`, no queda metadata apuntando
 * a un archivo inexistente y el huérfano se puede reconciliar después.
 */
export async function eliminar(
  folio: string,
  documentoId: number,
  usuarioId: number
): Promise<ResultadoEliminacion> {
  const [filas] = await pool.execute<FilaDocumento[]>(
    `SELECT d.id, d.nombre_almacenado, s.estado
     FROM documento d
     JOIN solicitud s ON d.solicitud_id = s.id
     WHERE s.folio = ? AND d.id = ? AND s.vecino_id = ?`,
    [folio, documentoId, usuarioId]
  );
  if (filas.length === 0) return { tipo: 'no_encontrada' };
  if (filas[0].estado === 'aprobado' || filas[0].estado === 'rechazado') {
    return { tipo: 'estado_final' };
  }

  const [resultado] = await pool.execute<ResultSetHeader>(
    'DELETE FROM documento WHERE id = ? AND solicitud_id IN (SELECT id FROM solicitud WHERE folio = ? AND vecino_id = ?)',
    [documentoId, folio, usuarioId]
  );
  if (resultado.affectedRows === 0) return { tipo: 'no_encontrada' };

  await eliminarArchivos([
    path.join(UPLOAD_DIR, path.basename(filas[0].nombre_almacenado)),
  ]);
  return { tipo: 'ok' };
}
