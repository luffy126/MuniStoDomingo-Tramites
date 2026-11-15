import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Pagina } from '../services/apiClient';
import { useListaPaginada } from './useListaPaginada';

interface Item { id: string }

const pagina = (ids: string[], page: number, hasNext: boolean, total = 3): Pagina<Item> => ({
  data: ids.map((id) => ({ id })),
  pagination: { page, limit: 2, total, totalPages: 2, hasNext, hasPrev: page > 1 },
});

describe('useListaPaginada', () => {
  it('cargar trae la página 1 y cargarMas agrega la siguiente hasta que no hay más', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(pagina(['a', 'b'], 1, true))
      .mockResolvedValueOnce(pagina(['c'], 2, false));
    const { result } = renderHook(() => useListaPaginada<Item>(fetcher));

    act(() => result.current.cargar());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.current.pagination?.hasNext).toBe(true);

    act(() => result.current.cargarMas());
    await waitFor(() => expect(result.current.cargandoMas).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(fetcher.mock.calls.map(([page]) => page)).toEqual([1, 2]);

    act(() => result.current.cargarMas());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('un error al cargar deja el mensaje y la lista vacía', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Sin conexión'));
    const { result } = renderHook(() => useListaPaginada<Item>(fetcher));

    act(() => result.current.cargar());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.items).toEqual([]);

    act(() => result.current.limpiarError());
    expect(result.current.error).toBe('');
  });

  it('un error al cargar más conserva lo ya cargado', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(pagina(['a', 'b'], 1, true))
      .mockRejectedValueOnce(new Error('Falló la página 2'));
    const { result } = renderHook(() => useListaPaginada<Item>(fetcher));

    act(() => result.current.cargar());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    act(() => result.current.cargarMas());
    await waitFor(() => expect(result.current.cargandoMas).toBe(false));

    expect(result.current.error).toBe('Falló la página 2');
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.current.pagination?.hasNext).toBe(true);
  });

  it('descarta la respuesta tardía de una consulta anterior (cambio de filtro)', async () => {
    let resolverVieja: (p: Pagina<Item>) => void = () => undefined;
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Promise<Pagina<Item>>((resolve) => { resolverVieja = resolve; }))
      .mockResolvedValueOnce(pagina(['nueva'], 1, false, 1));
    const { result } = renderHook(() => useListaPaginada<Item>(fetcher));

    act(() => result.current.cargar());
    act(() => result.current.cargar());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    await act(async () => { resolverVieja(pagina(['vieja'], 1, false, 1)); await Promise.resolve(); });

    expect(result.current.items.map((i) => i.id)).toEqual(['nueva']);
  });

  it('recargar vuelve a la página 1 sin ocultar la lista y conserva los datos si falla', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(pagina(['a', 'b'], 1, true))
      .mockResolvedValueOnce(pagina(['c'], 2, false))
      .mockResolvedValueOnce(pagina(['z', 'a'], 1, true))
      .mockRejectedValueOnce(new Error('Sin conexión'));
    const { result } = renderHook(() => useListaPaginada<Item>(fetcher));

    act(() => result.current.cargar());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    act(() => result.current.cargarMas());
    await waitFor(() => expect(result.current.items).toHaveLength(3));

    let promesa!: Promise<void>;
    act(() => { promesa = result.current.recargar(); });
    expect(result.current.cargando).toBe(false);
    await act(() => promesa);
    expect(result.current.items.map((i) => i.id)).toEqual(['z', 'a']);
    expect(result.current.pagination?.page).toBe(1);

    await act(() => result.current.recargar());
    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.items.map((i) => i.id)).toEqual(['z', 'a']);
  });
});
