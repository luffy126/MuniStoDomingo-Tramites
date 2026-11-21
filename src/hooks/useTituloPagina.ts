import { useEffect } from 'react';

const SUFIJO = 'Trámites · Municipalidad de Santo Domingo';

/** Mantiene el título del documento sincronizado con la página activa. */
export const useTituloPagina = (titulo: string): void => {
  useEffect(() => {
    document.title = `${titulo} · ${SUFIJO}`;
  }, [titulo]);
};
