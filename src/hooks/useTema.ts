import { useSyncExternalStore } from 'react';

export type Tema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'muni-tema';
const oyentes = new Set<() => void>();

/** Preferencia guardada; si no hay, se usa la del sistema. */
const leerTemaInicial = (): Tema => {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // Sin acceso a localStorage (modo privado): se sigue con el sistema.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
};

let temaActual: Tema = leerTemaInicial();

/** Ionic activa su paleta oscura con la clase ion-palette-dark en <html>. */
const aplicarTema = (tema: Tema): void => {
  document.documentElement.classList.toggle('ion-palette-dark', tema === 'oscuro');
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
