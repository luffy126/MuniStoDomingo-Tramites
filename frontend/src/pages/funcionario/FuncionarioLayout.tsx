import { lazy, Suspense } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { barChartOutline, documentsOutline, logOutOutline } from 'ionicons/icons';
const SolicitudesPage = lazy(() => import('./SolicitudesPage'));
const SolicitudDetailPage = lazy(() => import('./SolicitudDetailPage'));
const ReportesPage = lazy(() => import('./ReportesPage'));
import { useAuth } from '../../hooks/useAuth';
import Redireccion from '../../routes/Redireccion';
import { TemaItem } from '../../components/common/TemaToggle';
import MarcaTitulo from '../../components/common/MarcaTitulo';

/** Suspense por página: el menú y el split pane quedan fuera del límite. */
const perezosa = (pagina: React.ReactNode): React.ReactElement => (
  <Suspense fallback={null}>{pagina}</Suspense>
);

const FuncionarioLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cerrarSesion = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <IonSplitPane contentId="contenido-funcionario" when="lg">
      <IonMenu contentId="contenido-funcionario" menuId="menu-funcionario">
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle><MarcaTitulo>Gestión municipal</MarcaTitulo></IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonListHeader>
              <IonLabel>{user?.nombre ?? 'Funcionario'}</IonLabel>
            </IonListHeader>
            <IonNote color="medium" className="menu-nota">
              {user?.email ?? ''}
            </IonNote>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/funcionario/solicitudes" detail={false} lines="none">
                <IonIcon icon={documentsOutline} slot="start" color="primary" aria-hidden="true" />
                <IonLabel>Solicitudes</IonLabel>
              </IonItem>
              <IonItem button routerLink="/funcionario/reportes" detail={false} lines="none">
                <IonIcon icon={barChartOutline} slot="start" color="primary" aria-hidden="true" />
                <IonLabel>Reportes</IonLabel>
              </IonItem>
              <IonItem button detail={false} lines="none" onClick={cerrarSesion}>
                <IonIcon icon={logOutOutline} slot="start" color="danger" aria-hidden="true" />
                <IonLabel color="danger">Cerrar sesión</IonLabel>
              </IonItem>
            </IonMenuToggle>
            <TemaItem lines="none" />
          </IonList>
        </IonContent>
      </IonMenu>

      {/* Cada ruta lleva su Suspense; el menú no se desmonta al cambiar de vista. */}
      <IonRouterOutlet id="contenido-funcionario">
        <Routes>
          <Route path="/funcionario/solicitudes" element={perezosa(<SolicitudesPage />)} />
          <Route path="/funcionario/solicitud/:id" element={perezosa(<SolicitudDetailPage />)} />
          <Route path="/funcionario/reportes" element={perezosa(<ReportesPage />)} />
          <Route path="/funcionario/*" element={<Redireccion a="/funcionario/solicitudes" />} />
        </Routes>
      </IonRouterOutlet>
    </IonSplitPane>
  );
};

export default FuncionarioLayout;
