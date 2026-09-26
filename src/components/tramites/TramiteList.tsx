import { IonIcon, IonText } from '@ionic/react';
import { searchOutline } from 'ionicons/icons';
import TramiteCard from './TramiteCard';
import type { Tramite } from '../../services/tramiteService';

interface TramiteListProps {
  tramites: Tramite[];
  onSeleccionar: (tramite: Tramite) => void;
}

const TramiteList: React.FC<TramiteListProps> = ({ tramites, onSeleccionar }) => {
  if (tramites.length === 0) {
    return (
      <div className="estado-vacio">
        <IonIcon icon={searchOutline} color="medium" />
        <IonText color="medium">
          <p>No encontramos trámites con ese criterio de búsqueda.</p>
        </IonText>
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
