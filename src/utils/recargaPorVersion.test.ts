import { describe, expect, it, vi } from 'vitest';
import { esErrorDeCarga, recargarUnaVez } from './recargaPorVersion';

const almacenFalso = () => {
  const datos = new Map<string, string>();
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  };
};

describe('recargarUnaVez', () => {
  it('recarga la primera vez', () => {
    const recargar = vi.fn();
    expect(recargarUnaVez(1_000_000, almacenFalso(), recargar)).toBe(true);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a recargar antes de 30 segundos: evita un ciclo', () => {
    const almacen = almacenFalso();
    const recargar = vi.fn();
    recargarUnaVez(1_000_000, almacen, recargar);
    expect(recargarUnaVez(1_010_000, almacen, recargar)).toBe(false);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('vuelve a recargar pasados 30 segundos', () => {
    const almacen = almacenFalso();
    const recargar = vi.fn();
    recargarUnaVez(1_000_000, almacen, recargar);
    expect(recargarUnaVez(1_031_000, almacen, recargar)).toBe(true);
    expect(recargar).toHaveBeenCalledTimes(2);
  });

  it('funciona aunque el navegador bloquee el almacenamiento', () => {
    const recargar = vi.fn();
    expect(recargarUnaVez(1_000_000, null, recargar)).toBe(true);
  });
});

describe('esErrorDeCarga', () => {
  it('reconoce los mensajes de Chrome, Firefox y Safari', () => {
    expect(esErrorDeCarga(new TypeError('Failed to fetch dynamically imported module: https://x/assets/p-1.js'))).toBe(true);
    expect(esErrorDeCarga(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(esErrorDeCarga(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('no confunde otros errores con un archivo faltante', () => {
    expect(esErrorDeCarga(new Error('No se pudo conectar con el servidor.'))).toBe(false);
    expect(esErrorDeCarga(undefined)).toBe(false);
  });
});
