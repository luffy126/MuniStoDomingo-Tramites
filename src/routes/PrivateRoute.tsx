import type { ReactElement } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Redireccion from './Redireccion';

interface PrivateRouteProps {
  children: ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner mensaje="Verificando sesión…" />;
  }

  if (!isAuthenticated) {
    return <Redireccion a="/login" />;
  }

  return children;
};

export default PrivateRoute;
