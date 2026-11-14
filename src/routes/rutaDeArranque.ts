import { rutaInicialPorRol } from '../services/authService';
import type { User } from '../services/authService';

/** Páginas reales de cada área. Cualquier otra ruta del área redirige a la principal. */
const PAGINAS_VECINO = [/^\/vecino\/dashboard$/, /^\/vecino\/mis-tramites$/, /^\/vecino\/notificaciones$/, /^\/vecino\/perfil$/, /^\/vecino\/tramite\/[^/]+$/];
const PAGINAS_FUNCIONARIO = [/^\/funcionario\/solicitudes$/, /^\/funcionario\/reportes$/, /^\/funcionario\/solicitud\/[^/]+$/];

/**
 * Decide, antes de montar el contenedor de Ionic, si la URL con que se abrió la
 * app es una página final o hay que redirigir.
 *
 * Redirigir después de montar el contenedor es frágil: si los componentes de
 * Ionic tardan en cargar (primera visita tras una actualización, red lenta), el
 * contenedor pierde la transición y la URL cambia pero en pantalla queda
 * "Redirigiendo…". Resolviéndolo aquí, la primera página que monta ya es la final.
 *
 * @returns la ruta a la que ir, o null si `pathname` ya es una página final.
 */
export const rutaDeArranque = (pathname: string, user: User | null): string | null => {
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const inicio = user === null ? '/login' : rutaInicialPorRol(user.rol);

  if (ruta === '/login' || ruta === '/register') return user === null ? null : inicio;

  const area = ruta.startsWith('/vecino') ? 'vecino' : ruta.startsWith('/funcionario') ? 'funcionario' : null;
  if (area === null || !/^\/(vecino|funcionario)(\/|$)/.test(ruta)) return inicio;
  if (user === null || user.rol !== area) return inicio;

  const paginas = area === 'vecino' ? PAGINAS_VECINO : PAGINAS_FUNCIONARIO;
  if (!paginas.some((p) => p.test(ruta))) return inicio;
  return ruta === pathname ? null : ruta;
};
