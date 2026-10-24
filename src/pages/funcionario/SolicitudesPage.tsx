import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonBadge, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonMenuButton, IonPage, IonSegment, IonSegmentButton, IonSpinner,
  IonText, IonTitle, IonToast, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import { COLOR_ESTADO, ETIQUETA_ESTADO, getSolicitudes, getTramites } from '../../services/tramiteService';
import type { EstadoSolicitud, Solicitud, Tramite } from '../../services/tramiteService';

type FiltroEstado = EstadoSolicitud | 'todos';
const FILTROS: FiltroEstado[] = ['todos', 'pendiente', 'en_revision', 'aprobado', 'rechazado'];
const esFiltroEstado = (value: unknown): value is FiltroEstado => typeof value === 'string' && (FILTROS as string[]).includes(value);

const SolicitudesPage: React.FC = () => {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    void Promise.all([getSolicitudes(), getTramites()])
      .then(([items, catalogo]) => { setSolicitudes(items); setTramites(catalogo); })
      .catch((error: unknown) => setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes.'))
      .finally(() => setCargando(false));
  }, []);
  useIonViewWillEnter(cargar);

  const visibles = useMemo(() => filtro === 'todos' ? solicitudes : solicitudes.filter((item) => item.estado === filtro), [solicitudes, filtro]);
  return (
    <IonPage>
      <IonHeader><IonToolbar color="primary"><IonButtons slot="start"><IonMenuButton /></IonButtons><IonTitle>Solicitudes</IonTitle></IonToolbar><IonToolbar><IonSegment scrollable value={filtro} onIonChange={(event) => setFiltro(esFiltroEstado(event.detail.value) ? event.detail.value : 'todos')}>{FILTROS.map((estado) => <IonSegmentButton key={estado} value={estado}><IonLabel>{estado === 'todos' ? 'Todas' : ETIQUETA_ESTADO[estado]}</IonLabel></IonSegmentButton>)}</IonSegment></IonToolbar></IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando solicitudes…</p></div> : visibles.length === 0 ? <div className="estado-vacio"><IonIcon icon={fileTrayOutline} color="medium" /><IonText color="medium"><p>No hay solicitudes en este estado.</p></IonText></div> : <IonList inset>{visibles.map((solicitud) => <IonItem key={solicitud.id} button lines="full" onClick={() => navigate(`/funcionario/solicitud/${encodeURIComponent(solicitud.id)}`)}><IonLabel className="ion-text-wrap"><h2>{tramites.find((tramite) => tramite.id === solicitud.tramiteId)?.nombre ?? 'Trámite municipal'}</h2><p>{solicitud.vecinoNombre} · Folio {solicitud.id}</p><p>Ingresado el {solicitud.fecha}</p></IonLabel><IonBadge color={COLOR_ESTADO[solicitud.estado]} slot="end">{ETIQUETA_ESTADO[solicitud.estado]}</IonBadge></IonItem>)}</IonList>}
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default SolicitudesPage;
