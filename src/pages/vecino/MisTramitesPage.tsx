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
  IonSpinner,
  IonText,
  IonToast,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  getTramites,
  getSolicitudesPorVecino,
} from '../../services/tramiteService';
import type { Solicitud, Tramite } from '../../services/tramiteService';

const MisTramitesPage: React.FC = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    void Promise.all([getSolicitudesPorVecino(user?.nombre ?? ''), getTramites()])
      .then(([items, catalogo]) => { setSolicitudes(items); setTramites(catalogo); })
      .catch((error: unknown) => setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar tus trámites.'))
      .finally(() => setCargando(false));
  }, [user?.nombre]);

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
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando tus trámites…</p></div> : solicitudes.length === 0 ? (
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
                    <h2>{tramites.find((tramite) => tramite.id === solicitud.tramiteId)?.nombre ?? 'Trámite municipal'}</h2>
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
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default MisTramitesPage;
