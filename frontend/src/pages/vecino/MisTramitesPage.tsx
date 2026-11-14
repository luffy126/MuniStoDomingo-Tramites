import { useCallback, useState } from 'react';
import {
  IonBadge,
  IonButton,
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
  useIonAlert,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  cancelarSolicitud,
  getTramites,
  getSolicitudes,
} from '../../services/tramiteService';
import type { Solicitud, Tramite } from '../../services/tramiteService';

const MisTramitesPage: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('danger');
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [presentarAlerta] = useIonAlert();

  const cargar = useCallback((): void => {
    setCargando(true);
    void Promise.all([getSolicitudes(), getTramites()])
      .then(([items, catalogo]) => { setSolicitudes(items); setTramites(catalogo); })
      .catch((error: unknown) => { setTipoMensaje('danger'); setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar tus trámites.'); })
      .finally(() => setCargando(false));
  }, []);

  useCargarAlEntrar('/vecino/mis-tramites', cargar);

  const cancelar = async (folio: string): Promise<void> => {
    setCancelando(folio);
    try {
      await cancelarSolicitud(folio);
      setSolicitudes((actuales) => actuales.filter((solicitud) => solicitud.id !== folio));
      setTipoMensaje('success');
      setMensaje(`Solicitud ${folio} cancelada.`);
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No se pudo cancelar la solicitud.');
      // El estado pudo cambiar mientras tanto (409): se recarga la lista.
      cargar();
    } finally {
      setCancelando(null);
    }
  };

  const confirmarCancelacion = (folio: string): void => {
    if (cancelando === folio) return;
    void presentarAlerta({
      header: 'Cancelar solicitud',
      message: `¿Seguro que quieres cancelar la solicitud ${folio}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Sí, cancelar', role: 'destructive', handler: () => { void cancelar(folio); } },
      ],
    });
  };

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
                    {solicitud.estado === 'pendiente' ? (
                      <IonButton size="small" fill="outline" color="danger" className="ion-margin-top" disabled={cancelando === solicitud.id} onClick={() => confirmarCancelacion(solicitud.id)}>
                        Cancelar solicitud
                      </IonButton>
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
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color={tipoMensaje} onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default MisTramitesPage;
