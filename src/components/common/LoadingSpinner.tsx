import { IonContent, IonPage, IonSpinner, IonText } from '@ionic/react';

interface LoadingSpinnerProps {
  mensaje?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ mensaje = 'Cargando…' }) => (
  <IonPage>
    <IonContent className="ion-padding">
      <div className="centro-vertical">
        <IonSpinner name="crescent" color="primary" />
        <IonText color="medium">
          <p>{mensaje}</p>
        </IonText>
      </div>
    </IonContent>
  </IonPage>
);

export default LoadingSpinner;
