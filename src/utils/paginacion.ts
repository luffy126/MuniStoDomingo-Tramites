/**
 * Agrega una página nueva a lo ya cargado sin repetir elementos.
 *
 * Si entra una solicitud nueva mientras se pagina, los elementos se corren y el
 * último de una página puede reaparecer al inicio de la siguiente: se descartan
 * los que ya están (por `id`) y se conserva el orden en que llegaron.
 */
export const unirPaginas = <T extends { id: string }>(actuales: T[], nuevos: T[]): T[] => {
  const vistos = new Set(actuales.map((item) => item.id));
  return [...actuales, ...nuevos.filter((item) => !vistos.has(item.id))];
};
