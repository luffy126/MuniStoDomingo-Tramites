import { useMatch, useNavigate } from 'react-router-dom';
import { useRecargaAutomatica } from '../../hooks/useRecargaAutomatica';
import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import { TemaBoton } from '../../components/common/TemaToggle';
import EstadoError from '../../components/common/EstadoError';
import EsqueletoLista from '../../components/common/EsqueletoLista';
import { useCallback, useState } from 'react';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonNote, IonPage, IonText, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { mailOpenOutline, mailUnreadOutline } from 'ionicons/icons';
import {
  getNotificacionesPagina,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from '../../services/tramiteService';
import type { Notificacion } from '../../services/tramiteService';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';
import { formatearFecha } from '../../utils/fechas';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import PieListaPaginada from '../../components/common/PieListaPaginada';

const NotificacionesPage: React.FC = () => {
  useTituloPagina('Notificaciones');
  const navigate = useNavigate();
  const { sinLeer, refrescar, actualizarSinLeer } = useNotificaciones();
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('danger');
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const cargarPagina = useCallback((page: number) => getNotificacionesPagina(page), []);
  const {
    items: notificaciones,
    setItems,
    pagination,
    setPagination,
    cargando,
    cargandoMas,
    error,
    limpiarError,
    cargar,
    recargar,
    cargarMas,
    actualizarEnSilencio,
  } = useListaPaginada(cargarPagina);
  useCargarAlEntrar('/vecino/notificaciones', cargar, recargar);
  useRecargaAutomatica(useMatch('/vecino/notificaciones') !== null, actualizarEnSilencio);

  const abrir = async (notificacion: Notificacion): Promise<void> => {
    if (!notificacion.leida) {
      try {
        const actualizada = await marcarNotificacionLeida(notificacion.id);
        setItems((actuales) => actuales.map((item) => (item.id === notificacion.id ? actualizada : item)));
        setPagination((actual) =>
          actual === null || actual.unread === undefined
            ? actual
            : { ...actual, unread: Math.max(0, actual.unread - 1) },
        );
        actualizarSinLeer(Math.max(0, sinLeer - 1));
      } catch (e) {
        // Marcar como leída es secundario: el folio debe abrirse igualmente.
        setTipoMensaje('danger');
        setMensaje(e instanceof Error ? e.message : 'No se pudo marcar la notificación como leída.');
      }
    }

    if (notificacion.folio !== undefined) {
      navigate(`/vecino/mis-tramites/${encodeURIComponent(notificacion.folio)}`);
    }
  };

  const marcarTodas = async (): Promise<void> => {
    if (sinLeer === 0 || marcandoTodas) return;
    setMarcandoTodas(true);
    try {
      await marcarTodasNotificacionesLeidas();
      setItems((actuales) => actuales.map((item) => ({ ...item, leida: true })));
      setPagination((actual) => (actual === null ? actual : { ...actual, unread: 0 }));
      actualizarSinLeer(0);
      setTipoMensaje('success');
      setMensaje('Todas las notificaciones quedaron como leídas.');
    } catch (e) {
      setTipoMensaje('danger');
      setMensaje(e instanceof Error ? e.message : 'No se pudieron marcar como leídas.');
    } finally {
      setMarcandoTodas(false);
    }
  };

  const aviso = mensaje || error;
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle><MarcaTitulo>Notificaciones</MarcaTitulo></IonTitle>
          {sinLeer > 0 ? (
            <IonBadge color="danger" slot="end" className="ion-margin-end" aria-label={`${sinLeer} sin leer`}>
              {sinLeer > 99 ? '99+' : sinLeer}
            </IonBadge>
          ) : null}
          <IonButtons slot="end">
            <TemaBoton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <RecargarAlTirar
          onRecargar={async () => {
            await recargar();
            await refrescar();
          }}
        />
        <div className="contenedor-pagina">
          <h1 className="sr-only" data-page-title>Notificaciones</h1>
          {sinLeer > 0 ? (
            <IonButton
              fill="outline"
              size="small"
              className="ion-margin-bottom"
              disabled={marcandoTodas}
              aria-busy={marcandoTodas}
              onClick={() => void marcarTodas()}
            >
              {marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
            </IonButton>
          ) : null}

          {cargando ? (
            <EsqueletoLista mensaje="Cargando notificaciones…" />
          ) : error !== '' && notificaciones.length === 0 ? (
            <EstadoError mensaje={error} onReintentar={cargar} />
          ) : notificaciones.length === 0 ? (
            <div className="estado-vacio">
              <IonIcon icon={mailOpenOutline} color="medium" aria-hidden="true" />
              <IonText color="medium">
                <h2>Sin notificaciones</h2>
                <p>Cuando haya novedades de tus trámites, aparecerán aquí.</p>
              </IonText>
            </div>
          ) : (
            <>
              <IonList inset>
                {notificaciones.map((notificacion) => {
                  const tieneEnlace = notificacion.folio !== undefined;
                  return (
                    <IonItem
                      key={notificacion.id}
                      button={!notificacion.leida || tieneEnlace}
                      lines="full"
                      onClick={() => void abrir(notificacion)}
                    >
                      <IonIcon
                        icon={notificacion.leida ? mailOpenOutline : mailUnreadOutline}
                        color={notificacion.leida ? 'medium' : 'primary'}
                        slot="start"
                        aria-hidden="true"
                      />
                      <IonLabel className="ion-text-wrap">
                        <h2>{notificacion.titulo}</h2>
                        <p>{notificacion.mensaje}</p>
                        <IonNote color="medium">
                          {formatearFecha(notificacion.fecha)}
                          {notificacion.leida ? '' : ' · No leída'}
                        </IonNote>
                        {tieneEnlace ? (
                          <IonNote color="primary">Ver solicitud {notificacion.folio}</IonNote>
                        ) : null}
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
              <PieListaPaginada
                pagination={pagination}
                cargados={notificaciones.length}
                cargandoMas={cargandoMas}
                onCargarMas={cargarMas}
              />
            </>
          )}
        </div>
        <IonToast
          isOpen={aviso !== ''}
          message={aviso}
          duration={3500}
          color={mensaje !== '' ? tipoMensaje : 'danger'}
          onDidDismiss={() => {
            setMensaje('');
            limpiarError();
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default NotificacionesPage;
