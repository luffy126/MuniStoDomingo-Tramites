const ingresar = (email: string, password: string): void => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('ion-button', 'Ingresar').click();
};

describe('Carga perezosa y estabilidad de la barra de pestañas', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.cerrarSesion();
  });

  it('no desmonta IonTabBar al abrir páginas lazy y sí baja su chunk al abrirlas', () => {
    ingresar('vecino@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/vecino/dashboard');

    cy.window().then((win) => {
      const recursos = (): string[] =>
        win.performance.getEntriesByType('resource').map((entry) => entry.name);

      expect(recursos().some((nombre) => nombre.includes('PerfilPage'))).to.eq(
        false,
        'PerfilPage no debe descargarse al entrar al dashboard',
      );

      const barraOriginal = win.document.querySelector('ion-tab-bar');
      expect(barraOriginal).not.to.eq(null);

      cy.contains('ion-tab-button', 'Perfil').click();
      cy.contains('Mi perfil').should('be.visible');

      cy.window().then((win2) => {
        expect(
          win2.performance
            .getEntriesByType('resource')
            .some((entry) => entry.name.includes('PerfilPage')),
        ).to.eq(true, 'el chunk de PerfilPage se pide solo al abrir la pestaña');
      });

      cy.get('ion-tab-bar').should(($barra) => {
        expect($barra[0]).to.eq(barraOriginal, 'la barra no se desmonta ni se remonta');
      });

      cy.contains('ion-tab-button', 'Mis trámites').click();
      cy.get('ion-tab-bar').should(($barra) => expect($barra[0]).to.eq(barraOriginal));

      cy.contains('ion-tab-button', 'Notificaciones').click();
      cy.get('ion-tab-bar').should(($barra) => expect($barra[0]).to.eq(barraOriginal));

      cy.contains('ion-tab-button', 'Trámites').click();
      cy.contains('Catálogo de trámites').should('be.visible');
      cy.get('ion-tab-bar').should(($barra) => expect($barra[0]).to.eq(barraOriginal));
    });
  });
});
