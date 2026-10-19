import type { Request, Response, NextFunction } from 'express';

export const roleMiddleware = (rolRequerido: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }
    if (req.user.rol !== rolRequerido) {
      res.status(403).json({ success: false, error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };
};
