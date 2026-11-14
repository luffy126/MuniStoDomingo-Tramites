// Pruebas unitarias sin base de datos ni red: paginación y armado del correo.
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Antes de cargar dist/: sin clave, el servicio de email queda en dry run silencioso.
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = '';
process.env.EMAIL_REDIRECT_TO = '';

const { parsePagination, buildPaginationMeta, limitOffset } = require('../dist/utils/pagination');
const emailService = require('../dist/services/emailService');

test('parsePagination', async (t) => {
  await t.test('usa los valores por defecto cuando no viene nada', () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 20, offset: 0 });
  });

  await t.test('calcula el offset de la página pedida', () => {
    assert.deepEqual(parsePagination({ page: '3', limit: '10' }), { page: 3, limit: 10, offset: 20 });
  });

  await t.test('reemplaza lo inválido por el valor por defecto', () => {
    for (const valor of ['abc', '-1', '0', '1.5', '1e3', '0x10', ' 5', '', ['1', '2'], { a: 1 }, 7, null]) {
      assert.deepEqual(parsePagination({ page: valor, limit: valor }), { page: 1, limit: 20, offset: 0 });
    }
  });

  await t.test('recorta el límite y la página a sus máximos', () => {
    assert.equal(parsePagination({ limit: '101' }).limit, 100);
    assert.equal(parsePagination({ limit: '999999999' }).limit, 100);
    const lejos = parsePagination({ page: '999999999', limit: '100' });
    assert.equal(lejos.page, 100000);
    assert.ok(Number.isSafeInteger(lejos.offset));
  });

  await t.test('respeta el límite por defecto y el máximo que se le pasen', () => {
    assert.equal(parsePagination({}, 50).limit, 50);
    assert.equal(parsePagination({ limit: '80' }, 20, 30).limit, 30);
  });

  await t.test('limitOffset entrega texto para los marcadores de LIMIT y OFFSET', () => {
    assert.deepEqual(limitOffset({ page: 2, limit: 10, offset: 10 }), ['10', '10']);
  });
});

test('buildPaginationMeta', async (t) => {
  await t.test('primera, intermedia y última página', () => {
    assert.deepEqual(buildPaginationMeta(1, 20, 47), {
      page: 1, limit: 20, total: 47, totalPages: 3, hasNext: true, hasPrev: false,
    });
    assert.deepEqual(buildPaginationMeta(2, 20, 47), {
      page: 2, limit: 20, total: 47, totalPages: 3, hasNext: true, hasPrev: true,
    });
    assert.equal(buildPaginationMeta(3, 20, 47).hasNext, false);
  });

  await t.test('sin resultados hay una sola página vacía', () => {
    assert.deepEqual(buildPaginationMeta(1, 20, 0), {
      page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false,
    });
  });

  await t.test('un total múltiplo exacto del límite no agrega una página de más', () => {
    assert.equal(buildPaginationMeta(1, 20, 40).totalPages, 2);
  });
});

test('Correo de cambio de estado', async (t) => {
  const base = {
    destinatario: 'vecino@correo.cl',
    nombreVecino: 'Ana Pérez',
    folio: 'SOL-1001',
    nombreTramite: 'Certificado de residencia',
    estado: 'aprobado',
  };

  await t.test('asunto, destinatario y etiqueta de cada estado', () => {
    const etiquetas = { en_revision: 'En revisión', aprobado: 'Aprobada', rechazado: 'Rechazada' };
    for (const [estado, etiqueta] of Object.entries(etiquetas)) {
      const email = emailService.construirEmailEstado({ ...base, estado });
      assert.equal(email.to, 'vecino@correo.cl');
      assert.equal(email.subject, `Solicitud SOL-1001: ${etiqueta}`);
      assert.ok(email.html.includes(`>${etiqueta}</span>`));
      assert.ok(email.text.includes(`cambió de estado: ${etiqueta}.`));
    }
  });

  await t.test('sin observaciones no aparece el bloque', () => {
    const email = emailService.construirEmailEstado(base);
    assert.ok(!email.html.includes('Observaciones'));
    assert.ok(!email.text.includes('Observaciones'));
  });

  await t.test('los datos de la base se escapan: no se puede inyectar HTML en el correo', () => {
    const email = emailService.construirEmailEstado({
      ...base,
      nombreVecino: '<img src=x onerror=alert(1)>',
      nombreTramite: 'Permiso "especial" <b>',
      observaciones: '<script>alert(1)</script> & <a href="http://malo">clic</a>',
    });
    assert.ok(!/<script|<img|<a |<b>/i.test(email.html));
    assert.ok(email.html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;a href=&quot;http://malo&quot;&gt;'));
    assert.ok(email.html.includes('Permiso &quot;especial&quot; &lt;b&gt;'));
  });

  await t.test('el asunto nunca lleva saltos de línea', () => {
    const email = emailService.construirEmailEstado({ ...base, folio: 'SOL-1\r\nBcc: otro@correo.cl' });
    assert.ok(!/[\r\n]/.test(email.subject));
  });

  await t.test('sendEmail no lanza si el transporte falla: devuelve false', async () => {
    emailService.setEmailSender(async () => { throw new Error('sin red'); });
    const original = console.error;
    console.error = () => undefined;
    try {
      assert.equal(await emailService.sendEmail(emailService.construirEmailEstado(base)), false);
    } finally {
      console.error = original;
      emailService.setEmailSender();
    }
  });

  await t.test('sin RESEND_API_KEY trabaja en dry run y responde true sin enviar', async () => {
    assert.equal(await emailService.enviarNotificacionEstado(base), true);
  });
});
