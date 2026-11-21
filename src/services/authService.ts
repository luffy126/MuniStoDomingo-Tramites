import apiClient, { ApiError, SESSION_KEY, TOKEN_KEY, recordarToken } from './apiClient';
import storageService from './storageService';

export type Rol = 'vecino' | 'funcionario';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono?: string | null;
  direccion?: string | null;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  rol?: Rol;
}

export interface PerfilData {
  nombre: string;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  /** Obligatoria solo si cambia el email: el backend la exige para confirmar la identidad. */
  passwordActual?: string;
}

interface BackendUser {
  id: number | string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono?: string | null;
  direccion?: string | null;
}

interface AuthResponse {
  user: BackendUser;
  token: string;
}

const getStorage = (): Storage | null => {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

const adaptarUser = (user: BackendUser): User => ({
  ...user,
  id: String(user.id),
  telefono: user.telefono ?? null,
  direccion: user.direccion ?? null,
});

/**
 * La sesión se guarda en localStorage (lectura síncrona en cada petición) y se
 * respalda en IndexedDB (storageService) por si localStorage falla o se borra.
 */
export const guardarSesion = (user: User, token: string): void => {
  const storage = getStorage();
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(user));
    storage?.setItem(TOKEN_KEY, token);
  } catch {
    // Cuota llena o almacenamiento bloqueado: quedan la memoria y el respaldo.
  }
  recordarToken(token);
  void storageService.set(SESSION_KEY, user);
  void storageService.set(TOKEN_KEY, token);
};

export const limpiarSesion = (): void => {
  const storage = getStorage();
  try {
    storage?.removeItem(SESSION_KEY);
    storage?.removeItem(TOKEN_KEY);
  } catch {
    // Ignorar si el almacenamiento no está disponible.
  }
  recordarToken(null);
  void storageService.remove(SESSION_KEY);
  void storageService.remove(TOKEN_KEY);
};

/** El login entrega la sesión, o pide el código de 2FA que se envió por correo. */
export type ResultadoLogin =
  | { tipo: 'sesion'; user: User }
  | { tipo: '2fa'; desafio: string; destino: string };

interface Respuesta2FA {
  requiere2fa: true;
  desafio: string;
  destino: string;
}

export const loginRequest = async (email: string, password: string): Promise<ResultadoLogin> => {
  const response = await apiClient.post<AuthResponse | Respuesta2FA>('/api/auth/login', { email, password });
  if ('requiere2fa' in response && response.requiere2fa) {
    return { tipo: '2fa', desafio: response.desafio, destino: response.destino };
  }
  const sesion = response as AuthResponse;
  const user = adaptarUser(sesion.user);
  guardarSesion(user, sesion.token);
  return { tipo: 'sesion', user };
};

/** Segundo paso del login: el código de 6 dígitos que llegó por correo. */
export const verificarCodigoRequest = async (desafio: string, codigo: string): Promise<User> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/2fa/verificar', { desafio, codigo });
  const user = adaptarUser(response.user);
  guardarSesion(user, response.token);
  return user;
};

export const getEstadoDosFactores = async (): Promise<boolean> =>
  (await apiClient.get<{ activo: boolean }>('/api/auth/2fa')).activo;

/** Desafío pendiente al activar la 2FA: se confirma con el código enviado al correo. */
export interface ConfirmacionPendiente {
  desafio: string;
  destino: string;
}

/**
 * Activa o desactiva la 2FA. Activar no surte efecto todavía: devuelve el
 * desafío y hay que confirmarlo con el código del correo. Desactivar es
 * inmediato; el backend cierra las demás sesiones y reemite el token.
 */
export const cambiarDosFactoresRequest = async (
  activo: boolean,
  password: string
): Promise<{ user: User } | ConfirmacionPendiente> => {
  const response = await apiClient.put<(AuthResponse & { activo: boolean }) | (ConfirmacionPendiente & { requiereConfirmacion: true })>(
    '/api/auth/2fa',
    { activo, password },
  );
  if ('requiereConfirmacion' in response) return { desafio: response.desafio, destino: response.destino };
  const user = adaptarUser(response.user);
  guardarSesion(user, response.token);
  return { user };
};

/** Termina de activar la 2FA con el código que llegó al correo. */
export const confirmarDosFactoresRequest = async (desafio: string, codigo: string): Promise<User> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/2fa/confirmar', { desafio, codigo });
  const user = adaptarUser(response.user);
  guardarSesion(user, response.token);
  return user;
};

export const registerRequest = async (data: RegisterData): Promise<User> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', {
    nombre: data.nombre.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });
  const user = adaptarUser(response.user);
  guardarSesion(user, response.token);
  return user;
};

export const actualizarPerfilRequest = async (data: PerfilData): Promise<User> => {
  const response = await apiClient.put<AuthResponse>('/api/auth/me', {
    nombre: data.nombre.trim(),
    email: data.email.trim().toLowerCase(),
    telefono: data.telefono?.trim() || null,
    direccion: data.direccion?.trim() || null,
    ...(data.passwordActual ? { passwordActual: data.passwordActual } : {}),
  });
  // El backend reemite el token porque el email viaja en sus claims.
  const user = adaptarUser(response.user);
  guardarSesion(user, response.token);
  return user;
};

export const solicitarRecuperacion = async (email: string): Promise<string> => {
  const respuesta = await apiClient.post<{ mensaje: string }>('/api/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
  return respuesta.mensaje;
};

export const restablecerPassword = async (token: string, password: string): Promise<string> => {
  const respuesta = await apiClient.post<{ mensaje: string }>('/api/auth/reset-password', {
    token,
    password,
  });
  return respuesta.mensaje;
};

/** Lee el token de localStorage y, si no está, del respaldo en IndexedDB. */
const leerTokenGuardado = async (storage: Storage | null): Promise<string | null> => {
  try {
    const token = storage?.getItem(TOKEN_KEY);
    if (token) return token;
  } catch {
    // localStorage bloqueado: se intenta con el respaldo.
  }
  const respaldo = await storageService.get<string>(TOKEN_KEY);
  return typeof respaldo === 'string' && respaldo !== '' ? respaldo : null;
};

export const recuperarSesion = async (): Promise<User | null> => {
  const storage = getStorage();
  const token = await leerTokenGuardado(storage);
  if (!token) {
    limpiarSesion();
    return null;
  }
  // Puede venir del respaldo: las peticiones lo necesitan desde ya, incluida /me.
  recordarToken(token);

  try {
    const backendUser = await apiClient.get<BackendUser>('/api/auth/me');
    const user = adaptarUser(backendUser);
    // Vuelve a escribir en ambos lados: si localStorage se había perdido, se repone.
    guardarSesion(user, token);
    return user;
  } catch (error) {
    // Solo un 401/403 significa que el token ya no sirve. Un 429 (el backend limita
    // las peticiones a /api/auth, incluido /me) o una caída momentánea no deben
    // cerrar la sesión: se sigue con el usuario guardado y la próxima llamada
    // protegida volverá a validar el token.
    const tokenInvalido = error instanceof ApiError && (error.status === 401 || error.status === 403);
    const guardado = tokenInvalido ? null : await leerUsuarioGuardado(storage);
    if (!guardado) limpiarSesion();
    return guardado;
  }
};

const esUsuario = (valor: unknown): valor is User => {
  const user = valor as Partial<User> | null;
  return !!user && !!user.id && !!user.email && (user.rol === 'vecino' || user.rol === 'funcionario');
};

const leerUsuarioGuardado = async (storage: Storage | null): Promise<User | null> => {
  try {
    const local: unknown = JSON.parse(storage?.getItem(SESSION_KEY) ?? 'null');
    if (esUsuario(local)) return local;
  } catch {
    // JSON dañado o localStorage bloqueado: se intenta con el respaldo.
  }
  const respaldo = await storageService.get<unknown>(SESSION_KEY);
  return esUsuario(respaldo) ? respaldo : null;
};

export const rutaInicialPorRol = (rol: Rol): string =>
  rol === 'funcionario' ? '/funcionario/solicitudes' : '/vecino/dashboard';
