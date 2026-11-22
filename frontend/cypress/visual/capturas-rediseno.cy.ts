// Capturas del rediseño "Comuna Parque" en modo claro y oscuro (solo para la copia personal).
// Es un script visual, no forma parte del suite E2E por defecto porque consume el
// límite de /api/auth. Uso:
// npx cypress run --spec cypress/visual/capturas-rediseno.cy.ts --config baseUrl=http://localhost:5173,screenshotsFolder=capturas/cypress

// --env tema=claro (u oscuro) captura un solo tema: el backend permite 10 peticiones
// a /api/auth cada 15 minutos por IP y los dos temas juntos pasan de ese límite.
const TEMAS: readonly string[] = Cypress.env('tema') ? [String(Cypress.env('tema'))] : ['claro', 'oscuro'];

const ingresar = (email: string): void => {
  cy.get('ion-input input').eq(0).type(email, { force: true });
  cy.get('ion-input input').eq(1).type('Test1234{enter}', { force: true });
};

const visitarConTema = (ruta: string, tema: string): void => {
  cy.visit(ruta, {
    onBeforeLoad(win) {
      win.localStorage.setItem('muni-tema', tema);
    },
  });
  cy.wait(1800);
};

describe('Capturas del rediseño', () => {
  TEMAS.forEach((tema) => {
    it(`vecino en modo ${tema}`, () => {
      cy.viewport(375, 812);
      cy.clearLocalStorage();
      visitarConTema('/login', tema);
      cy.screenshot(`${tema}/1-login`, { capture: 'viewport' });
      ingresar('vecino@test.com');
      cy.location('pathname', { timeout: 10000 }).should('eq', '/vecino/dashboard');

      const pantallas = [
        ['/vecino/dashboard', '2-catalogo'],
        ['/vecino/mis-tramites', '3-mis-tramites'],
        ['/vecino/notificaciones', '4-notificaciones'],
        ['/vecino/perfil', '5-perfil'],
      ];
      pantallas.forEach(([ruta, nombre]) => {
        visitarConTema(ruta, tema);
        cy.location('pathname').should('eq', ruta);
        cy.screenshot(`${tema}/${nombre}`, { capture: 'viewport' });
      });
    });

    it(`funcionario en modo ${tema}`, () => {
      cy.viewport(375, 812);
      cy.clearLocalStorage();
      visitarConTema('/login', tema);
      ingresar('funcionario@test.com');
      cy.location('pathname', { timeout: 10000 }).should('eq', '/funcionario/solicitudes');
      cy.wait(1500);
      cy.screenshot(`${tema}/6-funcionario-bandeja-movil`, { capture: 'viewport' });

      cy.viewport(1280, 800);
      cy.wait(1200);
      cy.screenshot(`${tema}/7-funcionario-bandeja-escritorio`, { capture: 'viewport' });
    });
  });
});
