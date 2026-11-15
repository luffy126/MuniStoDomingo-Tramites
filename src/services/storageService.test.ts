import { describe, expect, it } from 'vitest';
import { StorageService } from './storageService';
import type { AlmacenClaveValor } from './storageService';

/** Almacén falso cuyas operaciones tardan lo indicado, para provocar desorden. */
const almacenLento = (retrasos: Record<string, number> = {}) => {
  const datos = new Map<string, unknown>();
  const esperar = (op: string) => new Promise((r) => setTimeout(r, retrasos[op] ?? 0));
  const almacen: AlmacenClaveValor = {
    get: async (k) => { await esperar('get'); return datos.get(k); },
    set: async (k, v) => { await esperar('set'); datos.set(k, v); },
    remove: async (k) => { await esperar('remove'); datos.delete(k); },
  };
  return { datos, almacen };
};

describe('StorageService', () => {
  it('guarda, lee y borra', async () => {
    const { almacen } = almacenLento();
    const servicio = new StorageService(async () => almacen);
    await servicio.set('k', { a: 1 });
    await expect(servicio.get('k')).resolves.toEqual({ a: 1 });
    await servicio.remove('k');
    await expect(servicio.get('k')).resolves.toBeNull();
  });

  it('respeta el orden: guardar lento y luego borrar termina borrado', async () => {
    const { almacen, datos } = almacenLento({ set: 30, remove: 0 });
    const servicio = new StorageService(async () => almacen);
    void servicio.set('token', 'x');
    await servicio.remove('token');
    expect(datos.has('token')).toBe(false);
  });

  it('se inicializa una sola vez', async () => {
    let creaciones = 0;
    const { almacen } = almacenLento();
    const servicio = new StorageService(async () => { creaciones++; return almacen; });
    await Promise.all([servicio.get('a'), servicio.set('b', 1), servicio.remove('c')]);
    expect(creaciones).toBe(1);
  });

  it('nunca lanza si IndexedDB no está disponible', async () => {
    const servicio = new StorageService(async () => { throw new Error('IndexedDB bloqueado'); });
    await expect(servicio.set('k', 1)).resolves.toBeUndefined();
    await expect(servicio.get('k')).resolves.toBeNull();
  });

  it('un fallo en una operación no corta las siguientes', async () => {
    const { almacen } = almacenLento();
    let primera = true;
    const servicio = new StorageService(async () => ({
      ...almacen,
      set: async (k: string, v: unknown) => { if (primera) { primera = false; throw new Error('cuota'); } return almacen.set(k, v); },
    }));
    await servicio.set('k', 1);
    await servicio.set('k', 2);
    await expect(servicio.get('k')).resolves.toBe(2);
  });
});
