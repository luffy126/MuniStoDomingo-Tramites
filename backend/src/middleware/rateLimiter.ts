import rateLimit from 'express-rate-limit';

/** Máximo 10 peticiones por IP a /api/auth en una ventana de 15 minutos. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
  },
});

/** Máximo 100 peticiones por IP y minuto antes de procesar las rutas. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas peticiones. Intenta de nuevo en un momento.',
  },
});
