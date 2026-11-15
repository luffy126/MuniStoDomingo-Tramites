import apiClient, { actualizarTokenEnMemoria, ApiError, SESSION_KEY, TOKEN_KEY } from './apiClient';
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

const leerDatoLocal = (key: string): string | null => {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const guardarDatoLocal = (key: string, value: string): void => {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // IndexedDB queda como respaldo cuando el navegador bloquea localStorage.
  }
};

const quitarDatoLocal = (key: string): void => {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // IndexedDB también se limpia abajo.
  }
};

const guardarDatoRespaldo = (key: string, value: string): void => {
  void storageService.set(key, value).catch(() => {
    // La aplicación sigue funcionando con localStorage si IndexedDB no está disponible.
  });
};

const quitarDatoRespaldo = (key: string): void => {
  void storageService.remove(key).catch(() => {
    // El navegador puede no ofrecer almacenamiento persistente.
  });
};

const adaptarUser = (user: BackendUser): User => ({ ...user, id: String(user.id) });

export const guardarSesion = (user: User, token: string): void => {
  actualizarTokenEnMemoria(token);
  const sesion = JSON.stringify(user);
  guardarDatoLocal(SESSION_KEY, sesion);
  guardarDatoLocal(TOKEN_KEY, token);
  guardarDatoRespaldo(SESSION_KEY, sesion);
  guardarDatoRespaldo(TOKEN_KEY, token);
};

export const limpiarSesion = (): void => {
  actualizarTokenEnMemoria(null);
  quitarDatoLocal(SESSION_KEY);
  quitarDatoLocal(TOKEN_KEY);
  quitarDatoRespaldo(SESSION_KEY);
  quitarDatoRespaldo(TOKEN_KEY);
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

export const recuperarSesion = async (): Promise<User | null> => {
  const storage = getStorage();
  let token = leerDatoLocal(TOKEN_KEY);
  if (!token) {
    try {
      token = await storageService.get<string>(TOKEN_KEY);
    } catch {
      token = null;
    }
  }

  if (!token) {
    limpiarSesion();
    return null;
  }

  // El cliente HTTP necesita una fuente síncrona mientras valida /me.
  actualizarTokenEnMemoria(token);
  guardarDatoLocal(TOKEN_KEY, token);

  try {
    const backendUser = await apiClient.get<BackendUser>('/api/auth/me');
    const user = adaptarUser(backendUser);
    guardarSesion(user, token);
    return user;
  } catch (error) {
    // Solo un 401/403 significa que el token ya no sirve. Un 429 (el backend limita
    // las peticiones a /api/auth, incluido /me) o una caída momentánea no deben
    // cerrar la sesión: se sigue con el usuario guardado y la próxima llamada
    // protegida volverá a validar el token.
    const tokenInvalido = error instanceof ApiError && (error.status === 401 || error.status === 403);
    const guardado = tokenInvalido ? null : leerUsuarioGuardado(storage) ?? await leerUsuarioRespaldo();
    if (!guardado) limpiarSesion();
    return guardado;
  }
};

const leerUsuarioRespaldo = async (): Promise<User | null> => {
  try {
    const raw = await storageService.get<string>(SESSION_KEY);
    const user = JSON.parse(raw ?? 'null') as User | null;
    return user && user.id && user.email && (user.rol === 'vecino' || user.rol === 'funcionario') ? user : null;
  } catch {
    return null;
  }
};

const leerUsuarioGuardado = (storage: Storage | null): User | null => {
  try {
    const user = JSON.parse(storage?.getItem(SESSION_KEY) ?? 'null') as User | null;
    return user && user.id && user.email && (user.rol === 'vecino' || user.rol === 'funcionario') ? user : null;
  } catch {
    return null;
  }
};

export const rutaInicialPorRol = (rol: Rol): string =>
  rol === 'funcionario' ? '/funcionario/solicitudes' : '/vecino/dashboard';
