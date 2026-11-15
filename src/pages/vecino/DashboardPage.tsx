import RecargarAlTirar from '../../components/common/RecargarAlTirar';
import { TemaBoton } from '../../components/common/TemaToggle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import TramiteList from '../../components/tramites/TramiteList';
import { useAuth } from '../../context/AuthContext';
import { ETIQUETA_CATEGORIA, getTramites } from '../../services/tramiteService';
import type { CategoriaTramite, Tramite } from '../../services/tramiteService';

const CATEGORIAS: CategoriaTramite[] = ['certificados', 'permisos', 'reclamos', 'solicitudes'];

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<CategoriaTramite | null>(null);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const montada = useRef(true);
  useEffect(() => {
    montada.current = true; // StrictMode desmonta y vuelve a montar en desarrollo
    return () => { montada.current = false; };
  }, []);

  /** Pide el catálogo. Al recargar se conserva el que había si la petición falla. */
  const cargarTramites = useCallback(async (): Promise<void> => {
    try {
      const items = await getTramites();
      if (montada.current) setTramites(items);
    } catch (error: unknown) {
      if (montada.current) setMensaje(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.');
    } finally {
      if (montada.current) setCargando(false);
    }
  }, []);

  useEffect(() => { void cargarTramites(); }, [cargarTramites]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return tramites.filter((tramite) => {
      const matchesQuery = !query || tramite.nombre.toLowerCase().includes(query) ||
        tramite.descripcion.toLowerCase().includes(query) ||
        ETIQUETA_CATEGORIA[tramite.categoria].toLowerCase().includes(query);
      return matchesQuery && (categoria === null || tramite.categoria === categoria);
    });
  }, [tramites, busqueda, categoria]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary"><IonTitle>Catálogo de trámites</IonTitle><IonButtons slot="end"><TemaBoton /></IonButtons></IonToolbar>
        <IonToolbar>
          <IonSearchbar placeholder="Buscar trámite" value={busqueda} onIonInput={(event) => setBusqueda(event.detail.value ?? '')} />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <RecargarAlTirar onRecargar={cargarTramites} />
        <div className="contenedor-pagina">
          <IonText><h2>Hola, {user?.nombre ?? 'vecino'}</h2><p>Selecciona un trámite para conocer los requisitos e iniciar tu solicitud.</p></IonText>
          <div className="fila-chips">
            <IonChip color={categoria === null ? 'primary' : 'medium'} outline={categoria !== null} onClick={() => setCategoria(null)}>Todos</IonChip>
            {CATEGORIAS.map((item) => <IonChip key={item} color={categoria === item ? 'primary' : 'medium'} outline={categoria !== item} onClick={() => setCategoria(item)}>{ETIQUETA_CATEGORIA[item]}</IonChip>)}
          </div>
          {cargando ? <div className="ion-text-center ion-padding"><IonSpinner /><p>Cargando trámites…</p></div> : <TramiteList tramites={visibles} onSeleccionar={(tramite) => navigate(`/vecino/tramite/${tramite.id}`)} />}
        </div>
        <IonToast isOpen={mensaje !== ''} message={mensaje} duration={3500} color="danger" onDidDismiss={() => setMensaje('')} />
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
