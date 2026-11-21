// Flujos de punta a punta contra el backend a través del proxy same-origin de Vite.
// Modifican datos: al terminar hay que reiniciar la base (ver "Pruebas" en el README).
const API = '/api';

const ingresar = (email: string, password: string): void => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('ion-button', 'Ingresar').click();
};

describe('Flujos con datos reales', () => {
  beforeEach(() => {
    // La app respalda la sesión en IndexedDB; hay que limpiarla de verdad para
    // que cada prueba empiece sin usuario y no reutilice el token anterior.
    cy.visit('/login');
    cy.cerrarSesion();
  });

  it('el vecino ve sus datos al navegar por las pestañas', () => {
    cy.intercept('GET', '**/api/solicitudes*').as('sol');
    ingresar('vecino@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/vecino/dashboard');

    cy.get('ion-tab-button[tab="mis-tramites"]').click();
    cy.location('pathname').should('eq', '/vecino/mis-tramites');
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

  it('el vecino crea una solicitud y ve el folio antes de salir', () => {
    const observacion = `Cypress ${Date.now()}`;
    ingresar('vecino@test.com', 'Test1234');
    cy.contains('ion-card', 'Certificado de residencia').click();
    cy.get('ion-textarea textarea').type(observacion);
    cy.contains('ion-button', 'Enviar solicitud').click();

    // V2-01: la confirmación permanece en pantalla; no hay redirección automática.
    cy.contains('Solicitud enviada');
    cy.contains('Folio SOL-').should('be.visible');
    cy.contains('ion-button', 'Ver mis trámites').click();
    cy.location('pathname').should('eq', '/vecino/mis-tramites');
    cy.contains('ion-item', observacion).click();
    cy.location('pathname').should('include', '/vecino/mis-tramites/');
    cy.contains('ion-button', 'Cancelar solicitud').click();
    cy.get('ion-alert').contains('button', 'Sí, cancelar').click();
    cy.visit('/vecino/mis-tramites');
    cy.contains(observacion).should('not.exist');
  });

  it('el vecino edita su perfil', () => {
    cy.request('POST', `${API}/auth/register`, {
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

  it('el funcionario confirma la aprobación y no redirige automáticamente', () => {
    cy.request('POST', `${API}/auth/login`, { email: 'vecino@test.com', password: 'Test1234' }).then(({ body }) => {
      cy.request({
        method: 'POST',
        url: `${API}/solicitudes`,
        headers: { Authorization: `Bearer ${body.data.token}` },
        body: { tramiteId: 'reclamo-alumbrado' },
      }).then((creada) => {
        const folio: string = creada.body.data.id;

        ingresar('funcionario@test.com', 'Test1234');
        cy.location('pathname').should('eq', '/funcionario/solicitudes');
        cy.visit(`/funcionario/solicitud/${folio}`);
        cy.contains('ion-button', 'Aprobar').click();
        // M3-01: la consecuencia se explica antes de confirmar.
        cy.get('ion-alert').contains('La acción es final y no se puede deshacer');
        cy.get('ion-alert').contains('button', 'Sí, continuar').click();

        cy.contains('Resolución registrada');
        cy.location('pathname', { timeout: 8000 }).should('eq', `/funcionario/solicitud/${folio}`);

        // Una solicitud resuelta ya no admite cambios.
        cy.reload();
        cy.contains('ion-button', 'Aprobar').should('not.exist');
        cy.contains('Aprobado');

        cy.cerrarSesion();
        ingresar('vecino@test.com', 'Test1234');
        cy.get('ion-tab-button[tab="notificaciones"]').click();
        cy.contains(`Tu solicitud ${folio}`);
      });
    });
  });
});
