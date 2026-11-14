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

  it('si fetch rechaza, explica que no se pudo conectar con el servidor', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/api/tramites')).rejects.toThrow(
      'No se pudo conectar con el servidor. Revisa que el backend esté ejecutándose.',
    );
  });
});
