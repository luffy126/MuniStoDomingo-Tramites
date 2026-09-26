import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  getSolicitudes,
  getTramiteById,
} from '../../services/tramiteService';
import type { EstadoSolicitud, Solicitud } from '../../services/tramiteService';

type FiltroEstado = EstadoSolicitud | 'todos';

const FILTROS: FiltroEstado[] = ['todos', 'pendiente', 'en_revision', 'aprobado', 'rechazado'];

const esFiltroEstado = (valor: unknown): valor is FiltroEstado =>
  typeof valor === 'string' && (FILTROS as string[]).includes(valor);

const SolicitudesPage: React.FC = () => {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');

  const cargar = useCallback((): void => {
    setSolicitudes(getSolicitudes());
  }, []);

  useIonViewWillEnter(cargar);

  const visibles = useMemo<Solicitud[]>(
    () => (filtro === 'todos' ? solicitudes : solicitudes.filter((item) => item.estado === filtro)),
    [solicitudes, filtro]
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Solicitudes</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            scrollable
            value={filtro}
            onIonChange={(event) => {
              const valor = event.detail.value;
              setFiltro(esFiltroEstado(valor) ? valor : 'todos');
            }}
          >
            {FILTROS.map((estado) => (
              <IonSegmentButton key={estado} value={estado}>
                <IonLabel>{estado === 'todos' ? 'Todas' : ETIQUETA_ESTADO[estado]}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          {visibles.length === 0 ? (
            <div className="estado-vacio">
              <IonIcon icon={fileTrayOutline} color="medium" />
              <IonText color="medium">
                <p>No hay solicitudes en este estado.</p>
              </IonText>
            </div>
          ) : (
            <IonList inset>
              {visibles.map((solicitud) => (
                <IonItem
                  key={solicitud.id}
                  button
                  lines="full"
                  onClick={() => navigate(`/funcionario/solicitud/${solicitud.id}`)}
                >
                  <IonLabel className="ion-text-wrap">
                    <h2>{getTramiteById(solicitud.tramiteId)?.nombre ?? 'Trámite municipal'}</h2>
                    <p>
                      {solicitud.vecinoNombre} · Folio {solicitud.id}
                    </p>
                    <p>Ingresado el {solicitud.fecha}</p>
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

export default SolicitudesPage;
