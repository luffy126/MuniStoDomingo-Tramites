import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonPage,
  IonSpinner, IonText, IonTextarea, IonToast,
} from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import Header from '../../components/common/Header';
import { ETIQUETA_CATEGORIA, crearSolicitud, getTramiteById } from '../../services/tramiteService';
import type { Tramite } from '../../services/tramiteService';
import { getIcono } from '../../utils/iconos';

const TramiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tramite, setTramite] = useState<Tramite>();
  const [cargando, setCargando] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('success');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCargando(true);
    if (!id) {
      setTramite(undefined);
      setCargando(false);
      return () => { cancelled = true; };
    }
    void getTramiteById(id)
      .then((item) => { if (!cancelled) setTramite(item); })
      .catch((error: unknown) => { if (!cancelled) setMensaje(error instanceof Error ? error.message : 'No se pudo cargar el trámite.'); })
      .finally(() => { if (!cancelled) setCargando(false); });
    return () => { cancelled = true; };
  }, [id]);

  const iniciarTramite = async (): Promise<void> => {
    if (!tramite) return;
    setEnviando(true);
    try {
      await crearSolicitud({ tramiteId: tramite.id, observaciones: observaciones.trim() || undefined });
      setTipoMensaje('success');
      setMensaje('Solicitud enviada correctamente.');
      setObservaciones('');
      window.setTimeout(() => navigate('/vecino/mis-tramites'), 1200);
    } catch (error) {
      setTipoMensaje('danger');
      setMensaje(error instanceof Error ? error.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <IonPage><Header titulo="Cargando trámite…" rutaVolver="/vecino/dashboard" /><IonContent className="ion-text-center ion-padding"><IonSpinner /></IonContent></IonPage>;
  if (!tramite) return (
    <IonPage>
      <Header titulo="Trámite no encontrado" rutaVolver="/vecino/dashboard" />
      <IonContent className="ion-padding"><IonText color="medium"><p>El trámite solicitado no está disponible en el catálogo.</p></IonText><IonButton expand="block" routerLink="/vecino/dashboard">Volver al catálogo</IonButton><IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} /></IonContent>
    </IonPage>
  );

  return (
    <IonPage>
      <Header titulo={tramite.nombre} rutaVolver="/vecino/dashboard" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard><IonCardHeader><div className="tramite-card__encabezado"><IonIcon icon={getIcono(tramite.icono)} color="primary" className="tramite-card__icono" /><div><IonCardTitle>{tramite.nombre}</IonCardTitle><IonBadge color="secondary">{ETIQUETA_CATEGORIA[tramite.categoria]}</IonBadge></div></div></IonCardHeader><IonCardContent>{tramite.descripcion}</IonCardContent></IonCard>
          <IonList inset><IonListHeader><IonLabel>Requisitos</IonLabel></IonListHeader>{tramite.requisitos.map((requisito) => <IonItem key={requisito}><IonIcon icon={checkmarkCircleOutline} color="success" slot="start" /><IonLabel className="ion-text-wrap">{requisito}</IonLabel></IonItem>)}</IonList>
          <IonCard><IonCardHeader><IonCardTitle>Iniciar trámite</IonCardTitle></IonCardHeader><IonCardContent><IonTextarea label="Observaciones (opcional)" labelPlacement="floating" fill="outline" autoGrow rows={3} value={observaciones} onIonInput={(event) => setObservaciones(event.detail.value ?? '')} /><IonButton expand="block" className="ion-margin-top" onClick={() => void iniciarTramite()} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</IonButton></IonCardContent></IonCard>
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={2500} color={tipoMensaje} onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default TramiteDetailPage;
