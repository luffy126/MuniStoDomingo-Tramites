import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient, { ApiError, SESSION_KEY, TOKEN_KEY, UNAUTHORIZED_EVENT } from './apiClient';

/** Respuesta mínima de fetch: solo lo que usa apiClient. */
const respuesta = (status: number, cuerpo?: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(cuerpo),
});

describe('apiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envía el token Bearer y el Content-Type cuando hay body', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'token-de-prueba');
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: { ok: true } }));

    await apiClient.post('/api/solicitudes', { tramiteId: 'cert-residencia' });

    const [url, opciones] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opciones.headers as Headers;
    expect(url).toMatch(/\/api\/solicitudes$/);
    expect(opciones.method).toBe('POST');
    expect(headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('no envía Authorization si no hay sesión', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: [] }));

    await apiClient.get('/api/tramites');

    const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('devuelve data cuando el sobre trae success: true', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: { id: 'SOL-1001' } }));

    await expect(apiClient.get<{ id: string }>('/api/solicitudes/SOL-1001')).resolves.toEqual({ id: 'SOL-1001' });
  });

  it('una respuesta 204 devuelve undefined sin leer el cuerpo', async () => {
    const sinCuerpo = respuesta(204);
    fetchMock.mockResolvedValue(sinCuerpo);

    await expect(apiClient.delete('/api/solicitudes/SOL-1005')).resolves.toBeUndefined();
    expect(sinCuerpo.json).not.toHaveBeenCalled();
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe('DELETE');
  });

  it('un 401 limpia la sesión, avisa a la app y lanza ApiError', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'vencido');
    window.localStorage.setItem(SESSION_KEY, '{}');
    const escucha = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, escucha);
    fetchMock.mockResolvedValue(respuesta(401, { success: false, error: 'Token expirado' }));

    const intento = apiClient.get('/api/solicitudes');

    await expect(intento).rejects.toMatchObject({ name: 'ApiError', status: 401, message: 'Token expirado' });
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(escucha).toHaveBeenCalledTimes(1);
    window.removeEventListener(UNAUTHORIZED_EVENT, escucha);
  });

  it('un 409 lanza ApiError con el mensaje y el código del backend', async () => {
    fetchMock.mockResolvedValue(respuesta(409, { success: false, error: 'El email ya está registrado' }));

    const error = await apiClient.put('/api/auth/me', { nombre: 'Ana', email: 'ana@correo.cl' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: 'El email ya está registrado' });
  });

  it('si fetch rechaza, explica que no se pudo conectar con el servicio', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/api/tramites')).rejects.toThrow(
      'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.',
    );
  });
  it('getTodos recorre todas las páginas y junta los resultados', async () => {
    const meta = (page: number, hasNext: boolean) => ({ page, limit: 100, total: 3, totalPages: 2, hasNext, hasPrev: page > 1 });
    fetchMock
      .mockResolvedValueOnce(respuesta(200, { success: true, data: ['a', 'b'], pagination: meta(1, true) }))
      .mockResolvedValueOnce(respuesta(200, { success: true, data: ['c'], pagination: meta(2, false) }));

    const todos = await apiClient.getTodos<string>('/api/solicitudes?estado=pendiente');

    expect(todos).toEqual(['a', 'b', 'c']);
    expect(fetchMock.mock.calls.map(([url]) => String(url).replace(/^.*\/api/, '/api'))).toEqual([
      '/api/solicitudes?estado=pendiente&page=1&limit=100',
      '/api/solicitudes?estado=pendiente&page=2&limit=100',
    ]);
  });

  it('getTodos funciona con un backend que todavía no pagina', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: ['a'] }));

    await expect(apiClient.getTodos<string>('/api/notificaciones')).resolves.toEqual(['a']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('getPagina pide una sola página y devuelve data con su paginación (incluido unread)', async () => {
    const pagination = { page: 2, limit: 20, total: 45, totalPages: 3, hasNext: true, hasPrev: true, unread: 7 };
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: ['a', 'b'], pagination }));

    const pagina = await apiClient.getPagina<string>('/api/notificaciones', 2);

    expect(pagina).toEqual({ data: ['a', 'b'], pagination });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as [string])[0]).replace(/^.*\/api/, '/api')).toBe('/api/notificaciones?page=2&limit=20');
  });

  it('getPagina respeta el limit indicado y agrega page con & si la ruta ya tiene filtros', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: [] }));

    await apiClient.getPagina<string>('/api/solicitudes?estado=pendiente', 1, 5);

    expect(String((fetchMock.mock.calls[0] as [string])[0]).replace(/^.*\/api/, '/api')).toBe('/api/solicitudes?estado=pendiente&page=1&limit=5');
  });

  it('getPagina con un backend que no pagina entrega una única página sin siguiente', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: ['a', 'b', 'c'] }));

    const { data, pagination } = await apiClient.getPagina<string>('/api/solicitudes');

    expect(data).toEqual(['a', 'b', 'c']);
    expect(pagination).toMatchObject({ page: 1, total: 3, totalPages: 1, hasNext: false, hasPrev: false });
  });

  it('getPagina propaga los errores del backend como ApiError', async () => {
    fetchMock.mockResolvedValue(respuesta(403, { success: false, error: 'No tienes permisos para esta acción' }));

    await expect(apiClient.getPagina('/api/solicitudes?estado=pendiente')).rejects.toMatchObject({ name: 'ApiError', status: 403 });
  });
  it('corta una petición colgada y explica que el servidor tardó demasiado', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation((_url: string, opciones: RequestInit) =>
        new Promise((_, rechazar) => {
          opciones.signal?.addEventListener('abort', () => rechazar(new DOMException('Aborted', 'AbortError')));
        }));
      const intento = apiClient.get('/api/auth/me');
      const verificacion = expect(intento).rejects.toThrow('El servidor tardó demasiado en responder.');
      await vi.advanceTimersByTimeAsync(15_000);
      await verificacion;
    } finally {
      vi.useRealTimers();
    }
  });
});
