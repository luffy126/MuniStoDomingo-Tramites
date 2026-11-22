import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import pool from '../config/database';

/** Vigencia del enlace de recuperación. */
export const VIGENCIA_TOKEN_MS = 60 * 60 * 1000;

const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

const hashesIguales = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

/**
 * Crea un token de un solo uso para restablecer la contraseña.
 * Invalida cualquier token anterior del mismo usuario.
 *
 * @returns El token en claro (solo viaja en el correo) y su fecha de expiración.
 */
export async function createToken(usuarioId: number): Promise<{ token: string; expiraEn: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiraEn = new Date(Date.now() + VIGENCIA_TOKEN_MS);

  await pool.execute('DELETE FROM password_reset WHERE usuario_id = ?', [usuarioId]);
  await pool.execute(
    'INSERT INTO password_reset (usuario_id, token_hash, expira_en) VALUES (?, ?, ?)',
    [usuarioId, hashToken(token), expiraEn]
  );

  return { token, expiraEn };
}

interface FilaToken extends RowDataPacket {
  id: number;
  usuario_id: number;
  token_hash: string;
}

/**
 * Consume un token válido y cambia la contraseña en una sola transacción.
 * El token se borra junto con los demás del usuario: un enlace sirve una vez.
 *
 * @returns El id del usuario actualizado, o null si el token no existe o expiró.
 */
export async function consumeToken(token: string, passwordHash: string): Promise<number | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [filas] = await connection.execute<FilaToken[]>(
      `SELECT id, usuario_id, token_hash
       FROM password_reset
       WHERE token_hash = ? AND expira_en > NOW()
       FOR UPDATE`,
      [hashToken(token)]
    );

    if (filas.length === 0) {
      await connection.rollback();
      return null;
    }

    const fila = filas[0];
    if (!hashesIguales(fila.token_hash, hashToken(token))) {
      await connection.rollback();
      return null;
    }

    // Subir token_version cierra las sesiones abiertas con la contraseña anterior.
    await connection.execute('UPDATE usuario SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [
      passwordHash,
      fila.usuario_id,
    ]);
    await connection.execute('DELETE FROM password_reset WHERE usuario_id = ?', [fila.usuario_id]);
    await connection.commit();
    return fila.usuario_id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Borra tokens vencidos; se llama al pedir uno nuevo para no acumular basura. */
export async function limpiarVencidos(): Promise<void> {
  await pool.execute('DELETE FROM password_reset WHERE expira_en <= NOW()');
}
