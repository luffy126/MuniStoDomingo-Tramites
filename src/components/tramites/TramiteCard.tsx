import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
} from '@ionic/react';
import { ETIQUETA_CATEGORIA } from '../../services/tramiteService';
import type { Tramite } from '../../services/tramiteService';
import { getIcono } from '../../utils/iconos';

interface TramiteCardProps {
  tramite: Tramite;
  onSeleccionar: (tramite: Tramite) => void;
}

const TramiteCard: React.FC<TramiteCardProps> = ({ tramite, onSeleccionar }) => (
  <IonCard button onClick={() => onSeleccionar(tramite)}>
    <IonCardHeader>
      <div className="tramite-card__encabezado">
        <IonIcon icon={getIcono(tramite.icono)} color="primary" className="tramite-card__icono" />
        <div>
          <IonCardTitle>{tramite.nombre}</IonCardTitle>
          <IonCardSubtitle>
            <IonBadge color="secondary">{ETIQUETA_CATEGORIA[tramite.categoria]}</IonBadge>
          </IonCardSubtitle>
        </div>
      </div>
    </IonCardHeader>
    <IonCardContent>{tramite.descripcion}</IonCardContent>
  </IonCard>
);

export default TramiteCard;
