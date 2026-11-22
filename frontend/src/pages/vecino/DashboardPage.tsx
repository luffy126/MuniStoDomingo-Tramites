import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import { TemaBoton } from '../../components/common/TemaToggle';
import EstadoError from '../../components/common/EstadoError';
import EsqueletoLista from '../../components/common/EsqueletoLista';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import TramiteList from '../../components/tramites/TramiteList';
import { useAuth } from '../../hooks/useAuth';
import { ETIQUETA_CATEGORIA, getTramites } from '../../services/tramiteService';
import type { CategoriaTramite, Tramite } from '../../services/tramiteService';
import { incluyeTexto } from '../../utils/texto';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import MarcaTitulo from '../../components/common/MarcaTitulo';

const CATEGORIAS: CategoriaTramite[] = ['certificados', 'permisos', 'reclamos', 'solicitudes'];

const DashboardPage: React.FC = () => {
  useTituloPagina('Catálogo de trámites');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<CategoriaTramite | null>(null);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const montada = useRef(true);
  useEffect(() => {
    montada.current = true; // StrictMode desmonta y vuelve a montar en desarrollo
    return () => {
      montada.current = false;
    };
  }, []);

  /** Pide el catálogo. Al recargar se conserva el que había si la petición falla. */
  const cargarTramites = useCallback(async (fuerza = false): Promise<void> => {
    setCargando(true);
    setError('');
    try {
      const items = await getTramites(fuerza);
      if (montada.current) setTramites(items);
    } catch (errorDesconocido: unknown) {
      if (montada.current) {
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.',
        );
      }
    } finally {
      if (montada.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarTramites();
  }, [cargarTramites]);

  const visibles = useMemo(
    () =>
      tramites.filter((tramite) => {
        const coincideTexto =
          incluyeTexto(tramite.nombre, busqueda) ||
          incluyeTexto(tramite.descripcion, busqueda) ||
          incluyeTexto(ETIQUETA_CATEGORIA[tramite.categoria], busqueda);
        return coincideTexto && (categoria === null || tramite.categoria === categoria);
      }),
    [tramites, busqueda, categoria],
  );

  const hayFiltros = busqueda.trim() !== '' || categoria !== null;

  const limpiarFiltros = (): void => {
    setBusqueda('');
    setCategoria(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle><MarcaTitulo>Catálogo de trámites</MarcaTitulo></IonTitle>
          <IonButtons slot="end">
            <TemaBoton />
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            aria-label="Buscar trámite por nombre, descripción o categoría"
            placeholder="Buscar trámite"
            value={busqueda}
            onIonInput={(event) => setBusqueda(event.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <RecargarAlTirar onRecargar={() => cargarTramites(true)} />
        <div className="contenedor-pagina">
          <h1 className="sr-only" data-page-title>
            Catálogo de trámites
          </h1>
          <IonText>
            <h2>Hola, {user?.nombre ?? 'vecino'}</h2>
            <p>Selecciona un trámite para conocer los requisitos e iniciar tu solicitud.</p>
          </IonText>
          <div className="fila-chips" role="group" aria-label="Filtrar por categoría">
            <button
              type="button"
              className="chip-filtro"
              aria-pressed={categoria === null}
              onClick={() => setCategoria(null)}
            >
              Todos
            </button>
            {CATEGORIAS.map((item) => (
              <button
                key={item}
                type="button"
                className="chip-filtro"
                aria-pressed={categoria === item}
                onClick={() => setCategoria(item)}
              >
                {ETIQUETA_CATEGORIA[item]}
              </button>
            ))}
          </div>

          {cargando ? (
            <EsqueletoLista mensaje="Cargando trámites…" />
          ) : error !== '' && tramites.length === 0 ? (
            <EstadoError mensaje={error} onReintentar={() => void cargarTramites(true)} />
          ) : (
            <TramiteList
              tramites={visibles}
              onSeleccionar={(tramite) => navigate(`/vecino/tramite/${tramite.id}`)}
              onLimpiarFiltros={hayFiltros ? limpiarFiltros : undefined}
            />
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
