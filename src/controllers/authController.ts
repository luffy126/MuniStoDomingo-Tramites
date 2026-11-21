import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  createUser, findByEmail, findById, findPasswordHash, updateUser,
} from '../services/userService';
import * as emailService from '../services/emailService';
import * as passwordResetService from '../services/passwordResetService';
import * as dosFactoresService from '../services/dosFactoresService';
import type { UsuarioPublico, UsuarioSesion } from '../types';
import { jwtSecret, jwtOptions } from '../config/jwt';

/** Copia solo los campos públicos; acepta también un UsuarioDB (con password_hash). */
function publicUser(user: UsuarioPublico): UsuarioPublico {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    telefono: user.telefono,
    direccion: user.direccion,
  };
}

/** `tv` es la versión de sesión: si cambia en la BD, el token deja de valer. */
function session(user: UsuarioSesion) {
  const token = jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, tv: Number(user.token_version ?? 0) },
    jwtSecret,
    jwtOptions
  );
  return { user: publicUser(user), token };
}

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // El registro público siempre crea vecinos: el rol del body se ignora para
    // que nadie pueda autoasignarse permisos de funcionario.
    const { nombre, email, password } = req.body;
    if (await findByEmail(email)) {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(nombre.trim(), email, passwordHash, 'vecino');
    res.status(201).json({ success: true, data: session(user) });
  } catch (error) {
    // La restricción UNIQUE también cubre registros concurrentes del mismo correo.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await findByEmail(email);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }

    // Con 2FA activa la contraseña no basta: se envía un código y no hay token todavía.
    if (user.dos_factores) {
      const { desafio, codigo } = await dosFactoresService.crearDesafio(user.id);
      await emailService.enviarCodigoAcceso({
        destinatario: user.email,
        nombre: user.nombre,
        codigo,
        minutosVigencia: dosFactoresService.VIGENCIA_CODIGO_MS / 60_000,
      });
      res.status(200).json({
        success: true,
        data: { requiere2fa: true, desafio, destino: ocultarEmail(user.email) },
      });
      return;
    }

    res.status(200).json({ success: true, data: session(user) });
  } catch (error) {
    next(error);
  }
};

/** `ana.perez@correo.cl` → `an•••@correo.cl`: orienta sin exponer el correo completo. */
function ocultarEmail(email: string): string {
  const [local, dominio] = email.split('@');
  return `${local.slice(0, 2)}•••@${dominio ?? ''}`;
}

/**
 * POST /api/auth/2fa/verificar
 * Body: { desafio, codigo }. Entrega la sesión si el código del correo es correcto.
 */
export const verificarDosFactores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { desafio, codigo } = req.body;
    const resultado = await dosFactoresService.verificar(desafio, codigo);
    if (resultado.tipo === 'vencido') {
      res.status(400).json({
        success: false,
        error: 'El código venció o superaste los intentos. Vuelve a ingresar con tu contraseña.',
      });
      return;
    }
    if (resultado.tipo === 'invalido') {
      res.status(401).json({
        success: false,
        error: `Código incorrecto. Te quedan ${resultado.intentosRestantes} intentos.`,
      });
      return;
    }
    const user = await findById(resultado.usuarioId);
    if (!user) {
      res.status(400).json({ success: false, error: 'Vuelve a ingresar con tu contraseña.' });
      return;
    }
    res.status(200).json({ success: true, data: session(user) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/auth/2fa: indica si la verificación en dos pasos está activa. */
export const estadoDosFactores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: { activo: await dosFactoresService.estaActivo(req.user!.id) } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/2fa
 * Body: { activo: boolean, password }. Exige la contraseña actual, cierra las
 * demás sesiones y reemite el token de quien hizo el cambio.
 */
export const cambiarDosFactores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { activo, password } = req.body;
    const userId = req.user!.id;
    const hash = await findPasswordHash(userId);
    if (!hash || !await bcrypt.compare(password, hash)) {
      res.status(403).json({ success: false, error: 'La contraseña actual no es correcta' });
      return;
    }
    const user = await findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    // Activar exige probar que el correo es del usuario: se envía un código y la
    // 2FA queda activa solo al confirmarlo (POST /api/auth/2fa/confirmar).
    // Sin esto, alguien podría atar la cuenta a un correo que no controla.
    if (activo) {
      const { desafio, codigo } = await dosFactoresService.crearDesafio(userId);
      await emailService.enviarCodigoAcceso({
        destinatario: user.email,
        nombre: user.nombre,
        codigo,
        minutosVigencia: dosFactoresService.VIGENCIA_CODIGO_MS / 60_000,
      });
      res.status(202).json({
        success: true,
        data: { requiereConfirmacion: true, desafio, destino: ocultarEmail(user.email) },
      });
      return;
    }

    await dosFactoresService.cambiar(userId, false);
    const actualizado = await findById(userId);
    res.status(200).json({ success: true, data: { ...session(actualizado ?? user), activo: false } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/2fa/confirmar
 * Body: { desafio, codigo }. Termina de activar la 2FA con el código que llegó
 * al correo del usuario de la sesión.
 */
export const confirmarDosFactores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { desafio, codigo } = req.body;
    const resultado = await dosFactoresService.verificar(desafio, codigo);
    if (resultado.tipo === 'vencido' || (resultado.tipo === 'ok' && resultado.usuarioId !== req.user!.id)) {
      res.status(400).json({ success: false, error: 'El código venció o no es válido. Vuelve a activar la verificación.' });
      return;
    }
    if (resultado.tipo === 'invalido') {
      res.status(401).json({
        success: false,
        error: `Código incorrecto. Te quedan ${resultado.intentosRestantes} intentos.`,
      });
      return;
    }
    await dosFactoresService.cambiar(req.user!.id, true);
    const user = await findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: { ...session(user), activo: true } });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'No autenticado' });
    return;
  }
  try {
    const user = await findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/me: reemplaza los datos de contacto. Reemite el token porque el email va en sus claims.
 * Cambiar el email exige `passwordActual` (con un token robado no se puede
 * redirigir la recuperación de contraseña) y cierra las demás sesiones.
 */
export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, email } = req.body;
    const telefono: string | null =
      typeof req.body.telefono === 'string' && req.body.telefono.trim() !== ''
        ? req.body.telefono.trim()
        : null;
    const direccion: string | null =
      typeof req.body.direccion === 'string' && req.body.direccion.trim() !== ''
        ? req.body.direccion.trim()
        : null;
    const userId = req.user!.id;

    const actual = await findById(userId);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    const cambiaEmail = actual.email.toLowerCase() !== String(email).toLowerCase();
    if (cambiaEmail) {
      const passwordActual = req.body.passwordActual;
      const hash = await findPasswordHash(userId);
      if (typeof passwordActual !== 'string' || passwordActual === '' || !hash ||
          !await bcrypt.compare(passwordActual, hash)) {
        res.status(403).json({
          success: false,
          error: 'Para cambiar el email confirma tu contraseña actual',
        });
        return;
      }
    }

    const existente = await findByEmail(email);
    if (existente && existente.id !== userId) {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }

    const user = await updateUser(userId, nombre.trim(), email, telefono, direccion, cambiaEmail);
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: session(user) });
  } catch (error) {
    // La restricción UNIQUE también cubre cambios concurrentes al mismo correo.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'El email ya está registrado' });
      return;
    }
    next(error);
  }
};

/**
 * Genera el token y envía el correo de recuperación. Corre en segundo plano:
 * nunca lanza, solo registra el error.
 */
async function procesarRecuperacion(email: string): Promise<void> {
  try {
    const user = await findByEmail(email);
    if (!user) return;
    await passwordResetService.limpiarVencidos();
    const { token } = await passwordResetService.createToken(user.id);
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const enlace = `${base}/recuperar-password?token=${encodeURIComponent(token)}`;
    await emailService.enviarRecuperacion({
      destinatario: user.email,
      nombre: user.nombre,
      enlace,
      minutosVigencia: passwordResetService.VIGENCIA_TOKEN_MS / 60_000,
    });
  } catch (error) {
    console.error('❌ No se pudo procesar la recuperación de contraseña:', error instanceof Error ? error.message : error);
  }
}

/** Trabajos de recuperación en curso; las pruebas los esperan con `esperarRecuperaciones`. */
const recuperacionesEnCurso = new Set<Promise<void>>();

/** Espera los correos de recuperación pendientes (solo para pruebas). */
export const esperarRecuperaciones = async (): Promise<void> => {
  await Promise.all([...recuperacionesEnCurso]);
};

/**
 * POST /api/auth/forgot-password
 * Responde siempre lo mismo y de inmediato, exista o no la cuenta: la búsqueda,
 * el token y el envío del correo ocurren después de responder. Así ni el
 * contenido ni el tiempo de la respuesta revelan qué correos están registrados.
 */
export const forgotPassword = (req: Request, res: Response): void => {
  const email = String(req.body.email).trim().toLowerCase();
  const trabajo = procesarRecuperacion(email);
  recuperacionesEnCurso.add(trabajo);
  void trabajo.finally(() => recuperacionesEnCurso.delete(trabajo));

  res.status(200).json({
    success: true,
    data: { mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' },
  });
};

/**
 * POST /api/auth/reset-password
 * Body: { token, password }. El token es de un solo uso y vence en una hora.
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const usuarioId = await passwordResetService.consumeToken(token, passwordHash);

    if (usuarioId === null) {
      res.status(400).json({ success: false, error: 'El enlace no es válido o ya venció. Solicita uno nuevo.' });
      return;
    }

    res.status(200).json({ success: true, data: { mensaje: 'Tu contraseña se actualizó. Ya puedes ingresar.' } });
  } catch (error) {
    next(error);
  }
};
