import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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

  useEffect(() => {
    let cancelled = false;
    void getTramites()
      .then((items) => { if (!cancelled) setTramites(items); })
      .catch((error: unknown) => {
        if (!cancelled) setMensaje(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.');
      })
      .finally(() => { if (!cancelled) setCargando(false); });
    return () => { cancelled = true; };
  }, []);

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
        <IonToolbar color="primary"><IonTitle>Catálogo de trámites</IonTitle></IonToolbar>
        <IonToolbar>
          <IonSearchbar placeholder="Buscar trámite" value={busqueda} onIonInput={(event) => setBusqueda(event.detail.value ?? '')} />
        </IonToolbar>
      </IonHeader>
      <IonContent>
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
