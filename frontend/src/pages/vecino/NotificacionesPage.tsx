import { useCallback, useState } from 'react';
import {
  IonBadge, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonPage, IonSpinner, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { mailOpenOutline, mailUnreadOutline } from 'ionicons/icons';
import { getNotificaciones, marcarNotificacionLeida } from '../../services/tramiteService';
import type { Notificacion } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';

const NotificacionesPage: React.FC = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    void getNotificaciones()
      .then(setNotificaciones)
      .catch((error: unknown) => setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.'))
      .finally(() => setCargando(false));
  }, []);

  useCargarAlEntrar('/vecino/notificaciones', cargar);

  const marcarLeida = async (notification: Notificacion): Promise<void> => {
    if (notification.leida) return;
    try {
      const actualizada = await marcarNotificacionLeida(notification.id);
      setNotificaciones((current) => current.map((item) => item.id === notification.id ? actualizada : item));
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo actualizar la notificación.');
    }
  };

  const sinLeer = notificaciones.filter((notification) => !notification.leida).length;
  return (
    <IonPage>
      <IonHeader><IonToolbar color="primary"><IonTitle>Notificaciones</IonTitle>{sinLeer > 0 ? <IonBadge color="danger" slot="end" className="ion-margin-end">{sinLeer}</IonBadge> : null}</IonToolbar></IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando notificaciones…</p></div> : <IonList inset>{notificaciones.map((notification) => <IonItem key={notification.id} button={!notification.leida} lines="full" onClick={() => void marcarLeida(notification)}><IonIcon icon={notification.leida ? mailOpenOutline : mailUnreadOutline} color={notification.leida ? 'medium' : 'primary'} slot="start" /><IonLabel className="ion-text-wrap"><h2>{notification.titulo}</h2><p>{notification.mensaje}</p><p>{notification.fecha}</p></IonLabel></IonItem>)}</IonList>}
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default NotificacionesPage;
