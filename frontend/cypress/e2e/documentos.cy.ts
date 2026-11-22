// Flujo de adjuntos del vecino: subida real, rechazo de extensiones falsas y
// retirada del archivo. Modifica datos: reiniciar la base al terminar.
const API = '/api';
const PDF = Cypress.Buffer.from('%PDF-1.4\n% documento de prueba\n');

const ingresar = (email: string, password: string): void => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('ion-button', 'Ingresar').click();
};

describe('Documentos del vecino', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.cerrarSesion();
  });

  it('sube un PDF real, rechaza un falso y permite quitar el adjunto', () => {
    let token = '';
    let folio = '';

    ingresar('vecino@test.com', 'Test1234');
    cy.location('pathname').should('eq', '/vecino/dashboard');

    cy.window().then((win) => {
      token = win.localStorage.getItem('munisd.token') ?? '';
      expect(token).not.to.eq('');
    });

    cy.then(() => cy.request({
      method: 'POST',
      url: `${API}/solicitudes`,
      headers: { Authorization: `Bearer ${token}` },
      body: { tramiteId: 'cert-residencia' },
    })).then(({ body }) => {
      folio = body.data.id as string;
      expect(folio).not.to.eq('');
    });

    cy.then(() => cy.visit(`/vecino/mis-tramites/${folio}`));
    // Ionic usa contenedores fijos: comprobamos presencia, no visibilidad CSS.
    cy.contains('Documentos adjuntos').should('exist');
    cy.contains('No hay documentos adjuntos.').should('exist');

    cy.intercept('POST', `**${API}/solicitudes/*/documentos`).as('subirDocumento');
    cy.get('input[type="file"]').selectFile({
      contents: PDF,
      fileName: 'contrato.pdf',
      mimeType: 'application/pdf',
    }, { force: true });
    cy.contains('Listo para subir').should('exist');
    cy.contains('ion-button', 'Subir 1 documento').click();
    cy.wait('@subirDocumento').its('response.statusCode').should('eq', 201);
    cy.get('h3.documento-nombre').should('contain', 'contrato.pdf');

    // Un archivo de texto renombrado a .pdf se detecta antes de enviarlo.
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('esto no es un pdf'),
      fileName: 'falso.pdf',
      mimeType: 'application/pdf',
    }, { force: true });
    cy.contains('El contenido no coincide').should('exist');
    cy.get('h3.documento-nombre').should('have.length', 1);

    cy.get('ion-button[aria-label="Quitar contrato.pdf"]').click();
    cy.contains('button', 'Sí, quitar').click();
    cy.contains('No hay documentos adjuntos.').should('exist');
  });
});
