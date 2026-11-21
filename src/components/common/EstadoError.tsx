import { IonButton, IonIcon, IonText } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';

interface EstadoErrorProps {
  mensaje: string;
  onReintentar?: () => void;
  textoReintentar?: string;
}

const EstadoError: React.FC<EstadoErrorProps> = ({
  mensaje,
  onReintentar,
  textoReintentar = 'Reintentar',
}) => (
  <div className="estado-vacio" role="alert">
    <IonIcon icon={alertCircleOutline} color="danger" aria-hidden="true" />
    <IonText>
      <h2>No pudimos cargar la información</h2>
      <p>{mensaje}</p>
    </IonText>
    {onReintentar !== undefined ? (
      <IonButton fill="outline" onClick={onReintentar}>
        {textoReintentar}
      </IonButton>
    ) : null}
  </div>
);

export default EstadoError;
