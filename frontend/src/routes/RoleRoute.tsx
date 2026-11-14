import type { ReactElement } from 'react';
import { useAuth } from '../context/AuthContext';
import { rutaInicialPorRol } from '../services/authService';
import Redireccion from './Redireccion';
import type { Rol } from '../services/authService';

interface RoleRouteProps {
  rol: Rol;
  children: ReactElement;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ rol, children }) => {
  const { user } = useAuth();

  if (user === null) {
    return <Redireccion a="/login" />;
  }

  if (user.rol !== rol) {
    return <Redireccion a={rutaInicialPorRol(user.rol)} />;
  }

  return children;
};

export default RoleRoute;
