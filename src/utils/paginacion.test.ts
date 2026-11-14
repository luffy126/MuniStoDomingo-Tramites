import { describe, expect, it } from 'vitest';
import { unirPaginas } from './paginacion';

describe('unirPaginas', () => {
  it('agrega la página nueva al final conservando el orden', () => {
    expect(unirPaginas([{ id: '1' }, { id: '2' }], [{ id: '3' }])).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('descarta los elementos que ya estaban (corrimiento por altas durante la paginación)', () => {
    expect(unirPaginas([{ id: '1' }, { id: '2' }], [{ id: '2' }, { id: '3' }])).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('no modifica el arreglo original', () => {
    const actuales = [{ id: '1' }];
    unirPaginas(actuales, [{ id: '2' }]);
    expect(actuales).toEqual([{ id: '1' }]);
  });
});
