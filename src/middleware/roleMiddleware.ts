import { Request, Response, NextFunction } from 'express';

// TODO: Francisco reemplazará esto con la verificación real de rol
const roleMiddleware = (rol: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }
    if (req.user.rol !== rol) {
      res.status(403).json({ success: false, error: 'No autorizado para este recurso' });
      return;
    }
    next();
  };
};

export default roleMiddleware;
