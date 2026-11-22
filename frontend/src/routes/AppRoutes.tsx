import { lazy, Suspense, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { rutaDeArranque } from './rutaDeArranque';
import { IonRouterOutlet } from '@ionic/react';
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const RecuperarPasswordPage = lazy(() => import('../pages/auth/RecuperarPasswordPage'));
const TerminosPage = lazy(() => import('../pages/public/TerminosPage'));
/* Los layouts son el cascarón de la sesión: se importan directo para que un
   Suspense nunca desmonte IonTabs/IonSplitPane mientras carga una página hija. */
import VecinoTabs from '../pages/vecino/VecinoTabs';
import FuncionarioLayout from '../pages/funcionario/FuncionarioLayout';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import Redireccion from './Redireccion';
import GestionFocoRuta from './GestionFocoRuta';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { rutaInicialPorRol } from '../services/authService';

const InicioRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner mensaje="Cargando aplicación…" />;
  }

  return <Redireccion a={user === null ? '/login' : rutaInicialPorRol(user.rol)} />;
};

/**
 * Al abrir la app, espera la sesión y lleva a la página final con un <Navigate>
 * común ANTES de montar el IonRouterOutlet (ver rutaDeArranque). Una vez montado
 * el outlet, las redirecciones siguientes las maneja él.
 */
const ArranqueDeRutas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const outletMontado = useRef(false);

  if (!outletMontado.current) {
    if (isLoading) return <LoadingSpinner mensaje="Cargando aplicación…" />;
    const destino = rutaDeArranque(pathname, user);
    if (destino !== null) return <Navigate to={destino} replace />;
    outletMontado.current = true;
  }
  return <>{children}</>;
};

/** Suspense por página: nunca envuelve a IonRouterOutlet ni a los layouts. */
const perezosa = (pagina: React.ReactNode): React.ReactElement => (
  // Un fallback con IonPage confunde al outlet de Ionic y deja la página invisible.
  <Suspense fallback={null}>{pagina}</Suspense>
);

const AppRoutes: React.FC = () => (
  <ArranqueDeRutas>
    <GestionFocoRuta />
    <IonRouterOutlet>
      <Routes>
        <Route path="/login" element={perezosa(<LoginPage />)} />
        <Route path="/register" element={perezosa(<RegisterPage />)} />
        <Route path="/recuperar-password" element={perezosa(<RecuperarPasswordPage />)} />
        <Route path="/terminos" element={perezosa(<TerminosPage />)} />
        <Route
          path="/vecino/*"
          element={
            <PrivateRoute>
              <RoleRoute rol="vecino">
                <VecinoTabs />
              </RoleRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/funcionario/*"
          element={
            <PrivateRoute>
              <RoleRoute rol="funcionario">
                <FuncionarioLayout />
              </RoleRoute>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<InicioRedirect />} />
        <Route path="*" element={<Redireccion a="/" />} />
      </Routes>
    </IonRouterOutlet>
  </ArranqueDeRutas>
);

export default AppRoutes;
