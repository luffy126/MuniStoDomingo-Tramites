import apiClient, { ApiError, SESSION_KEY, TOKEN_KEY, recordarToken } from './apiClient';
import storageService from './storageService';

export type Rol = 'vecino' | 'funcionario';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
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
}

interface BackendUser {
  id: number | string;
  nombre: string;
  email: string;
  rol: Rol;
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

const adaptarUser = (user: BackendUser): User => ({ ...user, id: String(user.id) });

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

export const loginRequest = async (email: string, password: string): Promise<User> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
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
  });
  // El backend reemite el token porque el email viaja en sus claims.
  const user = adaptarUser(response.user);
  guardarSesion(user, response.token);
  return user;
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
