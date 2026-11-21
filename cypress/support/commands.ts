/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Limpia la sesión de la app, incluido el respaldo en IndexedDB.
       * `cy.clearLocalStorage()` no alcanza ese respaldo y la siguiente prueba
       * entraría autenticada. Se usa el storageService real de la app (Vite dev).
       */
      cerrarSesion(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('cerrarSesion', () => {
  cy.window({ log: false }).then(async (win) => {
    win.localStorage.clear();
    try {
      const modulo = await win.eval("import('/src/services/storageService.ts')");
      await modulo.default.remove('munisd.token');
      await modulo.default.remove('munisd.sesion');
    } catch {
      // Si la página no es el dev server de Vite, al menos queda localStorage limpio.
    }
  });
});

export {};
