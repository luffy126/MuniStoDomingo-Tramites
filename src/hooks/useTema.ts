import { useSyncExternalStore } from 'react';

export type Tema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'muni-tema';
const oyentes = new Set<() => void>();

/**
 * Preferencia guardada; por defecto modo claro.
 *
 * El tema no se deduce del sistema: el usuario lo cambia a mano desde el botón
 * del header o el interruptor de Perfil/menú. Así el portal siempre abre con la
 * misma apariencia institucional sin importar la configuración del dispositivo.
 */
const leerTemaInicial = (): Tema => {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // Sin acceso a localStorage (modo privado): se abre en claro.
  }
  return 'claro';
};

let temaActual: Tema = leerTemaInicial();

/**
 * Ionic activa su paleta oscura con la clase `ion-palette-dark` en `<html>`.
 *
 * `shell-oscuro` es la misma señal para el shell inline de `index.html` (fondo
 * de `body` y de la tarjeta de carga), de modo que el primer paint ya coincide
 * con la elección guardada y no hay destello claro en modo oscuro.
 */
const aplicarTema = (tema: Tema): void => {
  const oscuro = tema === 'oscuro';
  document.documentElement.classList.toggle('ion-palette-dark', oscuro);
  document.documentElement.classList.toggle('shell-oscuro', oscuro);

  const metaColor = document.querySelector('meta[name="color-scheme"]');
  if (metaColor !== null) metaColor.setAttribute('content', oscuro ? 'dark' : 'light');
};

aplicarTema(temaActual);

export const cambiarTema = (tema: Tema): void => {
  temaActual = tema;
  aplicarTema(tema);
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // La preferencia solo dura esta sesión.
  }
  oyentes.forEach((oyente) => oyente());
};

const suscribir = (oyente: () => void): (() => void) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

export const useTema = (): Tema => useSyncExternalStore(suscribir, () => temaActual);
