import { useCallback, useState } from 'react';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  getSolicitudesPorVecino,
  getTramiteById,
} from '../../services/tramiteService';
import type { Solicitud } from '../../services/tramiteService';

const MisTramitesPage: React.FC = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  const cargar = useCallback((): void => {
    setSolicitudes(getSolicitudesPorVecino(user?.nombre ?? ''));
  }, [user]);

  useIonViewWillEnter(cargar);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Mis trámites</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          {solicitudes.length === 0 ? (
            <div className="estado-vacio">
              <IonIcon icon={fileTrayOutline} color="medium" />
              <IonText color="medium">
                <p>Todavía no has iniciado trámites. Explora el catálogo para comenzar.</p>
              </IonText>
            </div>
          ) : (
            <IonList inset>
              {solicitudes.map((solicitud) => (
                <IonItem key={solicitud.id} lines="full">
                  <IonLabel className="ion-text-wrap">
                    <h2>{getTramiteById(solicitud.tramiteId)?.nombre ?? 'Trámite municipal'}</h2>
                    <p>
                      Folio {solicitud.id} · Ingresado el {solicitud.fecha}
                    </p>
                    {solicitud.observaciones !== undefined ? (
                      <IonNote color="medium">{solicitud.observaciones}</IonNote>
                    ) : null}
                  </IonLabel>
                  <IonBadge color={COLOR_ESTADO[solicitud.estado]} slot="end">
                    {ETIQUETA_ESTADO[solicitud.estado]}
                  </IonBadge>
                </IonItem>
              ))}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MisTramitesPage;
