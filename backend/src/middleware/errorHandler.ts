import { Request, Response, NextFunction } from 'express';

/** Mensajes para los errores 4xx de body-parser; los demás usan el genérico. */
const MENSAJES_CLIENTE: Record<number, string> = {
  413: 'Solicitud demasiado grande',
  415: 'Tipo de contenido no soportado',
};

/**
 * Manejador de errores global. Recibe todo lo que los controladores pasan a
 * `next(err)` y lo traduce al formato estándar `{ success: false, error }`.
 *
 * Nunca devuelve `err.message` al cliente, en ningún entorno: puede traer
 * detalles de la base de datos. Con `NODE_ENV=development` el detalle y el
 * stack solo se escriben en la consola del servidor.
 */
export const errorHandler = (
  err: Error & { status?: number; code?: string; type?: string; expose?: boolean },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // express.json() (body-parser) marca con `status` y `type` los errores que son
  // culpa del cliente: 400 si el body no es JSON válido, 413 si supera el límite
  // de 16kb, 415 si la codificación no está soportada (p. ej. charset=latin1).
  // body-parser también envuelve con `createError(400, err)` (marcado `expose`) un body
  // comprimido inválido, p. ej. Content-Encoding: gzip con un cuerpo sin comprimir.
  // Cualquier otro error, aunque traiga un `status` 4xx, sigue el camino del 500.
  const esErrorDeCliente = typeof err.type === 'string' || err.expose === true;
  if (esErrorDeCliente && typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({
      success: false,
      error: MENSAJES_CLIENTE[err.status] ?? 'Datos de entrada inválidos',
    });
    return;
  }

  // Algunos errores de mysql2 (p. ej. ECONNREFUSED si la BD no está arriba)
  // traen el mensaje vacío y solo el código.
  const detalle = err.message || err.code || 'Error desconocido';

  console.error('❌ Error no controlado:', detalle);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({ success: false, error: 'Error interno del servidor' });
};
