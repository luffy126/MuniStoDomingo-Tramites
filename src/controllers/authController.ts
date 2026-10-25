import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findByEmail, findById, updateUser } from '../services/userService';
import type { UsuarioPublico } from '../types';
import { jwtSecret, jwtOptions } from '../config/jwt';

/** Copia solo los campos públicos; acepta también un UsuarioDB (con password_hash). */
function publicUser(user: UsuarioPublico): UsuarioPublico {
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

function session(user: UsuarioPublico) {
  const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, jwtSecret, jwtOptions);
  return { user: publicUser(user), token };
}

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // El registro público siempre crea vecinos: el rol del body se ignora para
    // que nadie pueda autoasignarse permisos de funcionario.
    const { nombre, email, password } = req.body;
    if (await findByEmail(email)) {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(nombre.trim(), email, passwordHash, 'vecino');
    res.status(201).json({ success: true, data: session(user) });
  } catch (error) {
    // La restricción UNIQUE también cubre registros concurrentes del mismo correo.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await findByEmail(email);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }
    res.status(200).json({ success: true, data: session(user) });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'No autenticado' });
    return;
  }
  try {
    const user = await findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/auth/me: reemplaza nombre y email. Reemite el token porque el email va en sus claims. */
export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email } = req.body;
    const userId = req.user!.id;

    const existente = await findByEmail(email);
    if (existente && existente.id !== userId) {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }

    const user = await updateUser(userId, nombre.trim(), email);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: session(user) });
  } catch (error) {
    // La restricción UNIQUE también cubre cambios concurrentes al mismo correo.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    next(error);
  }
};
