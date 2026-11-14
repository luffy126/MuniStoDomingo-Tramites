import { Request, Response, NextFunction } from 'express';
import * as notificacionService from '../services/notificacionService';
import { parsePagination } from '../utils/pagination';

/**
 * GET /api/notificaciones
 * Devuelve las notificaciones del usuario autenticado, paginadas con ?page=
 * (por defecto 1) y ?limit= (por defecto 20, máximo 100).
 * `pagination.unread` cuenta las no leídas de todas las páginas.
 */
export const listarNotificaciones = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const pagina = await notificacionService.getByUsuario(userId, parsePagination(req.query));
    res.status(200).json({
      success: true,
      data: pagina.items,
      pagination: { ...pagina.pagination, unread: pagina.noLeidas },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notificaciones/:id
 * Marca una notificación como leída y devuelve la notificación actualizada.
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

    const notificacion = await notificacionService.markAsRead(id, req.user!.id);

    if (!notificacion) {
      res.status(404).json({ success: false, error: 'Notificación no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: notificacion });
  } catch (err) {
    next(err);
  }
};
