import { Navigate, Route, Routes } from 'react-router-dom';
import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react';
import { documentsOutline, gridOutline, notificationsOutline, personCircleOutline } from 'ionicons/icons';
import DashboardPage from './DashboardPage';
import TramiteDetailPage from './TramiteDetailPage';
import MisTramitesPage from './MisTramitesPage';
import NotificacionesPage from './NotificacionesPage';
import PerfilPage from './PerfilPage';

const VecinoTabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Routes>
        <Route path="/vecino/dashboard" element={<DashboardPage />} />
        <Route path="/vecino/tramite/:id" element={<TramiteDetailPage />} />
        <Route path="/vecino/mis-tramites" element={<MisTramitesPage />} />
        <Route path="/vecino/notificaciones" element={<NotificacionesPage />} />
        <Route path="/vecino/perfil" element={<PerfilPage />} />
        <Route path="/vecino/*" element={<Navigate to="/vecino/dashboard" replace />} />
      </Routes>
    </IonRouterOutlet>

    <IonTabBar slot="bottom">
      <IonTabButton tab="dashboard" href="/vecino/dashboard">
        <IonIcon icon={gridOutline} />
        <IonLabel>Trámites</IonLabel>
      </IonTabButton>
      <IonTabButton tab="mis-tramites" href="/vecino/mis-tramites">
        <IonIcon icon={documentsOutline} />
        <IonLabel>Mis Trámites</IonLabel>
      </IonTabButton>
      <IonTabButton tab="notificaciones" href="/vecino/notificaciones">
        <IonIcon icon={notificationsOutline} />
        <IonLabel>Notificaciones</IonLabel>
      </IonTabButton>
      <IonTabButton tab="perfil" href="/vecino/perfil">
        <IonIcon icon={personCircleOutline} />
        <IonLabel>Perfil</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

export default VecinoTabs;
