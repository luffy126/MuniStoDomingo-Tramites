import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecargaAutomatica } from './useRecargaAutomatica';

let estadoVisibilidad: DocumentVisibilityState = 'visible';
const cambiarVisibilidad = (estado: DocumentVisibilityState): void => {
  estadoVisibilidad = estado;
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useRecargaAutomatica', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    estadoVisibilidad = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => estadoVisibilidad);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('actualiza cada intervalo mientras la vista está activa', async () => {
    const actualizar = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useRecargaAutomatica(true, actualizar, 1000));
    expect(actualizar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(actualizar).toHaveBeenCalledTimes(3);
  });

  it('no actualiza si la vista no está activa', async () => {
    const actualizar = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useRecargaAutomatica(false, actualizar, 1000));
    await vi.advanceTimersByTimeAsync(5000);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('se detiene con la pestaña oculta y actualiza apenas vuelve', async () => {
    const actualizar = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useRecargaAutomatica(true, actualizar, 1000));
    cambiarVisibilidad('hidden');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(actualizar).not.toHaveBeenCalled();

    cambiarVisibilidad('visible');
    expect(actualizar).toHaveBeenCalledTimes(1);
  });

  it('al volver enseguida no repite una actualización reciente', async () => {
    const actualizar = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useRecargaAutomatica(true, actualizar, 60_000));
    cambiarVisibilidad('hidden');
    await vi.advanceTimersByTimeAsync(1000);
    cambiarVisibilidad('visible');
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('nunca solapa dos actualizaciones y sigue tras un error', async () => {
    let terminar!: () => void;
    const actualizar = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((r) => { terminar = r; }))
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValue(undefined);
    renderHook(() => useRecargaAutomatica(true, actualizar, 1000));
    await vi.advanceTimersByTimeAsync(3000);
    expect(actualizar).toHaveBeenCalledTimes(1);
    terminar();
    await vi.advanceTimersByTimeAsync(2000);
    expect(actualizar).toHaveBeenCalledTimes(3);
  });

  it('deja de actualizar al desmontar', async () => {
    const actualizar = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useRecargaAutomatica(true, actualizar, 1000));
    unmount();
    await vi.advanceTimersByTimeAsync(5000);
    expect(actualizar).not.toHaveBeenCalled();
  });
});
