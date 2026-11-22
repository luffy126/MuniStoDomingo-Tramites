import { IonButton, IonIcon, IonText } from '@ionic/react';
import { searchOutline } from 'ionicons/icons';
import TramiteCard from './TramiteCard';
import type { Tramite } from '../../services/tramiteService';

interface TramiteListProps {
  tramites: Tramite[];
  onSeleccionar: (tramite: Tramite) => void;
  onLimpiarFiltros?: () => void;
}

const TramiteList: React.FC<TramiteListProps> = ({
  tramites,
  onSeleccionar,
  onLimpiarFiltros,
}) => {
  if (tramites.length === 0) {
    return (
      <div className="estado-vacio">
        <IonIcon icon={searchOutline} color="medium" aria-hidden="true" />
        <IonText color="medium">
          <h2>Sin resultados</h2>
          <p>No encontramos trámites con ese criterio de búsqueda.</p>
        </IonText>
        {onLimpiarFiltros !== undefined ? (
          <IonButton fill="outline" onClick={onLimpiarFiltros}>
            Limpiar búsqueda y filtros
          </IonButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grilla-tarjetas">
      {tramites.map((tramite) => (
        <TramiteCard key={tramite.id} tramite={tramite} onSeleccionar={onSeleccionar} />
      ))}
    </div>
  );
};

export default TramiteList;
