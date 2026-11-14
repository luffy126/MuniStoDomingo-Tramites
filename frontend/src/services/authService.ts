import apiClient, { SESSION_KEY, TOKEN_KEY } from './apiClient';

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

export const guardarSesion = (user: User, token: string): void => {
  const storage = getStorage();
  storage?.setItem(SESSION_KEY, JSON.stringify(user));
  storage?.setItem(TOKEN_KEY, token);
};

export const limpiarSesion = (): void => {
  const storage = getStorage();
  storage?.removeItem(SESSION_KEY);
  storage?.removeItem(TOKEN_KEY);
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
  const token = storage?.getItem(TOKEN_KEY);
  if (!token) {
    limpiarSesion();
    return null;
  }

  try {
    const backendUser = await apiClient.get<BackendUser>('/api/auth/me');
    const user = adaptarUser(backendUser);
    storage?.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  } catch {
    limpiarSesion();
    return null;
  }
};

export const rutaInicialPorRol = (rol: Rol): string =>
  rol === 'funcionario' ? '/funcionario/solicitudes' : '/vecino/dashboard';
