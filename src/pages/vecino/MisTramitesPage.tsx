import { TemaBoton } from '../../components/common/TemaToggle';
import { useCallback, useState } from 'react';
import { IonButtons,
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
  IonRefresher,
  IonRefresherContent,
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
  getSolicitudesPagina,
} from '../../services/tramiteService';
import type { Tramite } from '../../services/tramiteService';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import PieListaPaginada from '../../components/common/PieListaPaginada';

const MisTramitesPage: React.FC = () => {
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('danger');
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [presentarAlerta] = useIonAlert();

  const cargarPagina = useCallback((page: number) => getSolicitudesPagina(page), []);
  const { items: solicitudes, pagination, cargando, cargandoMas, error, limpiarError, cargar, cargarMas } = useListaPaginada(cargarPagina);
  useCargarAlEntrar('/vecino/mis-tramites', cargar);

  // El catálogo se pide aparte: no depende de la página de solicitudes.
  const cargarCatalogo = useCallback(async (): Promise<void> => {
    try {
      setTramites(await getTramites());
    } catch (e: unknown) {
      setTipoMensaje('danger');
      setMensaje(e instanceof Error ? e.message : 'No se pudo cargar el catálogo de trámites.');
    }
  }, []);
  useCargarAlEntrar('/vecino/mis-tramites', cargarCatalogo);

  const refrescar = async (): Promise<void> => {
    await Promise.all([cargar(), cargarCatalogo()]);
  };

  const cancelar = async (folio: string): Promise<void> => {
    setCancelando(folio);
    try {
      await cancelarSolicitud(folio);
      setTipoMensaje('success');
      setMensaje(`Solicitud ${folio} cancelada.`);
      // Se recarga desde la página 1: quitarla a mano correría el resto y la siguiente página omitiría una solicitud.
      cargar();
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
        <IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (event) => {
          try {
            await refrescar();
          } finally {
            event.detail.complete();
          }
        }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="contenedor-pagina">
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando tus trámites…</p></div> : error !== '' && solicitudes.length === 0 ? (
            <div className="estado-vacio">
              <IonText color="danger"><p>{error}</p></IonText>
              <IonButton fill="outline" onClick={cargar}>Reintentar</IonButton>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="estado-vacio">
              <IonIcon icon={fileTrayOutline} color="medium" />
              <IonText color="medium">
                <p>Todavía no has iniciado trámites. Explora el catálogo para comenzar.</p>
              </IonText>
            </div>
          ) : (
            <>
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
            <PieListaPaginada pagination={pagination} cargados={solicitudes.length} cargandoMas={cargandoMas} onCargarMas={cargarMas} />
            </>
          )}
        </div>
        <IonToast isOpen={mensaje !== '' || error !== ''} message={mensaje || error} duration={3500} color={mensaje !== '' ? tipoMensaje : 'danger'} onDidDismiss={() => { setMensaje(''); limpiarError(); }} />
      </IonContent>
    </IonPage>
  );
};

export default MisTramitesPage;
