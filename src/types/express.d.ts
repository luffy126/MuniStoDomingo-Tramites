import type { Rol } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; rol: Rol };
    }
  }
}

export {};
