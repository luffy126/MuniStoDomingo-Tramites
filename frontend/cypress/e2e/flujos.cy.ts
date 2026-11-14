// Flujos de punta a punta contra el backend real (http://localhost:3000) con la base en su semilla.
// Modifican datos: al terminar hay que reiniciar la base (ver "Pruebas" en el README).
const API = 'http://localhost:3000';

const ingresar = (email: string, password: string): void => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('ion-button', 'Ingresar').click();
};

describe('Flujos con datos reales', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('el vecino ve sus datos al navegar por las pestañas', () => {
    cy.intercept('GET', '**/api/solicitudes').as('sol');
    ingresar('vecino@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/vecino/dashboard');

    cy.get('ion-tab-button[tab="mis-tramites"]').click();
    cy.wait('@sol');
    cy.contains('Folio SOL-1002');
    // Se espera un poco más para detectar una segunda petición tardía antes de contar.
    cy.wait(1000);
    cy.get('@sol.all').should('have.length', 1);

    cy.get('ion-tab-button[tab="notificaciones"]').click();
    cy.contains('Horario de atención');

    // Volver a la pestaña vuelve a pedir los datos (una sola vez por entrada).
    cy.get('ion-tab-button[tab="mis-tramites"]').click();
    cy.wait('@sol');
    cy.wait(1000);
    cy.get('@sol.all').should('have.length', 2);
  });

  it('el vecino crea y cancela una solicitud', () => {
    const observacion = `Cypress ${Date.now()}`;
    ingresar('vecino@test.com', 'Test1234');
    cy.contains('ion-card', 'Certificado de residencia').click();
    cy.get('ion-textarea textarea').type(observacion);
    cy.contains('ion-button', 'Enviar solicitud').click();

    cy.location('pathname', { timeout: 8000 }).should('eq', '/vecino/mis-tramites');
    cy.contains('ion-item', observacion).within(() => {
      cy.contains('ion-button', 'Cancelar solicitud').click();
    });
    cy.get('ion-alert').contains('button', 'Sí, cancelar').click();
    cy.contains(observacion).should('not.exist');
  });

  it('el vecino edita su perfil', () => {
    cy.request('POST', `${API}/api/auth/register`, {
      nombre: 'Cypress Perfil',
      email: `cy.${Date.now()}@example.test`,
      password: 'Test1234',
    }).then(({ body }) => {
      cy.visit('/vecino/perfil', {
        onBeforeLoad: (win) => {
          win.localStorage.setItem('munisd.token', body.data.token);
          win.localStorage.setItem('munisd.sesion', JSON.stringify({ ...body.data.user, id: String(body.data.user.id) }));
        },
      });
    });

    cy.get('input[autocomplete="name"]').clear().type('Cypress Editado');
    cy.contains('ion-button', 'Guardar cambios').click();
    // El texto del toast de Ionic está dentro de su shadow DOM.
    cy.contains('Perfil actualizado.', { includeShadowDom: true });

    cy.reload();
    cy.contains('Cypress Editado');
  });

  it('el funcionario aprueba y el vecino recibe la notificación (RF-05)', () => {
    cy.request('POST', `${API}/api/auth/login`, { email: 'vecino@test.com', password: 'Test1234' }).then(({ body }) => {
      cy.request({
        method: 'POST',
        url: `${API}/api/solicitudes`,
        headers: { Authorization: `Bearer ${body.data.token}` },
        body: { tramiteId: 'reclamo-alumbrado' },
      }).then((creada) => {
        const folio: string = creada.body.data.id;

        ingresar('funcionario@test.com', 'Test1234');
        cy.location('pathname').should('eq', '/funcionario/solicitudes');
        cy.visit(`/funcionario/solicitud/${folio}`);
        cy.contains('ion-button', 'Aprobar').click();
        cy.location('pathname', { timeout: 8000 }).should('eq', '/funcionario/solicitudes');

        // Una solicitud resuelta ya no admite cambios.
        cy.visit(`/funcionario/solicitud/${folio}`);
        cy.contains('ion-button', 'Aprobar').should('have.class', 'button-disabled');
        cy.contains('ya fue resuelta');

        cy.clearLocalStorage();
        ingresar('vecino@test.com', 'Test1234');
        cy.get('ion-tab-button[tab="notificaciones"]').click();
        cy.contains(`Tu solicitud ${folio}`);
      });
    });
  });
});
