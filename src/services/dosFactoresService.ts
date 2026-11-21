import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import pool from '../config/database';

/**
 * Verificación en dos pasos por correo.
 *
 * Al ingresar con la contraseña correcta, un usuario con 2FA activo no recibe
 * el token: recibe un `desafio` (identificador aleatorio de esta verificación)
 * y se le envía un código de 6 dígitos por email. El token solo se entrega al
 * enviar el desafío junto con el código correcto.
 *
 * - Se guardan hashes, nunca el desafío ni el código en claro.
 * - El código vence en 10 minutos y admite 5 intentos; al quinto fallo el
 *   desafío se borra y hay que volver a ingresar con la contraseña.
 * - Un desafío nuevo reemplaza al anterior del mismo usuario.
 */
export const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;
export const MAX_INTENTOS = 5;

const sha256 = (texto: string): string => createHash('sha256').update(texto, 'utf8').digest('hex');

const iguales = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

/** Crea un desafío para el usuario y devuelve el desafío y el código en claro. */
export async function crearDesafio(usuarioId: number): Promise<{ desafio: string; codigo: string }> {
  const desafio = randomBytes(32).toString('hex');
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiraEn = new Date(Date.now() + VIGENCIA_CODIGO_MS);

  await pool.execute('DELETE FROM desafio_2fa WHERE usuario_id = ? OR expira_en <= NOW()', [usuarioId]);
  await pool.execute(
    'INSERT INTO desafio_2fa (usuario_id, desafio_hash, codigo_hash, expira_en) VALUES (?, ?, ?, ?)',
    [usuarioId, sha256(desafio), sha256(`${desafio}:${codigo}`), expiraEn]
  );
  return { desafio, codigo };
}

interface FilaDesafio extends RowDataPacket {
  id: number;
  usuario_id: number;
  codigo_hash: string;
  intentos: number;
}

export type ResultadoVerificacion =
  | { tipo: 'ok'; usuarioId: number }
  | { tipo: 'invalido'; intentosRestantes: number }
  | { tipo: 'vencido' };

/**
 * Comprueba el código de un desafío. Corre en una transacción con la fila
 * bloqueada para que intentos simultáneos no esquiven el contador.
 */
export async function verificar(desafio: string, codigo: string): Promise<ResultadoVerificacion> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [filas] = await conn.execute<FilaDesafio[]>(
      `SELECT id, usuario_id, codigo_hash, intentos FROM desafio_2fa
       WHERE desafio_hash = ? AND expira_en > NOW() FOR UPDATE`,
      [sha256(desafio)]
    );
    if (filas.length === 0) {
      await conn.rollback();
      return { tipo: 'vencido' };
    }

    const fila = filas[0];
    if (iguales(fila.codigo_hash, sha256(`${desafio}:${codigo}`))) {
      await conn.execute('DELETE FROM desafio_2fa WHERE id = ?', [fila.id]);
      await conn.commit();
      return { tipo: 'ok', usuarioId: fila.usuario_id };
    }

    const intentos = Number(fila.intentos) + 1;
    if (intentos >= MAX_INTENTOS) {
      await conn.execute('DELETE FROM desafio_2fa WHERE id = ?', [fila.id]);
      await conn.commit();
      return { tipo: 'vencido' };
    }
    await conn.execute('UPDATE desafio_2fa SET intentos = ? WHERE id = ?', [intentos, fila.id]);
    await conn.commit();
    return { tipo: 'invalido', intentosRestantes: MAX_INTENTOS - intentos };
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}

/** Indica si el usuario tiene la verificación en dos pasos activa. */
export async function estaActivo(usuarioId: number): Promise<boolean> {
  const [filas] = await pool.execute<RowDataPacket[]>(
    'SELECT dos_factores FROM usuario WHERE id = ?',
    [usuarioId]
  );
  return filas.length > 0 && Boolean(filas[0].dos_factores);
}

/**
 * Activa o desactiva la 2FA. Sube `token_version`: las demás sesiones se cierran
 * y quien hizo el cambio recibe un token nuevo.
 */
export async function cambiar(usuarioId: number, activo: boolean): Promise<void> {
  await pool.execute(
    'UPDATE usuario SET dos_factores = ?, token_version = token_version + 1 WHERE id = ?',
    [activo, usuarioId]
  );
  if (!activo) await pool.execute('DELETE FROM desafio_2fa WHERE usuario_id = ?', [usuarioId]);
}
