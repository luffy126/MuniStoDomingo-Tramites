import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { Rol, UsuarioDB, UsuarioSesion } from '../types';

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
): Promise<UsuarioSesion> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usuario (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, passwordHash, rol]
  );

  return {
    id: result.insertId,
    nombre,
    email,
    rol,
    telefono: null,
    direccion: null,
    token_version: 0,
  };
}

/**
 * Reemplaza los datos de contacto de un usuario (el rol y la contraseña no cambian).
 *
 * @param id Id numérico del usuario.
 * @param nombre Nuevo nombre completo.
 * @param email Nuevo correo electrónico, único en la tabla.
 * @param telefono Teléfono de contacto, o null para borrarlo.
 * @param direccion Dirección, o null para borrarla.
 * @param revocarSesiones Si es true sube `token_version` e invalida los tokens anteriores.
 * @returns El usuario actualizado sin contraseña, o null si el id no existe.
 * @throws Error de MySQL con código ER_DUP_ENTRY si otro usuario ya tiene ese email.
 */
export async function updateUser(
  id: number,
  nombre: string,
  email: string,
  telefono: string | null,
  direccion: string | null,
  revocarSesiones = false
): Promise<UsuarioSesion | null> {
  await pool.execute(
    `UPDATE usuario SET nombre = ?, email = ?, telefono = ?, direccion = ?,
            token_version = token_version + ?
     WHERE id = ?`,
    [nombre, email, telefono, direccion, revocarSesiones ? 1 : 0, id]
  );
  return findById(id);
}

/**
 * Busca un usuario por correo. Los validadores lo pasan a minúsculas y así se
 * guarda, de modo que la comparación directa aprovecha el índice UNIQUE.
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
    'SELECT id, nombre, email, password_hash, rol, telefono, direccion, token_version, dos_factores, creado_en FROM usuario WHERE email = ?',
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
export async function findById(id: number): Promise<UsuarioSesion | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, nombre, email, rol, telefono, direccion, token_version FROM usuario WHERE id = ?',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }
  return rows[0] as RowDataPacket & UsuarioSesion;
}

/**
 * Hash de la contraseña de un usuario, para confirmar su identidad antes de un
 * cambio sensible (p. ej. el email).
 */
export async function findPasswordHash(id: number): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT password_hash FROM usuario WHERE id = ?',
    [id]
  );
  return rows.length === 0 ? null : String(rows[0].password_hash);
}
