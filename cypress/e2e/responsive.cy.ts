// Comprueba que las pantallas principales no generen scroll horizontal en
// móvil (360 px) y tablet (768 px). No captura imágenes: mide el layout real.
const ingresar = (email: string, password: string): void => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('ion-button', 'Ingresar').click();
};

const sinDesborde = (): void => {
  cy.document().then((doc) => {
    const raiz = doc.documentElement;
    expect(raiz.scrollWidth, 'scrollWidth').to.be.at.most(raiz.clientWidth + 1);
  });
};

const rutasVecino = [
  ['/vecino/dashboard', 'Catálogo de trámites'],
  ['/vecino/tramite/cert-residencia', 'Certificado de residencia'],
  ['/vecino/mis-tramites', 'Mis trámites'],
  ['/vecino/mis-tramites/SOL-1002', 'Solicitud SOL-1002'],
  ['/vecino/notificaciones', 'Notificaciones'],
  ['/vecino/perfil', 'Mi perfil'],
] as const;

describe('Diseño responsive', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.cerrarSesion();
  });

  it('el vecino no desborda en móvil ni tablet', () => {
    for (const [ancho, alto] of [[360, 800], [768, 900]] as const) {
      cy.viewport(ancho, alto);
      ingresar('vecino@test.com', 'Test1234');
      cy.location('pathname').should('eq', '/vecino/dashboard');
      cy.get('ion-tab-bar').should('be.visible');

      rutasVecino.forEach(([ruta, titulo]) => {
        cy.visit(ruta);
        cy.location('pathname').should('eq', ruta);
        cy.get('ion-title').contains(titulo).should('be.visible');
        sinDesborde();
      });

      cy.cerrarSesion();
    }
  });

  it('el funcionario no desborda en móvil ni tablet', () => {
    for (const [ancho, alto] of [[360, 800], [768, 900]] as const) {
      cy.viewport(ancho, alto);
      ingresar('funcionario@test.com', 'Test1234');
      cy.location('pathname').should('eq', '/funcionario/solicitudes');
      cy.get('ion-menu-button').should('be.visible');

      for (const [ruta, titulo] of [
        ['/funcionario/solicitudes', 'Solicitudes'],
        ['/funcionario/solicitud/SOL-1001', 'Folio SOL-1001'],
        ['/funcionario/reportes', 'Reportes'],
      ] as const) {
        cy.visit(ruta);
        cy.location('pathname').should('eq', ruta);
        cy.get('ion-title').contains(titulo).should('be.visible');
        sinDesborde();
      }

      cy.cerrarSesion();
    }
  });
});
