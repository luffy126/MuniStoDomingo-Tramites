import { Request, Response, NextFunction } from 'express';

/**
 * Manejador de errores global. Recibe todo lo que los controladores pasan a
 * `next(err)` y lo traduce al formato estándar `{ success: false, error }`.
 *
 * En desarrollo devuelve el mensaje real para depurar; en producción lo oculta
 * para no filtrar detalles de la base de datos.
 */
export const errorHandler = (
  err: Error & { type?: string; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // express.json() lanza este error cuando el body no es JSON válido: es culpa
  // del cliente, no del servidor.
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'El cuerpo de la petición no es JSON válido' });
    return;
  }

  // Algunos errores de mysql2 (p. ej. ECONNREFUSED si la BD no está arriba)
  // traen el mensaje vacío y solo el código.
  const detalle = err.message || err.code || 'Error desconocido';

  console.error('❌ Error no controlado:', detalle);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development'
      ? detalle
      : 'Error interno del servidor',
  });
};
