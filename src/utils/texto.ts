/** Normaliza texto para búsquedas: sin tildes, en minúsculas y sin espacios sobrantes. */
export const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Compara dos textos ignorando tildes, mayúsculas y espacios exteriores. */
export const incluyeTexto = (texto: string, busqueda: string): boolean => {
  const consulta = normalizarTexto(busqueda);
  return consulta === '' || normalizarTexto(texto).includes(consulta);
};
