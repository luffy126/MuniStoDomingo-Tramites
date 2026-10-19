import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { Rol, UsuarioDB, UsuarioPublico } from '../types';

export type { Rol } from '../types';
export type User = UsuarioPublico;

/**
 * Crea un nuevo usuario.
 *
 * @param nombre Nombre completo del usuario.
 * @param email Correo electrónico, único en la tabla.
 * @param passwordHash Hash bcrypt de la contraseña. El hasheo ocurre antes de llamar aquí.
 * @param rol 'vecino' o 'funcionario'.
 * @returns El usuario creado, sin el hash de la contraseña.
 * @throws Error de MySQL con código ER_DUP_ENTRY si el email ya está registrado.
 */
export async function createUser(
  nombre: string,
  email: string,
  passwordHash: string,
  rol: Rol
): Promise<UsuarioPublico> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usuario (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, passwordHash, rol]
  );

  return {
    id: result.insertId,
    nombre,
    email,
    rol,
  };
}

/**
 * Busca un usuario por correo, sin distinguir mayúsculas.
 *
 * Devuelve la fila completa, incluido `password_hash`, porque el login necesita
 * comparar la contraseña recibida contra ese hash. No debe exponerse tal cual
 * en una respuesta HTTP.
 *
 * @param email Correo a buscar.
 * @returns El usuario completo o null si no existe.
 */
export async function findByEmail(email: string): Promise<UsuarioDB | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, nombre, email, password_hash, rol, creado_en FROM usuario WHERE LOWER(email) = LOWER(?)',
    [email]
  );

  if (rows.length === 0) {
    return null;
  }
  return rows[0] as RowDataPacket & UsuarioDB;
}

/**
 * Busca un usuario por su id numérico y devuelve solo los datos públicos.
 *
 * Se usa en el middleware de autenticación para confirmar que el usuario del
 * token sigue existiendo.
 *
 * @param id Id numérico del usuario.
 * @returns El usuario sin contraseña o null si no existe.
 */
export async function findById(id: number): Promise<UsuarioPublico | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, nombre, email, rol FROM usuario WHERE id = ?',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }
  return rows[0] as RowDataPacket & UsuarioPublico;
}
