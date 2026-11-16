import { useRecargaAutomatica } from '../../hooks/useRecargaAutomatica';
import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import { TemaBoton } from '../../components/common/TemaToggle';
import { useCallback, useState } from 'react';
import { useNavigate, useMatch } from 'react-router-dom';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonMenuButton, IonPage, IonSegment, IonSegmentButton, IonSpinner,
  IonText, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import { COLOR_ESTADO, ETIQUETA_ESTADO, getSolicitudesPagina, getTramites } from '../../services/tramiteService';
import type { EstadoSolicitud, Tramite } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import PieListaPaginada from '../../components/common/PieListaPaginada';

type FiltroEstado = EstadoSolicitud | 'todos';
const FILTROS: FiltroEstado[] = ['todos', 'pendiente', 'en_revision', 'aprobado', 'rechazado'];
const esFiltroEstado = (value: unknown): value is FiltroEstado => typeof value === 'string' && (FILTROS as string[]).includes(value);

const SolicitudesPage: React.FC = () => {
  const navigate = useNavigate();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [mensajeCatalogo, setMensajeCatalogo] = useState('');

  // El filtro viaja al servidor (?estado=): los totales son los de toda la base, no los de la página cargada.
  const cargarPagina = useCallback(
    (page: number) => getSolicitudesPagina(page, filtro === 'todos' ? undefined : filtro),
    [filtro],
  );
  const { items: solicitudes, pagination, cargando, cargandoMas, error, limpiarError, cargar, recargar, cargarMas, actualizarEnSilencio } = useListaPaginada(cargarPagina);
  // Al cambiar el filtro cambia `cargarPagina`, y con él `cargar`: la lista se vuelve a pedir desde la página 1.
  useCargarAlEntrar('/funcionario/solicitudes', cargar);
  // Los cambios hechos por otros (p. ej. un funcionario que resuelve) aparecen sin recargar.
  useRecargaAutomatica(useMatch('/funcionario/solicitudes') !== null, actualizarEnSilencio);

  // El catálogo se pide aparte para no repetirlo en cada cambio de filtro.
  const cargarCatalogo = useCallback((): void => {
    void getTramites()
      .then(setTramites)
      .catch((e: unknown) => setMensajeCatalogo(e instanceof Error ? e.message : 'No se pudo cargar el catálogo de trámites.'));
  }, []);
  useCargarAlEntrar('/funcionario/solicitudes', cargarCatalogo);

  const aviso = error || mensajeCatalogo;
  return (
    <IonPage>
      <IonHeader><IonToolbar color="primary"><IonButtons slot="start"><IonMenuButton /></IonButtons><IonTitle>Solicitudes</IonTitle><IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar><IonToolbar><IonSegment scrollable value={filtro} onIonChange={(event) => setFiltro(esFiltroEstado(event.detail.value) ? event.detail.value : 'todos')}>{FILTROS.map((estado) => <IonSegmentButton key={estado} value={estado}><IonLabel>{estado === 'todos' ? 'Todas' : ETIQUETA_ESTADO[estado]}</IonLabel></IonSegmentButton>)}</IonSegment></IonToolbar></IonHeader>
      <IonContent>
        <RecargarAlTirar onRecargar={recargar} />
        <div className="contenedor-pagina">
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando solicitudes…</p></div> : error !== '' && solicitudes.length === 0 ? <div className="estado-vacio"><IonText color="danger"><p>{error}</p></IonText><IonButton fill="outline" onClick={cargar}>Reintentar</IonButton></div> : solicitudes.length === 0 ? <div className="estado-vacio"><IonIcon icon={fileTrayOutline} color="medium" /><IonText color="medium"><p>No hay solicitudes en este estado.</p></IonText></div> : <><IonList inset>{solicitudes.map((solicitud) => <IonItem key={solicitud.id} button lines="full" onClick={() => navigate(`/funcionario/solicitud/${encodeURIComponent(solicitud.id)}`)}><IonLabel className="ion-text-wrap"><h2>{tramites.find((tramite) => tramite.id === solicitud.tramiteId)?.nombre ?? 'Trámite municipal'}</h2><p>{solicitud.vecinoNombre} · Folio {solicitud.id}</p><p>Ingresado el {solicitud.fecha}</p></IonLabel><IonBadge color={COLOR_ESTADO[solicitud.estado]} slot="end">{ETIQUETA_ESTADO[solicitud.estado]}</IonBadge></IonItem>)}</IonList><PieListaPaginada pagination={pagination} cargados={solicitudes.length} cargandoMas={cargandoMas} onCargarMas={cargarMas} /></>}
        </div>
        <IonToast isOpen={aviso !== ''} message={aviso} duration={3500} color="danger" onDidDismiss={() => { limpiarError(); setMensajeCatalogo(''); }} />
      </IonContent>
    </IonPage>
  );
};

export default SolicitudesPage;
