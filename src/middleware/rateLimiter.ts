import rateLimit from 'express-rate-limit';

/** Lee un límite entero positivo del entorno; si falta o es inválido, usa el valor seguro. */
const limitePositivo = (valor: string | undefined, porDefecto: number): number => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
};

const LIMITE_AUTH = limitePositivo(process.env.AUTH_RATE_LIMIT_MAX, 10);
const LIMITE_GENERAL = limitePositivo(process.env.GENERAL_RATE_LIMIT_MAX, 100);

/** Límite de autenticación por IP; por defecto, 10 peticiones cada 15 minutos. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMITE_AUTH,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
  },
});

/**
 * Login: solo cuentan los intentos fallidos, así quien entra bien no gasta su
 * cupo y el límite puede quedarse bajo (10 fallos cada 15 minutos por IP).
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMITE_AUTH,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
  },
});

/** Recuperación de contraseña: contador propio, para no consumir el del login. */
export const recuperacionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMITE_AUTH,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 15 minutos.',
  },
});

/** Subida de adjuntos: 20 archivos cada 10 minutos por IP. */
export const subidaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: limitePositivo(process.env.UPLOAD_RATE_LIMIT_MAX, 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Subiste demasiados archivos seguidos. Intenta de nuevo en unos minutos.',
  },
});

/** Límite general por IP; por defecto, 100 peticiones por minuto. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: LIMITE_GENERAL,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas peticiones. Intenta de nuevo en un momento.',
  },
});
