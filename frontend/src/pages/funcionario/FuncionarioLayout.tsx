import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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
import SolicitudesPage from './SolicitudesPage';
import SolicitudDetailPage from './SolicitudDetailPage';
import ReportesPage from './ReportesPage';
import { useAuth } from '../../context/AuthContext';

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
            <IonTitle>Gestión municipal</IonTitle>
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
                <IonIcon icon={documentsOutline} slot="start" color="primary" />
                <IonLabel>Solicitudes</IonLabel>
              </IonItem>
              <IonItem button routerLink="/funcionario/reportes" detail={false} lines="none">
                <IonIcon icon={barChartOutline} slot="start" color="primary" />
                <IonLabel>Reportes</IonLabel>
              </IonItem>
              <IonItem button detail={false} lines="none" onClick={cerrarSesion}>
                <IonIcon icon={logOutOutline} slot="start" color="danger" />
                <IonLabel color="danger">Cerrar sesión</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </IonList>
        </IonContent>
      </IonMenu>

      <IonRouterOutlet id="contenido-funcionario">
        <Routes>
          <Route path="/funcionario/solicitudes" element={<SolicitudesPage />} />
          <Route path="/funcionario/solicitud/:id" element={<SolicitudDetailPage />} />
          <Route path="/funcionario/reportes" element={<ReportesPage />} />
          <Route path="/funcionario/*" element={<Navigate to="/funcionario/solicitudes" replace />} />
        </Routes>
      </IonRouterOutlet>
    </IonSplitPane>
  );
};

export default FuncionarioLayout;
