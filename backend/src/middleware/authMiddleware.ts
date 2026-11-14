import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token no proporcionado' });
    return;
  }

  try {
    const decoded = jwt.verify(header.slice(7), jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id <= 0 ||
        typeof decoded.email !== 'string' || !decoded.email.trim() ||
        !['vecino', 'funcionario'].includes(decoded.rol) || !Number.isFinite(decoded.exp)) {
      throw new Error('Payload inválido');
    }
    req.user = { id: decoded.id, email: decoded.email, rol: decoded.rol };
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof jwt.TokenExpiredError ? 'Token expirado' : 'Token inválido',
    });
    return;
  }
  next();
};
