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

    const vecinoId = req.user!.id;

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

    res.status(200).json({ success: true, data: resultado.solicitud });
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
    const resultado = await solicitudService.cancelar(folio, req.user!.id);

    if (resultado === 'no_encontrada') {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
      return;
    }

    if (resultado === 'no_pendiente') {
      res.status(409).json({ success: false, error: 'Solo se pueden cancelar solicitudes pendientes' });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
