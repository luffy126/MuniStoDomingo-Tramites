import { useCallback, useEffect, useRef, useState } from 'react';
import { useMatch, useParams } from 'react-router-dom';
import {
  IonAlert, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonSelect,
  IonSelectOption, IonSpinner, IonText, IonTextarea,
} from '@ionic/react';
import {
  calendarOutline, closeOutline, timeOutline,
} from 'ionicons/icons';
import Header from '../../components/common/Header';
import EstadoError from '../../components/common/EstadoError';
import BotonCargando from '../../components/common/BotonCargando';
import DocumentosSolicitud from '../../components/solicitudes/DocumentosSolicitud';
import { ApiError } from '../../services/apiClient';
import {
  COLOR_ESTADO, COLOR_PRIORIDAD, ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, PRIORIDADES,
  actualizarEstadoSolicitud, actualizarPrioridadSolicitud, getSolicitudById, getTramites,
} from '../../services/tramiteService';
import type { EstadoSolicitud, PrioridadSolicitud, Solicitud, Tramite } from '../../services/tramiteService';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { useRecargaAutomatica } from '../../hooks/useRecargaAutomatica';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import { formatearFecha, formatearFechaHora } from '../../utils/fechas';

const ETIQUETA_ACCION: Record<EstadoSolicitud, string> = {
  pendiente: 'marcar como pendiente',
  en_revision: 'solicitar más información',
  aprobado: 'aprobar',
  rechazado: 'rechazar',
};

const esEstadoFinal = (estado: EstadoSolicitud): boolean =>
  estado === 'aprobado' || estado === 'rechazado';

const SolicitudDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  useTituloPagina(`Solicitud ${id ?? ''}`);

  const [solicitud, setSolicitud] = useState<Solicitud>();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [errorObservaciones, setErrorObservaciones] = useState('');
  const [errorResolucion, setErrorResolucion] = useState('');
  const [confirmacion, setConfirmacion] = useState<{ estado: EstadoSolicitud; texto: string } | null>(null);
  const [resultado, setResultado] = useState<{ folio: string; estado: EstadoSolicitud } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [actualizando, setActualizando] = useState(false);

  const [prioridadEditada, setPrioridadEditada] = useState<PrioridadSolicitud>('media');
  const [fechaLimiteEditada, setFechaLimiteEditada] = useState('');
  const [guardandoPrioridad, setGuardandoPrioridad] = useState(false);
  const [errorPrioridad, setErrorPrioridad] = useState('');

  const cargar = useCallback((): void => {
    if (!id) {
      setCargando(false);
      setErrorCarga('No se indicó un folio de solicitud.');
      return;
    }
    setCargando(true);
    setErrorCarga('');
    void Promise.all([getSolicitudById(id), getTramites()])
      .then(([item, catalogo]) => {
        setSolicitud(item);
        setObservaciones(item?.observaciones ?? '');
        setPrioridadEditada(item?.prioridad ?? 'media');
        setFechaLimiteEditada(item?.fechaLimite ?? '');
        setTramites(catalogo);
        if (!item) setErrorCarga('El folio no existe, fue cancelado por el vecino o no tienes acceso.');
      })
      .catch((error: unknown) => {
        setErrorCarga(error instanceof Error ? error.message : 'No se pudo cargar la solicitud.');
      })
      .finally(() => setCargando(false));
  }, [id]);
  useCargarAlEntrar('/funcionario/solicitud/:id', cargar);

  // Recarga automática: trae el estado actual (otro funcionario pudo resolverla)
  // sin spinner y sin pisar las observaciones que se estén escribiendo.
  const estadoVivo = useRef({ solicitud, observaciones, actualizando });
  estadoVivo.current = { solicitud, observaciones, actualizando };
  const actualizarEnSilencio = useCallback(async (): Promise<void> => {
    const previo = estadoVivo.current;
    if (!id || !previo.solicitud || previo.actualizando) return;
    const item = await getSolicitudById(id);
    const ahora = estadoVivo.current;
    if (!item || ahora.actualizando || ahora.solicitud?.id !== item.id) return;
    setSolicitud(item);
    const sinEditar = ahora.observaciones === (ahora.solicitud?.observaciones ?? '');
    if (sinEditar) setObservaciones(item.observaciones ?? '');
  }, [id]);
  useRecargaAutomatica(useMatch('/funcionario/solicitud/:id') !== null, actualizarEnSilencio);

  useEffect(() => {
    if (solicitud === undefined) return;
    if (!esEstadoFinal(solicitud.estado)) return;
    setConfirmacion(null);
  }, [solicitud]);

  const pedirConfirmacion = (estado: EstadoSolicitud): void => {
    if (!solicitud || actualizando || esEstadoFinal(solicitud.estado)) return;
    const texto = observaciones.trim();
    setErrorObservaciones('');
    setErrorResolucion('');

    if (estado === 'rechazado' && texto.length < 10) {
      setErrorObservaciones('Explica el motivo del rechazo: mínimo 10 caracteres.');
      document.getElementById('resolucion-observaciones')?.focus();
      return;
    }
    if (estado === 'en_revision' && solicitud.estado === 'en_revision' && texto === '') {
      setErrorObservaciones('Describe la información nueva o el antecedente que falta.');
      document.getElementById('resolucion-observaciones')?.focus();
      return;
    }

    setConfirmacion({ estado, texto });
  };

  const ejecutarCambio = async (): Promise<void> => {
    if (!solicitud || confirmacion === null) return;
    const { estado, texto } = confirmacion;
    setActualizando(true);
    setErrorResolucion('');
    try {
      const actualizada = await actualizarEstadoSolicitud(solicitud.id, estado, texto || undefined);
      setSolicitud(actualizada);
      setObservaciones(actualizada.observaciones ?? '');
      setResultado({ folio: actualizada.id, estado: actualizada.estado });
      setPrioridadEditada(actualizada.prioridad);
      setFechaLimiteEditada(actualizada.fechaLimite ?? '');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.';
      setErrorResolucion(mensaje);
      // 409: otro funcionario la resolvió mientras tanto. Se recarga para no
      // seguir mostrando acciones sobre un estado que ya cambió.
      if (error instanceof ApiError && error.status === 409) cargar();
    } finally {
      setActualizando(false);
    }
  };

  const guardarPrioridad = async (): Promise<void> => {
    if (!solicitud || esEstadoFinal(solicitud.estado)) return;
    setGuardandoPrioridad(true);
    setErrorPrioridad('');
    try {
      const actualizada = await actualizarPrioridadSolicitud(
        solicitud.id,
        prioridadEditada,
        fechaLimiteEditada === '' ? null : fechaLimiteEditada,
      );
      setSolicitud(actualizada);
      setPrioridadEditada(actualizada.prioridad);
      setFechaLimiteEditada(actualizada.fechaLimite ?? '');
    } catch (error) {
      setErrorPrioridad(error instanceof Error ? error.message : 'No se pudo guardar la prioridad.');
    } finally {
      setGuardandoPrioridad(false);
    }
  };

  if (cargando) {
    return (
      <IonPage>
        <Header titulo="Cargando solicitud…" rutaVolver="/funcionario/solicitudes" />
        <IonContent className="ion-text-center ion-padding"><IonSpinner /></IonContent>
      </IonPage>
    );
  }

  if (!solicitud) {
    return (
      <IonPage>
        <Header titulo="Solicitud no encontrada" rutaVolver="/funcionario/solicitudes" />
        <IonContent>
          <div className="contenedor-pagina">
            <EstadoError mensaje={errorCarga} onReintentar={cargar} />
            <IonButton expand="block" fill="outline" routerLink="/funcionario/solicitudes">
              Volver a la bandeja
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const tramite = tramites.find((item) => item.id === solicitud.tramiteId);
  const resuelta = esEstadoFinal(solicitud.estado);
  const esEnRevision = solicitud.estado === 'en_revision';

  return (
    <IonPage>
      <Header titulo={`Folio ${solicitud.id}`} rutaVolver="/funcionario/solicitudes" />
      <IonContent>
        <div className="contenedor-pagina">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{tramite?.nombre ?? solicitud.tramiteNombre ?? 'Trámite municipal'}</IonCardTitle>
              <div className="fila-chips">
                <IonBadge color={COLOR_ESTADO[solicitud.estado]}>{ETIQUETA_ESTADO[solicitud.estado]}</IonBadge>
                <IonBadge color={COLOR_PRIORIDAD[solicitud.prioridad]}>
                  Prioridad {ETIQUETA_PRIORIDAD[solicitud.prioridad].toLowerCase()}
                </IonBadge>
              </div>
            </IonCardHeader>
            <IonCardContent>{tramite?.descripcion ?? ''}</IonCardContent>
          </IonCard>

          <IonList inset>
            <IonItem>
              <IonLabel className="ion-text-wrap"><h3>Solicitante</h3><p>{solicitud.vecinoNombre}</p></IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel className="ion-text-wrap"><h3>Fecha de ingreso</h3><p>{formatearFecha(solicitud.fecha)}</p></IonLabel>
            </IonItem>
            <IonItem>
              <IonIcon icon={calendarOutline} color="primary" slot="start" aria-hidden="true" />
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
          </IonList>

          {resultado !== null ? (
            <IonCard color="success">
              <IonCardHeader>
                <IonCardTitle>Resolución registrada</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>
                  El folio <strong>{resultado.folio}</strong> quedó como{' '}
                  <strong>{ETIQUETA_ESTADO[resultado.estado]}</strong>. El vecino recibió el aviso
                  dentro de la aplicación y por correo.
                </p>
                <IonButton fill="solid" color="light" routerLink="/funcionario/solicitudes">
                  Volver a la bandeja
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : null}

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Resolución</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {resuelta ? (
                <>
                  <IonText color="medium">
                    <p>Esta solicitud ya fue resuelta y no admite más cambios de estado.</p>
                  </IonText>
                  <IonText>
                    <p>{solicitud.observaciones ?? 'Sin observaciones registradas.'}</p>
                  </IonText>
                </>
              ) : (
                <>
                  <IonTextarea
                    id="resolucion-observaciones"
                    label="Observaciones para el vecino"
                    labelPlacement="floating"
                    fill="outline"
                    autoGrow
                    rows={3}
                    value={observaciones}
                    disabled={actualizando}
                    onIonInput={(event) => {
                      setObservaciones(event.detail.value ?? '');
                      if (errorObservaciones !== '') setErrorObservaciones('');
                    }}
                  />
                  {errorObservaciones !== '' ? (
                    <IonText color="danger" role="alert"><p>{errorObservaciones}</p></IonText>
                  ) : null}
                  {errorResolucion !== '' ? (
                    <IonText color="danger" role="alert"><p>{errorResolucion}</p></IonText>
                  ) : null}
                  <IonText color="medium">
                    <p>
                      La aprobación y el rechazo son definitivos. Al rechazar debes explicar el motivo
                      (mínimo 10 caracteres); el vecino recibirá un aviso con tu comentario.
                    </p>
                  </IonText>
                  <div className="fila-botones">
                    <BotonCargando
                      type="button"
                      color="success"
                      cargando={actualizando}
                      texto="Aprobar"
                      textoCargando="Guardando…"
                      onClick={() => pedirConfirmacion('aprobado')}
                    />
                    <IonButton
                      className="boton-tonal"
                      color="warning"
                      disabled={actualizando}
                      onClick={() => pedirConfirmacion('en_revision')}
                    >
                      <IonIcon icon={timeOutline} slot="start" aria-hidden="true" />
                      {esEnRevision ? 'Agregar información' : 'Solicitar más información'}
                    </IonButton>
                    <IonButton
                      fill="outline"
                      color="danger"
                      disabled={actualizando}
                      onClick={() => pedirConfirmacion('rechazado')}
                    >
                      <IonIcon icon={closeOutline} slot="start" aria-hidden="true" />
                      Rechazar
                    </IonButton>
                  </div>
                </>
              )}
            </IonCardContent>
          </IonCard>

          {!resuelta ? (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Prioridad y plazo</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonSelect
                  label="Prioridad"
                  labelPlacement="floating"
                  fill="outline"
                  value={prioridadEditada}
                  disabled={guardandoPrioridad}
                  onIonChange={(event) => setPrioridadEditada(event.detail.value as PrioridadSolicitud)}
                >
                  {PRIORIDADES.map((prioridad) => (
                    <IonSelectOption key={prioridad} value={prioridad}>
                      {ETIQUETA_PRIORIDAD[prioridad]}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                <IonInput
                  className="ion-margin-top"
                  label="Fecha límite (opcional)"
                  labelPlacement="floating"
                  fill="outline"
                  type="date"
                  value={fechaLimiteEditada}
                  disabled={guardandoPrioridad}
                  onIonInput={(event) => setFechaLimiteEditada(event.detail.value ?? '')}
                />
                {errorPrioridad !== '' ? (
                  <IonText color="danger" role="alert"><p>{errorPrioridad}</p></IonText>
                ) : null}
                <BotonCargando
                  type="button"
                  expand="block"
                  fill="outline"
                  className="ion-margin-top"
                  cargando={guardandoPrioridad}
                  texto="Guardar prioridad"
                  textoCargando="Guardando…"
                  onClick={() => void guardarPrioridad()}
                />
              </IonCardContent>
            </IonCard>
          ) : null}

          <DocumentosSolicitud folio={solicitud.id} puedeSubir={false} />

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Historial de la solicitud</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {solicitud.historial && solicitud.historial.length > 0 ? (
                <IonList lines="full">
                  {solicitud.historial.map((evento) => (
                    <IonItem key={evento.id}>
                      <IonLabel className="ion-text-wrap">
                        <h3>
                          {evento.estadoAnterior === null
                            ? `Ingreso como ${ETIQUETA_ESTADO[evento.estadoNuevo as EstadoSolicitud] ?? evento.estadoNuevo}`
                            : `${ETIQUETA_ESTADO[evento.estadoAnterior as EstadoSolicitud] ?? evento.estadoAnterior} → ${ETIQUETA_ESTADO[evento.estadoNuevo as EstadoSolicitud] ?? evento.estadoNuevo}`}
                        </h3>
                        <p>{formatearFechaHora(evento.fecha)} · {evento.actorNombre}</p>
                        {evento.observaciones ? <p>{evento.observaciones}</p> : null}
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <IonText color="medium">
                  <p>No hay movimientos registrados. El ingreso de la solicitud es el punto de partida.</p>
                </IonText>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        <IonAlert
          isOpen={confirmacion !== null}
          header="Confirmar acción"
          message={
            confirmacion === null
              ? ''
              : `Vas a ${ETIQUETA_ACCION[confirmacion.estado]} el folio ${solicitud.id}. ${
                  esEstadoFinal(confirmacion.estado)
                    ? 'La acción es final y no se puede deshacer. '
                    : ''
                }Se enviará un aviso al vecino dentro de la aplicación y por correo.`
          }
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Sí, continuar',
              handler: () => {
                void ejecutarCambio();
              },
            },
          ]}
          onDidDismiss={() => setConfirmacion(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default SolicitudDetailPage;
