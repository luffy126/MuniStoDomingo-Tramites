import { Request, Response, NextFunction } from 'express';

// TODO: Francisco reemplazará esto con la verificación real de JWT
const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // Simula un usuario autenticado para desarrollo
  req.user = { id: 1, email: 'dev@test.com', rol: 'vecino' };
  next();
};

export default authMiddleware;
