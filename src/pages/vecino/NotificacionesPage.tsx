import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import { TemaBoton } from '../../components/common/TemaToggle';
import { useCallback, useState } from 'react';
import { IonButtons,
  IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonPage, IonSpinner, IonText, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { mailOpenOutline, mailUnreadOutline } from 'ionicons/icons';
import { getNotificacionesPagina, marcarNotificacionLeida } from '../../services/tramiteService';
import type { Notificacion } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import PieListaPaginada from '../../components/common/PieListaPaginada';

const NotificacionesPage: React.FC = () => {
  const [mensaje, setMensaje] = useState('');

  const cargarPagina = useCallback((page: number) => getNotificacionesPagina(page), []);
  const { items: notificaciones, setItems, pagination, setPagination, cargando, cargandoMas, error, limpiarError, cargar, recargar, cargarMas } = useListaPaginada(cargarPagina);
  useCargarAlEntrar('/vecino/notificaciones', cargar);

  const marcarLeida = async (notification: Notificacion): Promise<void> => {
    if (notification.leida) return;
    try {
      const actualizada = await marcarNotificacionLeida(notification.id);
      setItems((current) => current.map((item) => item.id === notification.id ? actualizada : item));
      // `unread` cuenta todas las páginas: se baja en uno para que el aviso se actualice sin recargar.
      setPagination((actual) => actual && actual.unread !== undefined ? { ...actual, unread: Math.max(0, actual.unread - 1) } : actual);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo actualizar la notificación.');
    }
  };

  // Total de no leídas según el servidor (todas las páginas); si no lo envía, se cuenta lo cargado.
  const sinLeer = pagination?.unread ?? notificaciones.filter((notification) => !notification.leida).length;
  const aviso = mensaje || error;
  return (
    <IonPage>
      <IonHeader><IonToolbar color="primary"><IonTitle>Notificaciones</IonTitle>{sinLeer > 0 ? <IonBadge color="danger" slot="end" className="ion-margin-end">{sinLeer}</IonBadge> : null}<IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar></IonHeader>
      <IonContent>
        <RecargarAlTirar onRecargar={recargar} />
        <div className="contenedor-pagina">
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando notificaciones…</p></div> : error !== '' && notificaciones.length === 0 ? <div className="estado-vacio"><IonText color="danger"><p>{error}</p></IonText><IonButton fill="outline" onClick={cargar}>Reintentar</IonButton></div> : notificaciones.length === 0 ? <div className="estado-vacio"><IonIcon icon={mailOpenOutline} color="medium" /><IonText color="medium"><p>No tienes notificaciones.</p></IonText></div> : <><IonList inset>{notificaciones.map((notification) => <IonItem key={notification.id} button={!notification.leida} lines="full" onClick={() => void marcarLeida(notification)}><IonIcon icon={notification.leida ? mailOpenOutline : mailUnreadOutline} color={notification.leida ? 'medium' : 'primary'} slot="start" /><IonLabel className="ion-text-wrap"><h2>{notification.titulo}</h2><p>{notification.mensaje}</p><p>{notification.fecha}</p></IonLabel></IonItem>)}</IonList><PieListaPaginada pagination={pagination} cargados={notificaciones.length} cargandoMas={cargandoMas} onCargarMas={cargarMas} /></>}
        </div>
        <IonToast isOpen={aviso !== ''} message={aviso} duration={3500} color="danger" onDidDismiss={() => { setMensaje(''); limpiarError(); }} />
      </IonContent>
    </IonPage>
  );
};

export default NotificacionesPage;
