import { useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { rutaDeArranque } from './rutaDeArranque';
import { IonRouterOutlet } from '@ionic/react';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VecinoTabs from '../pages/vecino/VecinoTabs';
import FuncionarioLayout from '../pages/funcionario/FuncionarioLayout';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import Redireccion from './Redireccion';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
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

const AppRoutes: React.FC = () => (
  <ArranqueDeRutas>
  <IonRouterOutlet>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
