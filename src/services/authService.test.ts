import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, TOKEN_KEY } from './apiClient';
import { recuperarSesion } from './authService';

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
});
