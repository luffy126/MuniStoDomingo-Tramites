import { Navigate, Route, Routes } from 'react-router-dom';
import { IonRouterOutlet } from '@ionic/react';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VecinoTabs from '../pages/vecino/VecinoTabs';
import FuncionarioLayout from '../pages/funcionario/FuncionarioLayout';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { rutaInicialPorRol } from '../services/authService';

const InicioRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner mensaje="Cargando aplicación…" />;
  }

  return <Navigate to={user === null ? '/login' : rutaInicialPorRol(user.rol)} replace />;
};

const AppRoutes: React.FC = () => (
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </IonRouterOutlet>
);

export default AppRoutes;
