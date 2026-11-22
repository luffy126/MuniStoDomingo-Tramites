import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import type { Request, Response, NextFunction } from 'express';
import * as documentoService from '../services/documentoService';
import { getOwnerId } from '../services/solicitudService';

const puedeVer = async (folio: string, user: Express.Request['user']): Promise<boolean> => {
  if (!user) return false;
  if (user.rol === 'funcionario') return (await getOwnerId(folio)) !== null;
  return (await getOwnerId(folio)) === user.id;
};

/** Los adjuntos son datos personales: nunca deben guardarse en caché compartida. */
const sinCache = (res: Response): void => {
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Authorization');
};

/** Auditoría mínima sin token, correo ni nombre de archivo en los logs. */
const auditar = (
  req: Request,
  accion: 'listar' | 'subir' | 'descargar' | 'eliminar',
  resultado: 'ok' | 'rechazado' | 'error',
  extra: Record<string, unknown> = {}
): void => {
  console.info('[auditoria-documentos]', JSON.stringify({
    fecha: new Date().toISOString(),
    accion,
    resultado,
    usuarioId: req.user?.id ?? null,
    rol: req.user?.rol ?? null,
    folio: req.params.id ?? null,
    ip: req.ip ?? null,
    ...extra,
  }));
};

/** Codificación RFC 5987 segura para `filename*` con fallback ASCII. */
const cabeceraDescarga = (nombre: string): string => {
  const ascii = nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const utf8 = encodeURIComponent(nombre).replace(/['()*]/g, (caracter) =>
    `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
};

/**
 * GET /api/solicitudes/:id/documentos
 * Lista los adjuntos de una solicitud. El vecino solo ve los de sus folios.
 */
export const listarDocumentos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    sinCache(res);
    const folio = String(req.params.id);
    if (!(await puedeVer(folio, req.user))) {
      auditar(req, 'listar', 'rechazado');
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }
    const documentos = await documentoService.listar(folio);
    auditar(req, 'listar', 'ok', { total: documentos.length });
    res.status(200).json({ success: true, data: documentos });
  } catch (error) {
    auditar(req, 'listar', 'error');
    next(error);
  }
};

/**
 * POST /api/solicitudes/:id/documentos
 * Body: binario (application/pdf, image/jpeg o image/png), máximo 5 MB.
 * Nombre original en el encabezado X-Nombre-Archivo (URI-encoded).
 */
export const subirDocumento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    sinCache(res);
    const folio = String(req.params.id);
    if (!Buffer.isBuffer(req.body)) {
      auditar(req, 'subir', 'rechazado', { motivo: 'cuerpo_invalido' });
      res.status(400).json({
        success: false,
        error: 'Envía el archivo como cuerpo binario (PDF, JPG o PNG).',
      });
      return;
    }

    const tipo = (req.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    let nombre = 'documento';
    const nombreCodificado = req.get('x-nombre-archivo');
    if (nombreCodificado) {
      try {
        nombre = decodeURIComponent(nombreCodificado);
      } catch {
        nombre = nombreCodificado;
      }
    }

    // X-Requisito-Id (opcional): el requisito del trámite que cumple este archivo.
    const requisitoCabecera = req.get('x-requisito-id');
    let requisitoId: number | null = null;
    if (requisitoCabecera !== undefined && requisitoCabecera !== '') {
      if (!/^\d{1,9}$/.test(requisitoCabecera)) {
        auditar(req, 'subir', 'rechazado', { motivo: 'requisito_invalido' });
        res.status(400).json({ success: false, error: 'El requisito indicado no es válido' });
        return;
      }
      requisitoId = Number(requisitoCabecera);
    }

    const resultado = await documentoService.subir(folio, req.user!.id, req.body, nombre, tipo, requisitoId);
    if (resultado.tipo !== 'ok') {
      auditar(req, 'subir', 'rechazado', { motivo: resultado.tipo });
    }
    if (resultado.tipo === 'no_encontrada') {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }
    if (resultado.tipo === 'estado_final') {
      res.status(409).json({
        success: false,
        error: 'La solicitud ya fue resuelta y no admite nuevos documentos',
      });
      return;
    }
    if (resultado.tipo === 'limite') {
      res.status(409).json({
        success: false,
        error: `Puedes adjuntar como máximo ${documentoService.LIMITE_DOCUMENTOS} documentos por solicitud`,
      });
      return;
    }
    if (resultado.tipo === 'requisito_invalido') {
      res.status(400).json({ success: false, error: 'El requisito indicado no corresponde a este trámite' });
      return;
    }
    if (resultado.tipo === 'cuota') {
      res.status(409).json({
        success: false,
        error: `Alcanzaste el espacio máximo para adjuntos (${documentoService.CUOTA_BYTES_USUARIO / (1024 * 1024)} MB). Elimina documentos que ya no necesites.`,
      });
      return;
    }
    if (resultado.tipo === 'muy_grande') {
      res.status(413).json({ success: false, error: 'El archivo no puede superar 5 MB' });
      return;
    }
    if (resultado.tipo === 'archivo_vacio') {
      res.status(400).json({ success: false, error: 'El archivo está vacío' });
      return;
    }
    if (resultado.tipo === 'tipo_invalido') {
      res.status(400).json({
        success: false,
        error: 'Formato no permitido. Adjunta un PDF, JPG o PNG válido.',
      });
      return;
    }

    auditar(req, 'subir', 'ok', { documentoId: Number(resultado.documento.id) });
    res.status(201).json({ success: true, data: resultado.documento });
  } catch (error) {
    auditar(req, 'subir', 'error');
    next(error);
  }
};

/**
 * GET /api/solicitudes/:id/documentos/:docId/descarga
 * Descarga autenticada; nunca expone la carpeta de almacenamiento.
 */
export const descargarDocumento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    sinCache(res);
    const folio = String(req.params.id);
    const documentoId = Number(req.params.docId);
    if (!Number.isInteger(documentoId) || documentoId <= 0) {
      auditar(req, 'descargar', 'rechazado', { motivo: 'id_invalido' });
      res.status(400).json({ success: false, error: 'Documento no válido' });
      return;
    }
    if (!(await puedeVer(folio, req.user))) {
      auditar(req, 'descargar', 'rechazado', { documentoId });
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    const documento = await documentoService.obtenerParaDescarga(folio, documentoId);
    if (!documento) {
      auditar(req, 'descargar', 'rechazado', { documentoId, motivo: 'no_encontrado' });
      res.status(404).json({ success: false, error: 'Documento no encontrado' });
      return;
    }

    let tamano = 0;
    try {
      const info = await stat(documento.ruta);
      if (!info.isFile() || info.size !== documento.tamano) {
        throw Object.assign(new Error('Archivo inconsistente'), { code: 'ENOENT' });
      }
      tamano = info.size;
    } catch {
      auditar(req, 'descargar', 'rechazado', { documentoId, motivo: 'archivo_no_disponible' });
      res.status(404).json({ success: false, error: 'El archivo ya no está disponible' });
      return;
    }

    res.setHeader('Content-Type', documento.tipo);
    res.setHeader('Content-Length', tamano);
    res.setHeader('Content-Disposition', cabeceraDescarga(documento.nombre));
    auditar(req, 'descargar', 'ok', { documentoId });

    try {
      await pipeline(createReadStream(documento.ruta), res);
    } catch {
      // Si el cliente cortó la descarga o el archivo desapareció a mitad del
      // stream, no se puede responder con JSON: solo se cierra la conexión.
      res.destroy();
    }
  } catch (error) {
    auditar(req, 'descargar', 'error');
    next(error);
  }
};

/**
 * DELETE /api/solicitudes/:id/documentos/:docId
 * El vecino dueño puede quitar un adjunto mientras la solicitud siga abierta.
 * 204 sin cuerpo; 404 si no existe o es de otro vecino; 409 si ya está resuelta.
 */
export const eliminarDocumento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    sinCache(res);
    const folio = String(req.params.id);
    const documentoId = Number(req.params.docId);
    if (!Number.isInteger(documentoId) || documentoId <= 0) {
      auditar(req, 'eliminar', 'rechazado', { motivo: 'id_invalido' });
      res.status(400).json({ success: false, error: 'Documento no válido' });
      return;
    }

    const resultado = await documentoService.eliminar(folio, documentoId, req.user!.id);
    if (resultado.tipo === 'no_encontrada') {
      auditar(req, 'eliminar', 'rechazado', { documentoId });
      res.status(404).json({ success: false, error: 'Documento no encontrado' });
      return;
    }
    if (resultado.tipo === 'estado_final') {
      auditar(req, 'eliminar', 'rechazado', { documentoId, motivo: 'estado_final' });
      res.status(409).json({
        success: false,
        error: 'La solicitud ya fue resuelta y sus documentos no se pueden modificar',
      });
      return;
    }

    auditar(req, 'eliminar', 'ok', { documentoId });
    res.status(204).end();
  } catch (error) {
    auditar(req, 'eliminar', 'error');
    next(error);
  }
};
