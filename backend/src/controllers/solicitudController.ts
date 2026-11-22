import { Request, Response, NextFunction } from 'express';
import * as solicitudService from '../services/solicitudService';
import * as tramiteService from '../services/tramiteService';
import * as documentoService from '../services/documentoService';
import type { EstadoSolicitud, PrioridadSolicitud } from '../types';
import { parsePagination } from '../utils/pagination';

const ESTADOS_VALIDOS: EstadoSolicitud[] = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];
const PRIORIDADES_VALIDAS: PrioridadSolicitud[] = ['baja', 'media', 'alta', 'urgente'];
const ORDENES_VALIDOS: solicitudService.OrdenSolicitudes[] = [
  'reciente', 'antigua', 'prioridad', 'limite',
];

const esEstadoValido = (valor: unknown): valor is EstadoSolicitud =>
  typeof valor === 'string' && (ESTADOS_VALIDOS as string[]).includes(valor);

const esPrioridadValida = (valor: unknown): valor is PrioridadSolicitud =>
  typeof valor === 'string' && (PRIORIDADES_VALIDAS as string[]).includes(valor);

const esOrdenValido = (valor: unknown): valor is solicitudService.OrdenSolicitudes =>
  typeof valor === 'string' && (ORDENES_VALIDOS as string[]).includes(valor);

const esFechaISO = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
  !Number.isNaN(new Date(`${valor}T00:00:00`).getTime());

/**
 * POST /api/solicitudes
 * Crea una nueva solicitud (solo vecinos).
 * Body: { tramiteId: string, observaciones?: string }
 */
export const crearSolicitud = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tramiteId, observaciones } = req.body ?? {};

    if (!tramiteId || typeof tramiteId !== 'string') {
      res.status(400).json({ success: false, error: 'tramiteId es requerido' });
      return;
    }

    if (observaciones !== undefined && typeof observaciones !== 'string') {
      res.status(400).json({ success: false, error: 'observaciones debe ser texto' });
      return;
    }

    // Se valida aquí para responder 400 en vez del 500 que daría la clave foránea.
    const tramite = await tramiteService.getById(tramiteId);
    if (!tramite || !tramite.activo) {
      res.status(400).json({ success: false, error: 'El trámite indicado no existe' });
      return;
    }

    const vecinoId = req.user!.id;

    const maximo = solicitudService.maxSolicitudesAbiertas();
    if ((await solicitudService.contarAbiertas(vecinoId)) >= maximo) {
      res.status(409).json({
        success: false,
        error: `Tienes ${maximo} solicitudes abiertas. Espera a que se resuelva alguna o cancela las que no necesites.`,
      });
      return;
    }

    const nueva = await solicitudService.create(tramiteId, vecinoId, observaciones);
    res.status(201).json({ success: true, data: nueva });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/solicitudes
 * - Si el usuario es vecino → devuelve solo las suyas.
 * - Si es funcionario → devuelve todas, opcionalmente filtradas por ?estado=
 * Paginado con ?page= (por defecto 1) y ?limit= (por defecto 20, máximo 100).
 * Responde { success, data: [...], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }.
 */
export const listarSolicitudes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const pagination = parsePagination(req.query);

    if (user.rol === 'vecino') {
      const pagina = await solicitudService.getByVecino(user.id, pagination);
      res.status(200).json({ success: true, data: pagina.items, pagination: pagina.pagination });
      return;
    }

    const { estado, prioridad, desde, hasta, tramiteId, q, orden, vencidas } = req.query;

    if (estado !== undefined && !esEstadoValido(estado)) {
      res.status(400).json({
        success: false,
        error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
      });
      return;
    }
    if (prioridad !== undefined && !esPrioridadValida(prioridad)) {
      res.status(400).json({
        success: false,
        error: `prioridad debe ser uno de: ${PRIORIDADES_VALIDAS.join(', ')}`,
      });
      return;
    }
    if (orden !== undefined && !esOrdenValido(orden)) {
      res.status(400).json({
        success: false,
        error: `orden debe ser uno de: ${ORDENES_VALIDOS.join(', ')}`,
      });
      return;
    }
    if (desde !== undefined && !esFechaISO(desde)) {
      res.status(400).json({ success: false, error: 'desde debe ser una fecha YYYY-MM-DD' });
      return;
    }
    if (hasta !== undefined && !esFechaISO(hasta)) {
      res.status(400).json({ success: false, error: 'hasta debe ser una fecha YYYY-MM-DD' });
      return;
    }
    if (desde !== undefined && hasta !== undefined && String(desde) > String(hasta)) {
      res.status(400).json({ success: false, error: 'desde no puede ser posterior a hasta' });
      return;
    }

    const filtros: solicitudService.FiltrosSolicitudes = {
      ...(estado !== undefined ? { estado } : {}),
      ...(prioridad !== undefined ? { prioridad } : {}),
      ...(desde !== undefined ? { desde } : {}),
      ...(hasta !== undefined ? { hasta } : {}),
      ...(typeof tramiteId === 'string' && tramiteId !== '' ? { tramiteId } : {}),
      ...(typeof q === 'string' && q.trim() !== '' ? { q: q.trim().slice(0, 120) } : {}),
      ...(orden !== undefined ? { orden } : {}),
      ...(vencidas === '1' || vencidas === 'true' ? { vencidas: true } : {}),
    };

    const pagina = await solicitudService.getAll(filtros, pagination);
    res.status(200).json({ success: true, data: pagina.items, pagination: pagina.pagination });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/solicitudes/:id
 * Detalle de una solicitud. El id es el folio (ej. SOL-1001), que es como el
 * frontend identifica las solicitudes. 404 si no existe o si un vecino pide
 * una que no es suya.
 */
export const obtenerSolicitud = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folio = String(req.params.id);
    const user = req.user!;

    // Un vecino solo ve las suyas. Se responde 404 (no 403) para no revelar
    // que el folio existe.
    if (user.rol === 'vecino' && (await solicitudService.getOwnerId(folio)) !== user.id) {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    const solicitud = await solicitudService.getById(folio);

    if (!solicitud) {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: solicitud });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/solicitudes/:id
 * Cambia el estado de una solicitud (solo funcionarios). El id es el folio.
 * Body: { estado: EstadoSolicitud, observaciones?: string }
 * Valida la transición (409 si no es válida; pasar al mismo estado exige
 * observaciones) y crea un aviso para el vecino.
 */
export const actualizarEstado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folio = String(req.params.id);
    const { estado, observaciones } = req.body ?? {};

    if (!esEstadoValido(estado)) {
      res.status(400).json({
        success: false,
        error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    if (observaciones !== undefined && typeof observaciones !== 'string') {
      res.status(400).json({ success: false, error: 'observaciones debe ser texto' });
      return;
    }

    const funcionarioId = req.user!.id;
    // Se recorta antes de guardar; un texto en blanco equivale a no enviar observaciones.
    const resultado = await solicitudService.updateEstado(
      folio,
      estado,
      funcionarioId,
      observaciones?.trim() || undefined
    );

    if (resultado.tipo === 'no_encontrada') {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    if (resultado.tipo === 'transicion_invalida') {
      res.status(409).json({
        success: false,
        error: `No se puede pasar una solicitud de "${resultado.estadoActual}" a "${estado}"`,
      });
      return;
    }

    // El PATCH devuelve el detalle completo para que la UI conserve la línea de
    // tiempo recién creada sin tener que hacer una segunda petición.
    const detalle = (await solicitudService.getById(folio)) ?? resultado.solicitud;
    res.status(200).json({ success: true, data: detalle });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/solicitudes/reportes?desde=&hasta=&tramiteId=
 * Agregados para el panel de reportes (solo funcionarios).
 */
export const obtenerReportes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { desde, hasta, tramiteId } = req.query;
    if (desde !== undefined && !esFechaISO(desde)) {
      res.status(400).json({ success: false, error: 'desde debe ser una fecha YYYY-MM-DD' });
      return;
    }
    if (hasta !== undefined && !esFechaISO(hasta)) {
      res.status(400).json({ success: false, error: 'hasta debe ser una fecha YYYY-MM-DD' });
      return;
    }
    if (desde !== undefined && hasta !== undefined && String(desde) > String(hasta)) {
      res.status(400).json({ success: false, error: 'desde no puede ser posterior a hasta' });
      return;
    }

    const reporte = await solicitudService.getReporte({
      ...(desde !== undefined ? { desde } : {}),
      ...(hasta !== undefined ? { hasta } : {}),
      ...(typeof tramiteId === 'string' && tramiteId !== '' ? { tramiteId } : {}),
    });
    res.status(200).json({ success: true, data: reporte });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/solicitudes/:id/prioridad
 * Ajusta prioridad y fecha límite de una solicitud abierta (solo funcionarios).
 * Body: { prioridad: 'baja'|'media'|'alta'|'urgente', fechaLimite?: 'YYYY-MM-DD'|null }
 */
export const actualizarPrioridad = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folio = String(req.params.id);
    const { prioridad, fechaLimite } = req.body ?? {};

    if (!esPrioridadValida(prioridad)) {
      res.status(400).json({
        success: false,
        error: `prioridad debe ser uno de: ${PRIORIDADES_VALIDAS.join(', ')}`,
      });
      return;
    }
    if (fechaLimite !== undefined && fechaLimite !== null && fechaLimite !== '' && !esFechaISO(fechaLimite)) {
      res.status(400).json({ success: false, error: 'fechaLimite debe ser una fecha YYYY-MM-DD o null' });
      return;
    }

    const resultado = await solicitudService.updatePrioridad(
      folio,
      prioridad,
      typeof fechaLimite === 'string' && fechaLimite !== '' ? fechaLimite : null
    );

    if (resultado.tipo === 'no_encontrada') {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }
    if (resultado.tipo === 'estado_final') {
      res.status(409).json({
        success: false,
        error: `La solicitud ya está "${resultado.estadoActual}" y no admite cambios de prioridad`,
      });
      return;
    }

    const detalle = (await solicitudService.getById(folio)) ?? resultado.solicitud;
    res.status(200).json({ success: true, data: detalle });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/solicitudes/:id
 * El vecino dueño cancela una solicitud que sigue pendiente (solo vecinos).
 * El id es el folio. 204 sin cuerpo; 404 si no existe o es de otro vecino;
 * 409 si ya no está pendiente.
 */
export const cancelarSolicitud = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folio = String(req.params.id);
    // Se capturan antes del DELETE: la FK en cascada borra la metadata.
    const rutas = await documentoService.rutasPorFolio(folio);
    const resultado = await solicitudService.cancelar(folio, req.user!.id);

    if (resultado === 'no_encontrada') {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    if (resultado === 'no_pendiente') {
      res.status(409).json({ success: false, error: 'Solo se pueden cancelar solicitudes pendientes' });
      return;
    }

    await documentoService.eliminarArchivos(rutas);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
