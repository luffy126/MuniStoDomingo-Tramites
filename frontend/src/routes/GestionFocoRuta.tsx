import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Al cambiar de ruta, lleva el foco al h1 de la página activa.
 * En la primera carga no mueve el foco para no interrumpir al usuario.
 */
const GestionFocoRuta: React.FC = () => {
  const { pathname } = useLocation();
  const primeraRuta = useRef(true);

  useEffect(() => {
    if (primeraRuta.current) {
      primeraRuta.current = false;
      return;
    }

    const temporizador = window.setTimeout(() => {
      const paginaActiva = document.querySelector<HTMLElement>(
        'ion-page:not(.ion-page-hidden) [data-page-title], ion-router-outlet > :not(.ion-page-hidden) [data-page-title]',
      );
      if (paginaActiva === null) return;
      paginaActiva.setAttribute('tabindex', '-1');
      paginaActiva.focus({ preventScroll: true });
    }, 120);

    return () => window.clearTimeout(temporizador);
  }, [pathname]);

  return null;
};

export default GestionFocoRuta;
