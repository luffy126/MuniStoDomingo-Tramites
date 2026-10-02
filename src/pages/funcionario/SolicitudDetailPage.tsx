import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTextarea,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { checkmarkOutline, closeOutline, timeOutline } from 'ionicons/icons';
import Header from '../../components/common/Header';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  actualizarEstadoSolicitud,
  getSolicitudById,
  getTramiteById,
} from '../../services/tramiteService';
import type { EstadoSolicitud, Solicitud } from '../../services/tramiteService';

const SolicitudDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<Solicitud | undefined>(undefined);
  const [observaciones, setObservaciones] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  const cargar = useCallback((): void => {
    const encontrada = id !== undefined ? getSolicitudById(id) : undefined;
    setSolicitud(encontrada);
    setObservaciones(encontrada?.observaciones ?? '');
  }, [id]);

  useIonViewWillEnter(cargar);

  const cambiarEstado = (estado: EstadoSolicitud): void => {
    if (solicitud === undefined) {
      return;
    }
    const actualizada = actualizarEstadoSolicitud(
      solicitud.id,
      estado,
      observaciones.trim() === '' ? undefined : observaciones.trim()
    );
    setSolicitud(actualizada);
    setMensaje(`Solicitud marcada como "${ETIQUETA_ESTADO[estado]}".`);
    window.setTimeout(() => navigate('/funcionario/solicitudes'), 1200);
  };

  if (solicitud === undefined) {
    return (
      <IonPage>
        <Header titulo="Solicitud no encontrada" rutaVolver="/funcionario/solicitudes" />
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p>La solicitud indicada no existe o fue eliminada.</p>
          </IonText>
          <IonButton expand="block" routerLink="/funcionario/solicitudes">
            Volver a solicitudes
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const tramite = getTramiteById(solicitud.tramiteId);

  return (
    <IonPage>
      <Header titulo={`Folio ${solicitud.id}`} rutaVolver="/funcionario/solicitudes" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{tramite?.nombre ?? 'Trámite municipal'}</IonCardTitle>
              <IonBadge color={COLOR_ESTADO[solicitud.estado]}>
                {ETIQUETA_ESTADO[solicitud.estado]}
              </IonBadge>
            </IonCardHeader>
            <IonCardContent>{tramite?.descripcion ?? ''}</IonCardContent>
          </IonCard>

          <IonList inset>
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Solicitante</h3>
                <p>{solicitud.vecinoNombre}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Fecha de ingreso</h3>
                <p>{solicitud.fecha}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Resolución</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonTextarea
                label="Observaciones para el vecino"
                labelPlacement="floating"
                fill="outline"
                autoGrow
                rows={3}
                value={observaciones}
                onIonInput={(event) => setObservaciones(event.detail.value ?? '')}
              />
              <div className="fila-botones">
                <IonButton color="success" onClick={() => cambiarEstado('aprobado')}>
                  <IonIcon icon={checkmarkOutline} slot="start" />
                  Aprobar
                </IonButton>
                <IonButton color="secondary" onClick={() => cambiarEstado('en_revision')}>
                  <IonIcon icon={timeOutline} slot="start" />
                  En revisión
                </IonButton>
                <IonButton color="danger" onClick={() => cambiarEstado('rechazado')}>
                  <IonIcon icon={closeOutline} slot="start" />
                  Rechazar
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={mensaje !== ''}
          message={mensaje}
          duration={1500}
          color="primary"
          onDidDismiss={() => setMensaje('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default SolicitudDetailPage;
