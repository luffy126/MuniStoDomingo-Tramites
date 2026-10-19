import type { Rol } from '../services/userService';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; rol: Rol };
    }
  }
}

export {};
