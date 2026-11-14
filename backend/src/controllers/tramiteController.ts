import { Request, Response, NextFunction } from 'express';
import * as tramiteService from '../services/tramiteService';

/**
 * GET /api/tramites
 * Devuelve todos los trámites activos, cada uno con sus requisitos.
 */
export const listarTramites = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tramites = await tramiteService.getAll();
    res.status(200).json({ success: true, data: tramites });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tramites/:id
 * Devuelve un trámite con sus requisitos. 404 si no existe.
 */
export const obtenerTramite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const tramite = await tramiteService.getByIdWithRequisitos(id);

    if (!tramite) {
      res.status(404).json({ success: false, error: 'Trámite no encontrado' });
      return;
    }

    res.status(200).json({ success: true, data: tramite });
  } catch (err) {
    next(err);
  }
};
