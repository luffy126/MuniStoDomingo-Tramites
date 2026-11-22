import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonAccordion, IonAccordionGroup, IonBadge, IonButton, IonButtons, IonCheckbox,
  IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenuButton,
  IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonText, IonTitle, IonToast, IonToolbar,
} from '@ionic/react';
import { closeCircleOutline, fileTrayOutline, funnelOutline } from 'ionicons/icons';
import { useNavigate, useMatch } from 'react-router-dom';
import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import { TemaBoton } from '../../components/common/TemaToggle';
import EstadoError from '../../components/common/EstadoError';
import EsqueletoLista from '../../components/common/EsqueletoLista';
import PieListaPaginada from '../../components/common/PieListaPaginada';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';
import { useCargarAlEntrar } from '../../hooks/useCargarAlEntrar';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import { useRecargaAutomatica } from '../../hooks/useRecargaAutomatica';
import { formatearFecha } from '../../utils/fechas';
import {
  COLOR_ESTADO, COLOR_PRIORIDAD, ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, PRIORIDADES,
  getSolicitudesPagina, getTramites,
} from '../../services/tramiteService';
import type {
  EstadoSolicitud, FiltrosBandeja, PrioridadSolicitud, Tramite,
} from '../../services/tramiteService';

type FiltroEstado = EstadoSolicitud | 'todos';
type OrdenBandeja = NonNullable<FiltrosBandeja['orden']>;

const FILTROS_ESTADO: FiltroEstado[] = ['todos', 'pendiente', 'en_revision', 'aprobado', 'rechazado'];
const ORDENES: Array<{ valor: OrdenBandeja; etiqueta: string }> = [
  { valor: 'reciente', etiqueta: 'Más recientes' },
  { valor: 'antigua', etiqueta: 'Más antiguas' },
  { valor: 'prioridad', etiqueta: 'Prioridad' },
  { valor: 'limite', etiqueta: 'Fecha límite' },
];
const CLAVE_FILTROS = 'bandeja-solicitudes-filtros';

const esFiltroEstado = (value: unknown): value is FiltroEstado =>
  typeof value === 'string' && (FILTROS_ESTADO as string[]).includes(value);

const esOrden = (value: unknown): value is OrdenBandeja =>
  ORDENES.some((orden) => orden.valor === value);

interface FiltrosGuardados {
  busqueda: string;
  estado: FiltroEstado;
  prioridad: PrioridadSolicitud | 'todas';
  tramiteId: string;
  desde: string;
  hasta: string;
  orden: OrdenBandeja;
  soloVencidas: boolean;
}

const FILTROS_INICIALES: FiltrosGuardados = {
  busqueda: '',
  estado: 'todos',
  prioridad: 'todas',
  tramiteId: '',
  desde: '',
  hasta: '',
  orden: 'reciente',
  soloVencidas: false,
};

const leerFiltros = (): FiltrosGuardados => {
  try {
    const guardados = sessionStorage.getItem(CLAVE_FILTROS);
    if (!guardados) return FILTROS_INICIALES;
    const datos = JSON.parse(guardados) as Partial<FiltrosGuardados>;
    return {
      busqueda: typeof datos.busqueda === 'string' ? datos.busqueda : '',
      estado: esFiltroEstado(datos.estado) ? datos.estado : 'todos',
      prioridad:
        typeof datos.prioridad === 'string' &&
        (datos.prioridad === 'todas' || (PRIORIDADES as string[]).includes(datos.prioridad))
          ? datos.prioridad as PrioridadSolicitud | 'todas'
          : 'todas',
      tramiteId: typeof datos.tramiteId === 'string' ? datos.tramiteId : '',
      desde: typeof datos.desde === 'string' ? datos.desde : '',
      hasta: typeof datos.hasta === 'string' ? datos.hasta : '',
      orden: esOrden(datos.orden) ? datos.orden : 'reciente',
      soloVencidas: datos.soloVencidas === true,
    };
  } catch {
    return FILTROS_INICIALES;
  }
};

const estaVencida = (fechaLimite: string | undefined, estado: EstadoSolicitud): boolean => {
  if (!fechaLimite || estado === 'aprobado' || estado === 'rechazado') return false;
  return fechaLimite < new Date().toISOString().slice(0, 10);
};

const SolicitudesPage: React.FC = () => {
  useTituloPagina('Solicitudes');
  const navigate = useNavigate();
  const iniciales = useMemo(leerFiltros, []);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [mensajeCatalogo, setMensajeCatalogo] = useState('');

  const [busqueda, setBusqueda] = useState(iniciales.busqueda);
  const [q, setQ] = useState(iniciales.busqueda);
  const [estado, setEstado] = useState<FiltroEstado>(iniciales.estado);
  const [prioridad, setPrioridad] = useState<PrioridadSolicitud | 'todas'>(iniciales.prioridad);
  const [tramiteId, setTramiteId] = useState(iniciales.tramiteId);
  const [desde, setDesde] = useState(iniciales.desde);
  const [hasta, setHasta] = useState(iniciales.hasta);
  const [orden, setOrden] = useState<OrdenBandeja>(iniciales.orden);
  const [soloVencidas, setSoloVencidas] = useState(iniciales.soloVencidas);

  // Espera a que el usuario deje de escribir antes de consultar.
  useEffect(() => {
    const temporizador = window.setTimeout(() => setQ(busqueda.trim()), 350);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  useEffect(() => {
    const guardados: FiltrosGuardados = {
      busqueda, estado, prioridad, tramiteId, desde, hasta, orden, soloVencidas,
    };
    try {
      sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(guardados));
    } catch {
      // sessionStorage bloqueado: los filtros duran lo que la pantalla.
    }
  }, [busqueda, estado, prioridad, tramiteId, desde, hasta, orden, soloVencidas]);

  const filtros = useMemo<FiltrosBandeja>(() => ({
    ...(estado !== 'todos' ? { estado } : {}),
    ...(prioridad !== 'todas' ? { prioridad } : {}),
    ...(tramiteId !== '' ? { tramiteId } : {}),
    ...(desde !== '' ? { desde } : {}),
    ...(hasta !== '' ? { hasta } : {}),
    ...(q !== '' ? { q } : {}),
    orden,
    ...(soloVencidas ? { vencidas: true } : {}),
  }), [estado, prioridad, tramiteId, desde, hasta, q, orden, soloVencidas]);

  const cargarPagina = useCallback(
    (page: number) => getSolicitudesPagina(page, filtros),
    [filtros],
  );
  const {
    items: solicitudes, pagination, cargando, cargandoMas, error, limpiarError,
    cargar, recargar, cargarMas, actualizarEnSilencio,
  } = useListaPaginada(cargarPagina);

  useCargarAlEntrar('/funcionario/solicitudes', cargar, recargar);
  useRecargaAutomatica(useMatch('/funcionario/solicitudes') !== null, actualizarEnSilencio);

  const cargarCatalogo = useCallback((): void => {
    void getTramites()
      .then(setTramites)
      .catch((e: unknown) => setMensajeCatalogo(
        e instanceof Error ? e.message : 'No se pudo cargar el catálogo de trámites.',
      ));
  }, []);
  useCargarAlEntrar('/funcionario/solicitudes', cargarCatalogo, cargarCatalogo);

  const hayFiltros =
    busqueda !== '' || estado !== 'todos' || prioridad !== 'todas' || tramiteId !== '' ||
    desde !== '' || hasta !== '' || soloVencidas || orden !== 'reciente';

  const limpiarFiltros = (): void => {
    setBusqueda('');
    setQ('');
    setEstado('todos');
    setPrioridad('todas');
    setTramiteId('');
    setDesde('');
    setHasta('');
    setOrden('reciente');
    setSoloVencidas(false);
  };

  const aviso = error || mensajeCatalogo;
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle><MarcaTitulo>Solicitudes</MarcaTitulo></IonTitle>
          <IonButtons slot="end"><TemaBoton /></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={busqueda}
            onIonInput={(event) => setBusqueda(event.detail.value ?? '')}
            placeholder="Buscar por folio, vecino o trámite"
            debounce={0}
            aria-label="Buscar solicitudes por folio, vecino o trámite"
          />
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            scrollable
            value={estado}
            onIonChange={(event) => {
              if (esFiltroEstado(event.detail.value)) setEstado(event.detail.value);
            }}
            aria-label="Filtrar por estado"
          >
            {FILTROS_ESTADO.map((valor) => (
              <IonSegmentButton key={valor} value={valor}>
                <IonLabel>{valor === 'todos' ? 'Todas' : ETIQUETA_ESTADO[valor]}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <RecargarAlTirar onRecargar={recargar} />
        <div className="contenedor-pagina">
          <h1 className="sr-only" data-page-title>Solicitudes</h1>

          <IonAccordionGroup>
            <IonAccordion value="filtros">
              <IonItem slot="header" lines="none">
                <IonIcon icon={funnelOutline} slot="start" aria-hidden="true" />
                <IonLabel>
                  Más filtros
                  {hayFiltros ? <p>Hay filtros activos</p> : <p>Prioridad, trámite, fechas y orden</p>}
                </IonLabel>
              </IonItem>
              <div className="ion-padding" slot="content">
                <IonSelect
                  label="Prioridad"
                  labelPlacement="floating"
                  fill="outline"
                  value={prioridad}
                  onIonChange={(event) => {
                    const valor = event.detail.value;
                    setPrioridad(
                      valor === 'todas' || (PRIORIDADES as string[]).includes(valor)
                        ? valor as PrioridadSolicitud | 'todas'
                        : 'todas',
                    );
                  }}
                >
                  <IonSelectOption value="todas">Todas</IonSelectOption>
                  {PRIORIDADES.map((valor) => (
                    <IonSelectOption key={valor} value={valor}>
                      {ETIQUETA_PRIORIDAD[valor]}
                    </IonSelectOption>
                  ))}
                </IonSelect>

                <IonSelect
                  className="ion-margin-top"
                  label="Trámite"
                  labelPlacement="floating"
                  fill="outline"
                  value={tramiteId}
                  onIonChange={(event) => setTramiteId(String(event.detail.value ?? ''))}
                >
                  <IonSelectOption value="">Todos los trámites</IonSelectOption>
                  {tramites.map((tramite) => (
                    <IonSelectOption key={tramite.id} value={tramite.id}>
                      {tramite.nombre}
                    </IonSelectOption>
                  ))}
                </IonSelect>

                <div className="fila-campos">
                  <IonInput
                    label="Desde"
                    labelPlacement="floating"
                    fill="outline"
                    type="date"
                    value={desde}
                    onIonInput={(event) => setDesde(event.detail.value ?? '')}
                  />
                  <IonInput
                    label="Hasta"
                    labelPlacement="floating"
                    fill="outline"
                    type="date"
                    value={hasta}
                    onIonInput={(event) => setHasta(event.detail.value ?? '')}
                  />
                </div>

                <IonSelect
                  className="ion-margin-top"
                  label="Orden"
                  labelPlacement="floating"
                  fill="outline"
                  value={orden}
                  onIonChange={(event) => {
                    if (esOrden(event.detail.value)) setOrden(event.detail.value);
                  }}
                >
                  {ORDENES.map((opcion) => (
                    <IonSelectOption key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </IonSelectOption>
                  ))}
                </IonSelect>

                <IonItem lines="none" className="ion-margin-top">
                  <IonCheckbox
                    checked={soloVencidas}
                    onIonChange={(event) => setSoloVencidas(event.detail.checked)}
                  >
                    Solo solicitudes vencidas
                  </IonCheckbox>
                </IonItem>

                {hayFiltros ? (
                  <IonButton fill="clear" color="medium" onClick={limpiarFiltros}>
                    <IonIcon icon={closeCircleOutline} slot="start" aria-hidden="true" />
                    Limpiar filtros
                  </IonButton>
                ) : null}
              </div>
            </IonAccordion>
          </IonAccordionGroup>

          {cargando ? (
            <EsqueletoLista mensaje="Cargando solicitudes…" />
          ) : aviso !== '' && solicitudes.length === 0 ? (
            <EstadoError mensaje={aviso} onReintentar={cargar} />
          ) : solicitudes.length === 0 ? (
            <div className="estado-vacio">
              <IonIcon icon={fileTrayOutline} color="medium" aria-hidden="true" />
              <IonText color="medium">
                <h2>No hay solicitudes con estos filtros</h2>
                <p>Prueba con otro estado, prioridad o rango de fechas.</p>
              </IonText>
              {hayFiltros ? (
                <IonButton fill="outline" onClick={limpiarFiltros}>Limpiar filtros</IonButton>
              ) : null}
            </div>
          ) : (
            <>
              <IonList inset>
                {solicitudes.map((solicitud) => {
                  const vencida = estaVencida(solicitud.fechaLimite, solicitud.estado);
                  return (
                    <IonItem
                      key={solicitud.id}
                      button
                      lines="full"
                      onClick={() => navigate(`/funcionario/solicitud/${encodeURIComponent(solicitud.id)}`)}
                    >
                      <IonLabel className="ion-text-wrap">
                        <h2>{solicitud.tramiteNombre}</h2>
                        <p>{solicitud.vecinoNombre} · Folio {solicitud.id}</p>
                        <p>Ingresado el {formatearFecha(solicitud.fecha)}</p>
                        <div className="fila-chips">
                          <IonBadge color={COLOR_ESTADO[solicitud.estado]}>
                            {ETIQUETA_ESTADO[solicitud.estado]}
                          </IonBadge>
                          <IonBadge color={COLOR_PRIORIDAD[solicitud.prioridad]}>
                            {ETIQUETA_PRIORIDAD[solicitud.prioridad]}
                          </IonBadge>
                          {vencida ? <IonBadge color="danger">Vencida</IonBadge> : null}
                        </div>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
              <PieListaPaginada
                pagination={pagination}
                cargados={solicitudes.length}
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
          color="danger"
          onDidDismiss={() => { limpiarError(); setMensajeCatalogo(''); }}
        />
      </IonContent>
    </IonPage>
  );
};

export default SolicitudesPage;
