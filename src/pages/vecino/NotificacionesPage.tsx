import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { mailOpenOutline, mailUnreadOutline } from 'ionicons/icons';
import { getNotificaciones } from '../../services/tramiteService';

const NotificacionesPage: React.FC = () => {
  const notificaciones = getNotificaciones();
  const sinLeer = notificaciones.filter((notificacion) => !notificacion.leida).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Notificaciones</IonTitle>
          {sinLeer > 0 ? (
            <IonBadge color="danger" slot="end" className="ion-margin-end">
              {sinLeer}
            </IonBadge>
          ) : null}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          <IonList inset>
            {notificaciones.map((notificacion) => (
              <IonItem key={notificacion.id} lines="full">
                <IonIcon
                  icon={notificacion.leida ? mailOpenOutline : mailUnreadOutline}
                  color={notificacion.leida ? 'medium' : 'primary'}
                  slot="start"
                />
                <IonLabel className="ion-text-wrap">
                  <h2>{notificacion.titulo}</h2>
                  <p>{notificacion.mensaje}</p>
                  <p>{notificacion.fecha}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NotificacionesPage;
