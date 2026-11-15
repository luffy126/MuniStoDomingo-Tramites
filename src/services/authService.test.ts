import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, TOKEN_KEY } from './apiClient';
import { guardarSesion, limpiarSesion, recuperarSesion } from './authService';

// Respaldo en memoria en lugar de IndexedDB (jsdom no lo trae).
const respaldo = vi.hoisted(() => new Map<string, unknown>());
vi.mock('./storageService', () => ({
  default: {
    get: async (k: string) => respaldo.get(k) ?? null,
    set: async (k: string, v: unknown) => void respaldo.set(k, v),
    remove: async (k: string) => void respaldo.delete(k),
  },
}));

/** Respuesta mínima de fetch: solo lo que usa apiClient. */
const respuesta = (status: number, cuerpo?: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(cuerpo),
});

const vecino = { id: '1', nombre: 'Vecino Demo', email: 'vecino@test.com', rol: 'vecino' };

describe('recuperarSesion', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    respaldo.clear();
    window.localStorage.setItem(TOKEN_KEY, 'token-de-prueba');
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(vecino));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mantiene la sesión guardada si el backend responde 429 (rate limit)', async () => {
    fetchMock.mockResolvedValue(respuesta(429, { success: false, error: 'Demasiados intentos.' }));

    await expect(recuperarSesion()).resolves.toEqual(vecino);
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('token-de-prueba');
  });

  it('mantiene la sesión guardada si el backend no responde', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(recuperarSesion()).resolves.toEqual(vecino);
  });

  it('cierra la sesión si el token ya no es válido (401)', async () => {
    fetchMock.mockResolvedValue(respuesta(401, { success: false, error: 'Token inválido' }));

    await expect(recuperarSesion()).resolves.toBeNull();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('al cerrar por 401 también borra el respaldo', async () => {
    respaldo.set(TOKEN_KEY, 'token-de-prueba');
    fetchMock.mockResolvedValue(respuesta(401, { success: false, error: 'Token inválido' }));

    await recuperarSesion();
    await Promise.resolve();
    expect(respaldo.has(TOKEN_KEY)).toBe(false);
  });
});

describe('respaldo de la sesión en IndexedDB', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    respaldo.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guardarSesion escribe en localStorage y en el respaldo', async () => {
    guardarSesion(vecino as never, 'abc');
    await Promise.resolve();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('abc');
    expect(respaldo.get(TOKEN_KEY)).toBe('abc');
    expect(respaldo.get(SESSION_KEY)).toEqual(vecino);
  });

  it('limpiarSesion borra ambos lados', async () => {
    guardarSesion(vecino as never, 'abc');
    limpiarSesion();
    await Promise.resolve();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(respaldo.size).toBe(0);
  });

  it('sin token en localStorage recupera la sesión desde el respaldo y la repone', async () => {
    respaldo.set(TOKEN_KEY, 'del-respaldo');
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: vecino }));

    await expect(recuperarSesion()).resolves.toEqual(vecino);
    // La validación con el backend usó el token del respaldo.
    const cabeceras = fetchMock.mock.calls[0][1].headers as Headers;
    expect(cabeceras.get('Authorization')).toBe('Bearer del-respaldo');
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('del-respaldo');
  });

  it('con localStorage bloqueado las peticiones siguen usando el token del respaldo', async () => {
    respaldo.set(TOKEN_KEY, 'del-respaldo');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('bloqueado', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('bloqueado', 'SecurityError'); });
    fetchMock.mockResolvedValue(respuesta(200, { success: true, data: vecino }));

    try {
      await expect(recuperarSesion()).resolves.toEqual(vecino);
      expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer del-respaldo');
    } finally {
      vi.restoreAllMocks();
      limpiarSesion();
    }
  });

  it('sin backend y sin localStorage usa el usuario del respaldo', async () => {
    respaldo.set(TOKEN_KEY, 'del-respaldo');
    respaldo.set(SESSION_KEY, vecino);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(recuperarSesion()).resolves.toEqual(vecino);
  });

  it('sin token en ningún lado no llama al backend', async () => {
    await expect(recuperarSesion()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
