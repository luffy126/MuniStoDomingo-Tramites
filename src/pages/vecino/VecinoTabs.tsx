import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { IonBadge, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react';
import { documentsOutline, gridOutline, notificationsOutline, personCircleOutline } from 'ionicons/icons';
const DashboardPage = lazy(() => import('./DashboardPage'));
const TramiteDetailPage = lazy(() => import('./TramiteDetailPage'));
const MisTramitesPage = lazy(() => import('./MisTramitesPage'));
const MiSolicitudDetailPage = lazy(() => import('./MiSolicitudDetailPage'));
const NotificacionesPage = lazy(() => import('./NotificacionesPage'));
const PerfilPage = lazy(() => import('./PerfilPage'));
import Redireccion from '../../routes/Redireccion';
import { NotificacionesProvider } from '../../context/NotificacionesContext';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { getTramites } from '../../services/tramiteService';

/** Cada página perezosa tiene su propio límite; IonTabs y la barra no se tocan. */
const perezosa = (pagina: React.ReactNode): React.ReactElement => (
  <Suspense fallback={null}>{pagina}</Suspense>
);

const TabBarVecino: React.FC = () => {
  const { sinLeer } = useNotificaciones();

  return (
    <IonTabBar slot="bottom">
      <IonTabButton tab="dashboard" href="/vecino/dashboard">
        <IonIcon icon={gridOutline} aria-hidden="true" />
        <IonLabel>Trámites</IonLabel>
      </IonTabButton>
      <IonTabButton tab="mis-tramites" href="/vecino/mis-tramites">
        <IonIcon icon={documentsOutline} aria-hidden="true" />
        <IonLabel>Mis trámites</IonLabel>
      </IonTabButton>
      <IonTabButton tab="notificaciones" href="/vecino/notificaciones">
        <IonIcon icon={notificationsOutline} aria-hidden="true" />
        <IonLabel>Notificaciones</IonLabel>
        {sinLeer > 0 ? (
          <IonBadge color="danger" className="tab-badge" aria-label={`${sinLeer} sin leer`}>
            {sinLeer > 99 ? '99+' : sinLeer}
          </IonBadge>
        ) : null}
      </IonTabButton>
      <IonTabButton tab="perfil" href="/vecino/perfil">
        <IonIcon icon={personCircleOutline} aria-hidden="true" />
        <IonLabel>Perfil</IonLabel>
      </IonTabButton>
    </IonTabBar>
  );
};

const VecinoTabs: React.FC = () => {
  // Catálogo público: se calienta en cuanto entra la sesión, antes de que el
  // chunk del dashboard termine de descargarse. getTramites deduplica la petición.
  useEffect(() => {
    void getTramites().catch(() => {});
  }, []);

  return (
    <NotificacionesProvider>
      <IonTabs>
        {/* El outlet sigue siendo hijo directo de IonTabs; cada ruta lleva su
            Suspense para que la barra inferior nunca se desmonte. */}
        <IonRouterOutlet>
          <Routes>
            <Route path="/vecino/dashboard" element={perezosa(<DashboardPage />)} />
            <Route path="/vecino/tramite/:id" element={perezosa(<TramiteDetailPage />)} />
            <Route path="/vecino/mis-tramites" element={perezosa(<MisTramitesPage />)} />
            <Route path="/vecino/mis-tramites/:folio" element={perezosa(<MiSolicitudDetailPage />)} />
            <Route path="/vecino/notificaciones" element={perezosa(<NotificacionesPage />)} />
            <Route path="/vecino/perfil" element={perezosa(<PerfilPage />)} />
            <Route path="/vecino/*" element={<Redireccion a="/vecino/dashboard" />} />
          </Routes>
        </IonRouterOutlet>

        <TabBarVecino />
      </IonTabs>
    </NotificacionesProvider>
  );
};

export default VecinoTabs;
