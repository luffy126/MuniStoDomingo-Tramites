import { formatearFecha, formatearFechaHora, hoyIso } from './fechas';

describe('formatearFecha', () => {
  it('formatea una fecha sin hora como fecha local chilena', () => {
    expect(formatearFecha('2026-11-15')).toBe('15-11-2026');
  });

  it('formatea una fecha ISO completa', () => {
    expect(formatearFecha('2026-11-15T18:30:00.000Z')).toMatch(/1[45]-11-2026/);
  });

  it('devuelve un guion para valores vacíos y conserva valores no parseables', () => {
    expect(formatearFecha(undefined)).toBe('—');
    expect(formatearFecha('')).toBe('—');
    expect(formatearFecha('sin fecha')).toBe('sin fecha');
  });
});

describe('formatearFechaHora', () => {
  it('incluye hora y minutos', () => {
    expect(formatearFechaHora('2026-11-15T14:05:00')).toContain('15-11-2026');
    expect(formatearFechaHora('2026-11-15T14:05:00')).toMatch(/14:05/);
  });
});

describe('hoyIso', () => {
  it('entrega una fecha YYYY-MM-DD', () => {
    expect(hoyIso(new Date('2026-11-15T23:30:00'))).toBe('2026-11-15');
  });
});
