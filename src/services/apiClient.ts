const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export const TOKEN_KEY = 'munisd.token';
export const SESSION_KEY = 'munisd.sesion';
export const UNAUTHORIZED_EVENT = 'munisd:unauthorized';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const apiClient = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch {
    // El navegador puede bloquear localStorage; las rutas públicas siguen disponibles.
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa que el backend esté ejecutándose.');
  }

  // Las respuestas 204 (p. ej. cancelar una solicitud) no traen cuerpo que parsear.
  if (response.status === 204) return undefined as T;

  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('El servidor devolvió una respuesta inválida.', response.status);
  }

  if (response.status === 401) {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignorar si el almacenamiento no está disponible.
    }
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }

  if (!response.ok || body.success !== true) {
    throw new ApiError(body.error || `Error de comunicación con el servidor (${response.status}).`, response.status);
  }

  return body.data as T;
};

export default {
  get: <T>(path: string): Promise<T> => apiClient<T>(path),
  post: <T>(path: string, data: unknown): Promise<T> =>
    apiClient<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown): Promise<T> =>
    apiClient<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown): Promise<T> =>
    apiClient<T>(path, { method: 'PATCH', ...(data === undefined ? {} : { body: JSON.stringify(data) }) }),
  delete: <T = void>(path: string): Promise<T> => apiClient<T>(path, { method: 'DELETE' }),
};
