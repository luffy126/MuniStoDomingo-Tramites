/** Parámetros de paginación ya validados. */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/** Metadatos de paginación que viajan en la respuesta, junto a `data`. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Una página de resultados más sus metadatos. */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
/** Tope de página: evita OFFSET absurdos (p. ej. ?page=1e300) que MySQL rechazaría con un 500. */
export const MAX_PAGE = 100_000;

/** Solo dígitos: `Number()` aceptaría también '1e3', '0x10' o ' 5 '. */
const enteroPositivo = (valor: unknown): number | null => {
  if (typeof valor !== 'string' || !/^\d{1,9}$/.test(valor)) return null;
  const numero = Number(valor);
  return numero >= 1 ? numero : null;
};

/**
 * Lee `page` y `limit` de la query string.
 *
 * - page: entero entre 1 y MAX_PAGE; por defecto 1.
 * - limit: entero entre 1 y maxLimit; por defecto defaultLimit.
 *
 * Un valor inválido (texto, negativo, repetido como arreglo) se reemplaza por
 * el valor por defecto y uno demasiado grande se recorta al máximo: un listado
 * no debe fallar por un parámetro de presentación.
 */
export function parsePagination(
  query: Record<string, unknown>,
  defaultLimit = DEFAULT_LIMIT,
  maxLimit = MAX_LIMIT
): PaginationParams {
  const page = Math.min(enteroPositivo(query.page) ?? 1, MAX_PAGE);
  const limit = Math.min(enteroPositivo(query.limit) ?? defaultLimit, maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

/** Paginación usada cuando quien llama al servicio no indica ninguna. */
export const PRIMERA_PAGINA: PaginationParams = { page: 1, limit: DEFAULT_LIMIT, offset: 0 };

/** Construye los metadatos a partir del total de filas que cumplen el filtro. */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Valores para `LIMIT ? OFFSET ?` en sentencias preparadas. Van como texto
 * porque MySQL 8.0.22+ rechaza números en esos marcadores (ER_WRONG_ARGUMENTS);
 * MariaDB acepta ambos.
 */
export const limitOffset = (p: PaginationParams): [string, string] => [String(p.limit), String(p.offset)];
