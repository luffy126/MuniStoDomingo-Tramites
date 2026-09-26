import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface RedireccionProps {
  a: string;
}

/**
 * Redirige de forma imperativa dentro de un IonRouterOutlet.
 * Se usa en lugar de <Navigate /> porque el outlet de Ionic necesita
 * renderizar siempre una página mientras se resuelve la navegación.
 */
const Redireccion: React.FC<RedireccionProps> = ({ a }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(a, { replace: true });
  }, [a, navigate]);

  return <LoadingSpinner mensaje="Redirigiendo…" />;
};

export default Redireccion;
