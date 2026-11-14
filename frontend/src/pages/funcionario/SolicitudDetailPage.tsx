import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSpinner,
  IonText, IonTextarea, IonToast,
} from '@ionic/react';
import { checkmarkOutline, closeOutline, timeOutline } from 'ionicons/icons';
import Header from '../../components/common/Header';
import { ApiError } from '../../services/apiClient';
import { COLOR_ESTADO, ETIQUETA_ESTADO, actualizarEstadoSolicitud, getSolicitudById, getTramites } from '../../services/tramiteService';
import type { EstadoSolicitud, Solicitud, Tramite } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';

const SolicitudDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<Solicitud>();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('success');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const cargar = useCallback((): void => {
    if (!id) return;
    setCargando(true);
    void Promise.all([getSolicitudById(id), getTramites()])
      .then(([item, catalogo]) => { setSolicitud(item); setObservaciones(item?.observaciones ?? ''); setTramites(catalogo); })
      .catch((error: unknown) => { setTipoMensaje('danger'); setMensaje(error instanceof Error ? error.message : 'No se pudo cargar la solicitud.'); })
      .finally(() => setCargando(false));
  }, [id]);
  useCargarAlEntrar('/funcionario/solicitud/:id', cargar);

  const cambiarEstado = async (estado: EstadoSolicitud): Promise<void> => {
    if (!solicitud) return;
    setActualizando(true);
    try {
      const updated = await actualizarEstadoSolicitud(solicitud.id, estado, observaciones.trim() || undefined);
      setSolicitud(updated);
      setTipoMensaje('success');
      setMensaje(`Solicitud marcada como "${ETIQUETA_ESTADO[estado]}".`);
      window.setTimeout(() => navigate('/funcionario/solicitudes'), 1200);
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.');
      // 409: otro funcionario la resolvió mientras tanto; se recarga el detalle desfasado.
      if (error instanceof ApiError && error.status === 409) cargar();
    } finally {
      setActualizando(false);
    }
  };

  if (cargando) return <IonPage><Header titulo="Cargando solicitud…" rutaVolver="/funcionario/solicitudes" /><IonContent className="ion-text-center ion-padding"><IonSpinner /></IonContent></IonPage>;
  if (!solicitud) return (
    <IonPage><Header titulo="Solicitud no encontrada" rutaVolver="/funcionario/solicitudes" /><IonContent className="ion-padding"><IonText color="medium"><p>La solicitud indicada no existe o fue eliminada.</p></IonText><IonButton expand="block" routerLink="/funcionario/solicitudes">Volver a solicitudes</IonButton><IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} /></IonContent></IonPage>
  );

  const tramite = tramites.find((item) => item.id === solicitud.tramiteId);
  // Aprobado y rechazado son estados finales: el backend responde 409 si se intenta cambiarlos.
  const resuelta = solicitud.estado === 'aprobado' || solicitud.estado === 'rechazado';
  return (
    <IonPage>
      <Header titulo={`Folio ${solicitud.id}`} rutaVolver="/funcionario/solicitudes" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard><IonCardHeader><IonCardTitle>{tramite?.nombre ?? 'Trámite municipal'}</IonCardTitle><IonBadge color={COLOR_ESTADO[solicitud.estado]}>{ETIQUETA_ESTADO[solicitud.estado]}</IonBadge></IonCardHeader><IonCardContent>{tramite?.descripcion ?? ''}</IonCardContent></IonCard>
          <IonList inset><IonItem><IonLabel className="ion-text-wrap"><h3>Solicitante</h3><p>{solicitud.vecinoNombre}</p></IonLabel></IonItem><IonItem><IonLabel className="ion-text-wrap"><h3>Fecha de ingreso</h3><p>{solicitud.fecha}</p></IonLabel></IonItem></IonList>
          <IonCard><IonCardHeader><IonCardTitle>Resolución</IonCardTitle></IonCardHeader><IonCardContent>{resuelta ? <IonText color="medium"><p>Esta solicitud ya fue resuelta y no admite cambios.</p></IonText> : null}<IonTextarea label="Observaciones para el vecino" labelPlacement="floating" fill="outline" autoGrow rows={3} value={observaciones} disabled={actualizando || resuelta} onIonInput={(event) => setObservaciones(event.detail.value ?? '')} /><div className="fila-botones"><IonButton color="success" disabled={actualizando || resuelta} onClick={() => void cambiarEstado('aprobado')}><IonIcon icon={checkmarkOutline} slot="start" />Aprobar</IonButton><IonButton color="secondary" disabled={actualizando || resuelta} onClick={() => void cambiarEstado('en_revision')}><IonIcon icon={timeOutline} slot="start" />En revisión</IonButton><IonButton color="danger" disabled={actualizando || resuelta} onClick={() => void cambiarEstado('rechazado')}><IonIcon icon={closeOutline} slot="start" />Rechazar</IonButton></div></IonCardContent></IonCard>
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={2500} color={tipoMensaje} onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default SolicitudDetailPage;
