const FORMATO_FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Convierte una fecha ISO (`YYYY-MM-DD` o ISO completa) a un Date local.
 *
 * Las fechas sin hora se interpretan como fecha local, no UTC, para que el día
 * mostrado no se corra en Chile.
 */
const parsearFecha = (valor: string): Date | null => {
  const limpio = valor.trim();
  if (limpio === '') return null;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(limpio)
    ? new Date(`${limpio}T00:00:00`)
    : new Date(limpio);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

export const formatearFecha = (valor?: string | null): string => {
  if (valor === undefined || valor === null || valor.trim() === '') return '—';
  const fecha = parsearFecha(valor);
  return fecha === null ? valor : FORMATO_FECHA.format(fecha);
};

export const formatearFechaHora = (valor?: string | null): string => {
  if (valor === undefined || valor === null || valor.trim() === '') return '—';
  const fecha = parsearFecha(valor);
  return fecha === null ? valor : FORMATO_FECHA_HORA.format(fecha);
};

/** Fecha ISO de hoy (`YYYY-MM-DD`), útil para filtros por periodo. */
export const hoyIso = (ahora: Date = new Date()): string => {
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
