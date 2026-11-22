import { IonContent, IonPage, IonSpinner, IonText } from '@ionic/react';

interface LoadingSpinnerProps {
  mensaje?: string;
  children?: React.ReactNode;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ mensaje = 'Cargando…', children }) => (
  <IonPage>
    <IonContent className="ion-padding">
      <div className="centro-vertical">
        <IonSpinner name="crescent" color="primary" />
        <IonText color="medium">
          <p>{mensaje}</p>
        </IonText>
        {children}
      </div>
    </IonContent>
  </IonPage>
);

export default LoadingSpinner;
