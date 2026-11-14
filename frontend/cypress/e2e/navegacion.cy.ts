const ingresar = (email: string, password: string): void => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('ion-button', 'Ingresar').click();
};

describe('Rutas y pantallas principales', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('redirige a login cuando no hay sesión', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  it('protege las rutas privadas', () => {
    cy.visit('/vecino/dashboard');
    cy.location('pathname').should('eq', '/login');
  });

  it('permite al vecino ver el catálogo y el detalle de un trámite', () => {
    ingresar('vecino@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/vecino/dashboard');
    cy.get('ion-tab-bar').should('exist');
    cy.contains('ion-card', 'Certificado de residencia').click();
    cy.location('pathname').should('include', '/vecino/tramite/');
    cy.contains('Requisitos').should('be.visible');
  });

  it('impide que el vecino entre a las rutas de funcionario', () => {
    ingresar('vecino@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/vecino/dashboard');
    cy.visit('/funcionario/solicitudes');
    cy.location('pathname').should('eq', '/vecino/dashboard');
  });

  it('muestra las solicitudes al funcionario', () => {
    ingresar('funcionario@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/funcionario/solicitudes');
    cy.get('ion-segment').should('exist');
    cy.get('ion-item').contains('Folio SOL-1001').click();
    cy.location('pathname').should('include', '/funcionario/solicitud/');
    cy.contains('Resolución').should('be.visible');
  });
});
