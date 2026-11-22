import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import AvisoOffline from './components/common/AvisoOffline';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Utilidades CSS que usa la app. float/flex/display/text-transformation no se
   referencian en src y se omiten para no pagar su peso en cada carga. */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';

/* Modo oscuro por clase: lo activa useTema (preferencia guardada; defecto claro) */
import '@ionic/react/css/palettes/dark.class.css';
import './hooks/useTema';

/* Fuentes locales (sin dependencia de red de terceros) */
import './theme/fonts.css';

/* Theme variables */
import './theme/variables.css';
import './theme/global.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AvisoOffline />
    <AuthProvider>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
