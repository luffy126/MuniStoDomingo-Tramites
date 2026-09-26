import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonChip,
  IonContent,
  IonHeader,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import TramiteList from '../../components/tramites/TramiteList';
import { useAuth } from '../../context/AuthContext';
import { ETIQUETA_CATEGORIA, buscarTramites } from '../../services/tramiteService';
import type { CategoriaTramite, Tramite } from '../../services/tramiteService';

const CATEGORIAS: CategoriaTramite[] = ['certificados', 'permisos', 'reclamos', 'solicitudes'];

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoria, setCategoria] = useState<CategoriaTramite | null>(null);

  const tramites = useMemo<Tramite[]>(() => {
    const encontrados = buscarTramites(busqueda);
    return categoria === null
      ? encontrados
      : encontrados.filter((tramite) => tramite.categoria === categoria);
  }, [busqueda, categoria]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Catálogo de trámites</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="Buscar trámite"
            value={busqueda}
            onIonInput={(event) => setBusqueda(event.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contenedor-pagina">
          <IonText>
            <h2>Hola, {user?.nombre ?? 'vecino'}</h2>
            <p>Selecciona un trámite para conocer los requisitos e iniciar tu solicitud.</p>
          </IonText>

          <div className="fila-chips">
            <IonChip
              color={categoria === null ? 'primary' : 'medium'}
              outline={categoria !== null}
              onClick={() => setCategoria(null)}
            >
              Todos
            </IonChip>
            {CATEGORIAS.map((item) => (
              <IonChip
                key={item}
                color={categoria === item ? 'primary' : 'medium'}
                outline={categoria !== item}
                onClick={() => setCategoria(item)}
              >
                {ETIQUETA_CATEGORIA[item]}
              </IonChip>
            ))}
          </div>

          <TramiteList
            tramites={tramites}
            onSeleccionar={(tramite) => navigate(`/vecino/tramite/${tramite.id}`)}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
