import { incluyeTexto, normalizarTexto } from './texto';

describe('normalizarTexto', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizarTexto('  Certificado de Número Municipal  ')).toBe(
      'certificado de numero municipal',
    );
  });
});

describe('incluyeTexto', () => {
  it('encuentra texto aunque la búsqueda no lleve tildes', () => {
    expect(incluyeTexto('Certificado de número municipal', 'numero')).toBe(true);
    expect(incluyeTexto('Permiso de edificación', 'EDIFICACION')).toBe(true);
  });

  it('devuelve true con búsqueda vacía y false cuando no coincide', () => {
    expect(incluyeTexto('Trámite', '   ')).toBe(true);
    expect(incluyeTexto('Trámite', 'patente')).toBe(false);
  });
});
