import type { ReactNode } from 'react';

interface MarcaTituloProps {
  children: ReactNode;
}

/**
 * Título de toolbar con el escudo municipal a la izquierda.
 * El escudo es decorativo: el nombre de la página ya está en el título y en el h1 sr-only.
 */
const MarcaTitulo: React.FC<MarcaTituloProps> = ({ children }) => (
  <span className="titulo-con-escudo">
    <span className="escudo-header" aria-hidden="true">
      <img src="/logo-municipal.png" alt="" width="18" height="24" />
    </span>
    <span className="titulo-con-escudo__texto">{children}</span>
  </span>
);

export default MarcaTitulo;
