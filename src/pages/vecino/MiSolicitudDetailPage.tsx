import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSpinner,
  IonText, IonToast, useIonAlert,
} from '@ionic/react';
import {
  checkmarkCircleOutline, closeCircleOutline, documentTextOutline, timeOutline,
} from 'ionicons/icons';
import Header from '../../components/common/Header';
import EstadoError from '../../components/common/EstadoError';
import DocumentosSolicitud from '../../components/solicitudes/DocumentosSolicitud';
import {
  COLOR_ESTADO, COLOR_PRIORIDAD, ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD,
  cancelarSolicitud, getSolicitudById, getTramites,
} from '../../services/tramiteService';
import type { EstadoSolicitud, Solicitud, Tramite } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { formatearFecha, formatearFechaHora } from '../../utils/fechas';

const MiSolicitudDetailPage: React.FC = () => {
  const { folio = '' } = useParams<{ folio: string }>();
  const navigate = useNavigate();
  const [presentarAlerta] = useIonAlert();
  const [solicitud, setSolicitud] = useState<Solicitud>();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback((): void => {
    setCargando(true);
    setError('');
    void Promise.all([getSolicitudById(folio), getTramites()])
      .then(([item, catalogo]) => {
        setSolicitud(item);
        setTramites(catalogo);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la solicitud.');
      })
      .finally(() => setCargando(false));
  }, [folio]);
  useCargarAlEntrar('/vecino/mis-tramites/:folio', cargar);

  const confirmarCancelacion = (): void => {
    if (solicitud === undefined || cancelando) return;
    void presentarAlerta({
      header: 'Cancelar solicitud',
      message: `¿Seguro que quieres cancelar la solicitud ${solicitud.id}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: () => {
            setCancelando(true);
            void cancelarSolicitud(solicitud.id)
              .then(() => {
                navigate('/vecino/mis-tramites', { replace: true });
              })
              .catch((e: unknown) => {
                setMensaje(e instanceof Error ? e.message : 'No se pudo cancelar la solicitud.');
                cargar();
              })
              .finally(() => setCancelando(false));
          },
        },
      ],
    });
  };

  if (cargando) {
    return (
      <IonPage>
        <Header titulo="Solicitud" rutaVolver="/vecino/mis-tramites" />
        <IonContent className="ion-text-center ion-padding" role="status" aria-live="polite">
          <IonSpinner aria-hidden="true" />
          <p>Cargando solicitud…</p>
        </IonContent>
      </IonPage>
    );
  }

  if (error !== '') {
    return (
      <IonPage>
        <Header titulo="Solicitud" rutaVolver="/vecino/mis-tramites" />
        <IonContent>
          <div className="contenedor-pagina">
            <EstadoError mensaje={error} onReintentar={cargar} />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (solicitud === undefined) {
    return (
      <IonPage>
        <Header titulo="Solicitud no encontrada" rutaVolver="/vecino/mis-tramites" />
        <IonContent className="ion-padding">
          <IonText color="medium">
            <p>La solicitud indicada no existe o no pertenece a tu cuenta.</p>
          </IonText>
          <IonButton expand="block" routerLink="/vecino/mis-tramites">
            Volver a mis trámites
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const tramite = tramites.find((item) => item.id === solicitud.tramiteId);
  const resuelta = solicitud.estado === 'aprobado' || solicitud.estado === 'rechazado';
  const enRevisionOResuelta = solicitud.estado !== 'pendiente';
  const etiquetaEvento = (estado: EstadoSolicitud | 'cancelada'): string =>
    estado === 'cancelada' ? 'Cancelada' : ETIQUETA_ESTADO[estado];

  return (
    <IonPage>
      <Header titulo={`Solicitud ${solicitud.id}`} rutaVolver="/vecino/mis-tramites" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{tramite?.nombre ?? solicitud.tramiteNombre ?? 'Trámite municipal'}</IonCardTitle>
              <div className="fila-chips">
                <IonBadge color={COLOR_ESTADO[solicitud.estado]}>
                  {ETIQUETA_ESTADO[solicitud.estado]}
                </IonBadge>
                <IonBadge color={COLOR_PRIORIDAD[solicitud.prioridad]}>
                  Prioridad {ETIQUETA_PRIORIDAD[solicitud.prioridad].toLowerCase()}
                </IonBadge>
              </div>
            </IonCardHeader>
            <IonCardContent>{tramite?.descripcion ?? ''}</IonCardContent>
          </IonCard>

          <IonList inset>
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Folio</h3>
                <p>{solicitud.id}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Fecha de ingreso</h3>
                <p>{formatearFecha(solicitud.fecha)}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Plazo comprometido</h3>
                <p>{solicitud.fechaLimite ? formatearFecha(solicitud.fechaLimite) : 'Sin plazo definido'}</p>
              </IonLabel>
            </IonItem>
            {solicitud.fechaResolucion ? (
              <IonItem>
                <IonLabel className="ion-text-wrap">
                  <h3>Fecha de resolución</h3>
                  <p>{formatearFecha(solicitud.fechaResolucion)}</p>
                </IonLabel>
              </IonItem>
            ) : null}
            <IonItem>
              <IonLabel className="ion-text-wrap">
                <h3>Observaciones</h3>
                <p>{solicitud.observaciones ?? 'Sin observaciones registradas.'}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Avance de tu solicitud</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {solicitud.historial && solicitud.historial.length > 0 ? (
                <IonList lines="none">
                  {solicitud.historial.map((evento) => (
                    <IonItem key={evento.id}>
                      <IonIcon
                        icon={
                          evento.estadoNuevo === 'aprobado'
                            ? checkmarkCircleOutline
                            : evento.estadoNuevo === 'rechazado'
                              ? closeCircleOutline
                              : timeOutline
                        }
                        color={
                          evento.estadoNuevo === 'rechazado'
                            ? 'danger'
                            : evento.estadoNuevo === 'aprobado'
                              ? 'success'
                              : 'secondary'
                        }
                        slot="start"
                        aria-hidden="true"
                      />
                      <IonLabel className="ion-text-wrap">
                        <h3>{etiquetaEvento(evento.estadoNuevo)}</h3>
                        <p>{formatearFechaHora(evento.fecha)}</p>
                        {evento.observaciones ? <p>{evento.observaciones}</p> : null}
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <IonList lines="none">
                  <IonItem>
                    <IonIcon icon={documentTextOutline} color="success" slot="start" aria-hidden="true" />
                    <IonLabel className="ion-text-wrap">
                      <h3>Solicitud ingresada</h3>
                      <p>{formatearFecha(solicitud.fecha)}</p>
                    </IonLabel>
                  </IonItem>
                  {enRevisionOResuelta ? (
                    <IonItem>
                      <IonIcon
                        icon={resuelta ? (solicitud.estado === 'aprobado' ? checkmarkCircleOutline : closeCircleOutline) : timeOutline}
                        color={solicitud.estado === 'rechazado' ? 'danger' : 'secondary'}
                        slot="start"
                        aria-hidden="true"
                      />
                      <IonLabel className="ion-text-wrap">
                        <h3>{resuelta ? ETIQUETA_ESTADO[solicitud.estado] : 'En revisión'}</h3>
                        <p>
                          {solicitud.estado === 'aprobado'
                            ? 'La solicitud fue aprobada por el municipio.'
                            : solicitud.estado === 'rechazado'
                              ? 'La solicitud fue rechazada. Revisa las observaciones.'
                              : 'El municipio está revisando los antecedentes.'}
                        </p>
                      </IonLabel>
                    </IonItem>
                  ) : null}
                </IonList>
              )}
            </IonCardContent>
          </IonCard>

          <DocumentosSolicitud
            folio={solicitud.id}
            puedeSubir={solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision'}
          />

          <div className="fila-botones">
            <IonButton fill="outline" routerLink="/vecino/mis-tramites">
              Volver a mis trámites
            </IonButton>
            {solicitud.estado === 'pendiente' ? (
              <IonButton
                color="danger"
                fill="outline"
                disabled={cancelando}
                aria-busy={cancelando}
                onClick={confirmarCancelacion}
              >
                {cancelando ? 'Cancelando…' : 'Cancelar solicitud'}
              </IonButton>
            ) : null}
          </div>
        </div>
        <IonToast
          isOpen={mensaje !== ''}
          message={mensaje}
          duration={3500}
          color="danger"
          onDidDismiss={() => setMensaje('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default MiSolicitudDetailPage;
