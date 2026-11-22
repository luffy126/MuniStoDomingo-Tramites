import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface RedireccionProps {
  a: string;
}

/** Si tras esto "Redirigiendo…" sigue en pantalla, la navegación de Ionic se perdió. */
export const ESPERA_RESPALDO_MS = 2500;

/**
 * Redirige de forma imperativa dentro de un IonRouterOutlet.
 * Se usa en lugar de <Navigate /> porque el outlet de Ionic necesita
 * renderizar siempre una página mientras se resuelve la navegación.
 *
 * Ionic deja montadas (ocultas) las páginas anteriores, y este efecto vuelve
 * a correr cuando cambia la ruta o React reconecta la vista. Por eso solo se
 * redirige mientras la URL real siga siendo la ruta donde se montó; si no,
 * una redirección vieja devolvería al usuario aunque ya esté en otra pestaña.
 *
 * Respaldo: si pasado ESPERA_RESPALDO_MS esta página sigue visible, se carga
 * el destino directamente. El usuario nunca queda atrapado en el spinner.
 */
const Redireccion: React.FC<RedireccionProps> = ({ a }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rutaOrigen = useRef(pathname);
  const marca = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.location.pathname !== rutaOrigen.current) return;
    navigate(a, { replace: true });
  }, [a, navigate, pathname]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const pagina = marca.current?.closest('.ion-page');
      const visible = pagina != null && !pagina.classList.contains('ion-page-hidden') && pagina.getClientRects().length > 0;
      if (visible) window.location.replace(a);
    }, ESPERA_RESPALDO_MS);
    return () => window.clearTimeout(temporizador);
  }, [a]);

  return (
    <LoadingSpinner mensaje="Redirigiendo…">
      <span ref={marca} hidden />
    </LoadingSpinner>
  );
};

export default Redireccion;
