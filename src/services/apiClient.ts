const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export const TOKEN_KEY = 'munisd.token';
export const SESSION_KEY = 'munisd.sesion';
export const UNAUTHORIZED_EVENT = 'munisd:unauthorized';

let tokenEnMemoria: string | null = null;

/** Mantiene disponible el token restaurado aunque el navegador bloquee localStorage. */
export const actualizarTokenEnMemoria = (token: string | null): void => {
  tokenEnMemoria = token;
};

/** Metadatos que el backend agrega a los listados paginados. */
export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  /** Solo en notificaciones: cuántas no leídas hay en total (todas las páginas). */
  unread?: number;
}

/** Una página de un listado: los elementos y sus metadatos de paginación. */
export interface Pagina<T> {
  data: T[];
  pagination: Paginacion;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Paginacion;
}

/**
 * Tiempo máximo de espera por el backend. Sin límite, una petición que queda
 * colgada (p. ej. mientras el backend se reinicia detrás del túnel) dejaría la
 * app en el spinner de carga para siempre.
 */
export const TIMEOUT_MS = 15_000;

/** Tamaño de página al traer un listado completo: el máximo que acepta el backend. */
const LIMITE_PAGINA = 100;
/** Tamaño de página de las pantallas con "Cargar más" (el valor por defecto del backend). */
const LIMITE_POR_DEFECTO = 20;
/** Tope de páginas por listado, para no quedar en un ciclo si el backend respondiera mal. */
const MAX_PAGINAS = 50;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const solicitar = async <T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const token = window.localStorage.getItem(TOKEN_KEY) || tokenEnMemoria;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch {
    if (tokenEnMemoria) headers.set('Authorization', `Bearer ${tokenEnMemoria}`);
    // El navegador puede bloquear localStorage; las rutas públicas siguen disponibles.
  }

  let response: Response;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controlador.signal });
  } catch {
    throw new Error(
      controlador.signal.aborted
        ? 'El servidor tardó demasiado en responder. Intenta de nuevo en un momento.'
        : 'No se pudo conectar con el servidor. Revisa que el backend esté ejecutándose.',
    );
  } finally {
    clearTimeout(temporizador);
  }

  // Las respuestas 204 (p. ej. cancelar una solicitud) no traen cuerpo que parsear.
  if (response.status === 204) return { success: true };

  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('El servidor devolvió una respuesta inválida.', response.status);
  }

  if (response.status === 401) {
    actualizarTokenEnMemoria(null);
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

  return body;
};

const apiClient = async <T>(path: string, options: RequestInit = {}): Promise<T> =>
  (await solicitar<T>(path, options)).data as T;

/**
 * Trae un listado completo recorriendo todas sus páginas.
 *
 * El backend entrega los listados de a 20 por defecto; pedir solo la primera
 * página dejaría fuera, sin aviso, lo que no cabe en ella. Si el backend aún no
 * pagina (no envía `pagination`), se devuelve lo recibido tal cual.
 */
const getTodos = async <T>(path: string): Promise<T[]> => {
  const separador = path.includes('?') ? '&' : '?';
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGINAS; page += 1) {
    const body = await solicitar<T[]>(`${path}${separador}page=${page}&limit=${LIMITE_PAGINA}`);
    items.push(...(body.data ?? []));
    if (!body.pagination?.hasNext) break;
  }
  return items;
};

/**
 * Trae una sola página de un listado, con sus metadatos de paginación.
 *
 * Es lo que usan las pantallas con "Cargar más". Si el backend aún no pagina
 * (no envía `pagination`), se entrega todo lo recibido como una única página.
 */
const getPagina = async <T>(path: string, page = 1, limit = LIMITE_POR_DEFECTO): Promise<Pagina<T>> => {
  const separador = path.includes('?') ? '&' : '?';
  const body = await solicitar<T[]>(`${path}${separador}page=${page}&limit=${limit}`);
  const data = body.data ?? [];
  return {
    data,
    pagination: body.pagination ?? {
      page: 1, limit: data.length, total: data.length, totalPages: 1, hasNext: false, hasPrev: false,
    },
  };
};

export default {
  get: <T>(path: string): Promise<T> => apiClient<T>(path),
  getTodos,
  getPagina,
  post: <T>(path: string, data: unknown): Promise<T> =>
    apiClient<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown): Promise<T> =>
    apiClient<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown): Promise<T> =>
    apiClient<T>(path, { method: 'PATCH', ...(data === undefined ? {} : { body: JSON.stringify(data) }) }),
  delete: <T = void>(path: string): Promise<T> => apiClient<T>(path, { method: 'DELETE' }),
};
