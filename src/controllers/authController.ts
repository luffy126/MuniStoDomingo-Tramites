import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findByEmail, findById } from '../services/userService';
import type { User } from '../services/userService';
import { jwtSecret, jwtOptions } from '../config/jwt';

function publicUser(user: User): User {
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

function session(user: User) {
  const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, jwtSecret, jwtOptions);
  return { user: publicUser(user), token };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (await findByEmail(email)) {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(nombre.trim(), email, passwordHash, rol || 'vecino');
    res.status(201).json({ success: true, data: session(user) });
  } catch (error) {
    // La restricción UNIQUE también cubre registros concurrentes del mismo correo.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await findByEmail(email);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }
    res.status(200).json({ success: true, data: session(user) });
  } catch {
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
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
  } catch {
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
