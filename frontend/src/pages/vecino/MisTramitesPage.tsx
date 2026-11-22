import { useMatch, useNavigate } from 'react-router-dom';
import { useRecargaAutomatica } from '../../hooks/useRecargaAutomatica';
import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import EsqueletoLista from '../../components/common/EsqueletoLista';
import { TemaBoton } from '../../components/common/TemaToggle';
import { useCallback, useState } from 'react';
import { IonButtons,
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonToast,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { fileTrayOutline } from 'ionicons/icons';
import EstadoError from '../../components/common/EstadoError';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';
import { formatearFecha } from '../../utils/fechas';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  getTramites,
  getSolicitudesPagina,
} from '../../services/tramiteService';
import type { Tramite } from '../../services/tramiteService';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import PieListaPaginada from '../../components/common/PieListaPaginada';

const MisTramitesPage: React.FC = () => {
  useTituloPagina('Mis trámites');
  const navigate = useNavigate();
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'danger'>('danger');

  const cargarPagina = useCallback((page: number) => getSolicitudesPagina(page), []);
  const { items: solicitudes, pagination, cargando, cargandoMas, error, limpiarError, cargar, recargar, cargarMas, actualizarEnSilencio } = useListaPaginada(cargarPagina);
  useCargarAlEntrar('/vecino/mis-tramites', cargar, recargar);
  // Los cambios hechos por otros (p. ej. un funcionario que resuelve) aparecen sin recargar.
  useRecargaAutomatica(useMatch('/vecino/mis-tramites') !== null, actualizarEnSilencio);

  // El catálogo se pide aparte: no depende de la página de solicitudes.
  const cargarCatalogo = useCallback((): void => {
    void getTramites()
      .then(setTramites)
      .catch((e: unknown) => { setTipoMensaje('danger'); setMensaje(e instanceof Error ? e.message : 'No se pudo cargar el catálogo de trámites.'); });
  }, []);
  useCargarAlEntrar('/vecino/mis-tramites', cargarCatalogo, cargarCatalogo);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle><MarcaTitulo>Mis trámites</MarcaTitulo></IonTitle>
        <IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar>
      </IonHeader>
      <IonContent>
        <RecargarAlTirar onRecargar={recargar} />
        <div className="contenedor-pagina">
          <h1 className="sr-only" data-page-title>Mis trámites</h1>
          {cargando ? <EsqueletoLista mensaje="Cargando tus trámites…" /> : error !== '' && solicitudes.length === 0 ? (
            <EstadoError mensaje={error} onReintentar={cargar} />
          ) : solicitudes.length === 0 ? (
            <div className="estado-vacio">
              <IonIcon icon={fileTrayOutline} color="medium" aria-hidden="true" />
              <IonText color="medium">
                <p>Todavía no has iniciado trámites. Explora el catálogo para comenzar.</p>
              </IonText>
            </div>
          ) : (
            <>
            <IonList inset>
              {solicitudes.map((solicitud) => (
                <IonItem
                  key={solicitud.id}
                  button
                  lines="full"
                  onClick={() => navigate(`/vecino/mis-tramites/${encodeURIComponent(solicitud.id)}`)}
                >
                  <IonLabel className="ion-text-wrap">
                    <h2>{tramites.find((tramite) => tramite.id === solicitud.tramiteId)?.nombre ?? 'Trámite municipal'}</h2>
                    <p>
                      Folio {solicitud.id} · Ingresado el {formatearFecha(solicitud.fecha)}
                    </p>
                    {solicitud.observaciones !== undefined ? (
                      <IonNote color="medium">{solicitud.observaciones}</IonNote>
                    ) : null}
                    <IonNote color="primary">Ver detalle</IonNote>
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
