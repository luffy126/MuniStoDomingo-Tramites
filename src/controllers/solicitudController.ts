import { Request, Response, NextFunction } from 'express';
import * as solicitudService from '../services/solicitudService';
import * as tramiteService from '../services/tramiteService';
import type { EstadoSolicitud } from '../types';

const ESTADOS_VALIDOS: EstadoSolicitud[] = ['pendiente', 'en_revision', 'aprobado', 'rechazado'];

const esEstadoValido = (valor: unknown): valor is EstadoSolicitud =>
  typeof valor === 'string' && (ESTADOS_VALIDOS as string[]).includes(valor);

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

    const folio = await solicitudService.generarFolio();
    const vecinoId = req.user!.id;

    const nueva = await solicitudService.create(folio, tramiteId, vecinoId, observaciones);
    res.status(201).json({ success: true, data: nueva });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/solicitudes
 * - Si el usuario es vecino → devuelve solo las suyas.
 * - Si es funcionario → devuelve todas, opcionalmente filtradas por ?estado=
 */
export const listarSolicitudes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    if (user.rol === 'vecino') {
      const solicitudes = await solicitudService.getByVecino(user.id);
      res.status(200).json({ success: true, data: solicitudes });
      return;
    }

    const { estado } = req.query;
    if (estado !== undefined && !esEstadoValido(estado)) {
      res.status(400).json({
        success: false,
        error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
      });
      return;
    }

    const solicitudes = await solicitudService.getAll(estado);
    res.status(200).json({ success: true, data: solicitudes });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/solicitudes/:id
 * Detalle de una solicitud. El id es el folio (ej. SOL-1001), que es como el
 * frontend identifica las solicitudes. 404 si no existe.
 */
export const obtenerSolicitud = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folio = String(req.params.id);
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
    const actualizada = await solicitudService.updateEstado(
      folio,
      estado,
      funcionarioId,
      observaciones
    );

    if (!actualizada) {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: actualizada });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/solicitudes/reportes
 * Resumen de solicitudes por estado (solo funcionarios).
 */
export const obtenerReportes = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resumen = await solicitudService.getResumenPorEstado();
    res.status(200).json({ success: true, data: resumen });
  } catch (err) {
    next(err);
  }
};
