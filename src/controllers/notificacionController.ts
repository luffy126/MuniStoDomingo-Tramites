import { Request, Response, NextFunction } from 'express';
import * as notificacionService from '../services/notificacionService';

/**
 * GET /api/notificaciones
 * Devuelve las notificaciones del usuario autenticado.
 */
export const listarNotificaciones = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notificaciones = await notificacionService.getByUsuario(userId);
    res.status(200).json({ success: true, data: notificaciones });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notificaciones/:id
 * Marca una notificación como leída.
 */
export const marcarLeida = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Se exige un entero positivo completo: parseInt aceptaría '5abc' como 5.
    const param = String(req.params.id);
    if (!/^\d+$/.test(param)) {
      res.status(400).json({ success: false, error: 'ID inválido' });
      return;
    }
    const id = Number(param);

    const resultado = await notificacionService.markAsRead(id, req.user!.id);

    if (!resultado) {
      res.status(404).json({ success: false, error: 'Notificación no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Notificación marcada como leída' } });
  } catch (err) {
    next(err);
  }
};
