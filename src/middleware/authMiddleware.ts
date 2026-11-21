import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/jwt';
import { findById } from '../services/userService';

/**
 * Valida el token y confirma contra la BD que la sesión sigue vigente: el
 * usuario existe y su `token_version` coincide con el claim `tv`. Cambiar la
 * contraseña o el email sube esa versión, así que los tokens anteriores dejan de
 * servir aunque no hayan vencido. Un token sin `tv` cuenta como versión 0.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token no proporcionado' });
    return;
  }

  let claims: { id: number; email: string; rol: 'vecino' | 'funcionario'; tv: number };
  try {
    const decoded = jwt.verify(header.slice(7), jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id <= 0 ||
        typeof decoded.email !== 'string' || !decoded.email.trim() ||
        !['vecino', 'funcionario'].includes(decoded.rol) || !Number.isFinite(decoded.exp) ||
        (decoded.tv !== undefined && !Number.isSafeInteger(decoded.tv))) {
      throw new Error('Payload inválido');
    }
    claims = { id: decoded.id, email: decoded.email, rol: decoded.rol, tv: decoded.tv ?? 0 };
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof jwt.TokenExpiredError ? 'Token expirado' : 'Token inválido',
    });
    return;
  }

  try {
    const usuario = await findById(claims.id);
    if (!usuario || Number(usuario.token_version ?? 0) !== claims.tv) {
      res.status(401).json({ success: false, error: 'Tu sesión ya no es válida. Ingresa de nuevo.' });
      return;
    }
  } catch (error) {
    next(error);
    return;
  }

  req.user = { id: claims.id, email: claims.email, rol: claims.rol };
  next();
};
