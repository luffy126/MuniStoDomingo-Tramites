import { IonSkeletonText } from '@ionic/react';

interface EsqueletoListaProps {
  /** Cantidad de tarjetas simuladas. */
  filas?: number;
  /** Texto anunciado a lectores de pantalla; no se muestra visualmente. */
  mensaje?: string;
}

/** Placeholder con la misma altura aproximada que una lista cargada. */
const EsqueletoLista: React.FC<EsqueletoListaProps> = ({ filas = 4, mensaje = 'Cargando…' }) => (
  <div className="skeleton-lista" role="status" aria-live="polite">
    <span className="sr-only">{mensaje}</span>
    {Array.from({ length: filas }, (_, indice) => (
      <div className="skeleton-fila" key={indice} aria-hidden="true">
        <IonSkeletonText animated style={{ width: '55%', height: '14px', marginBottom: '10px' }} />
        <IonSkeletonText animated style={{ width: '100%', height: '48px' }} />
      </div>
    ))}
  </div>
);

export default EsqueletoLista;
