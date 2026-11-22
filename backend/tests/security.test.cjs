// Pruebas HTTP de las defensas de seguridad sin depender de MariaDB.
// Solo se sustituye la persistencia: Express, Helmet, validadores y limiters son reales.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '24h';
process.env.NODE_ENV = 'test';
// El .env de desarrollo puede traer TRUST_PROXY; aquí se prueba el servidor SIN proxy de confianza.
process.env.TRUST_PROXY = '';
process.env.RESEND_API_KEY = '';
// El .env local puede subir el límite para el suite E2E; esta prueba verifica el valor seguro.
process.env.AUTH_RATE_LIMIT_MAX = '10';
process.env.GENERAL_RATE_LIMIT_MAX = '100';

const writes = [];
function stubService(name, exports) {
  const filename = require.resolve(`../dist/services/${name}`);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stubService('userService', {
  async findByEmail() { return null; },
  // authMiddleware confirma que el usuario exista y que su versión de sesión coincida.
  async findById(id) { return { id, nombre: 'Seguridad', email: 'seguridad@test.com', rol: 'vecino', token_version: 0 }; },
  async createUser(nombre, email, _passwordHash, rol) {
    writes.push({ nombre, email });
    return { id: 1, nombre, email, rol };
  },
  async updateUser(id, nombre, email) {
    writes.push({ nombre, email });
    return { id, nombre, email, rol: 'vecino' };
  },
});
stubService('tramiteService', {
  async getById(id) { return { id, activo: true }; },
});
stubService('solicitudService', {
  async contarAbiertas() { return 0; },
  maxSolicitudesAbiertas() { return 20; },
  async create(tramiteId, vecinoId, observaciones) {
    writes.push({ observaciones });
    return { id: 'SOL-1001', tramiteId, vecinoId, observaciones, estado: 'pendiente' };
  },
  async updateEstado(id, estado, funcionarioId, observaciones) {
    writes.push({ observaciones });
    return { tipo: 'actualizada', solicitud: { id, estado, funcionarioId, observaciones } };
  },
  // El controlador relee el detalle después del PATCH para incluir el historial.
  async getById(id) {
    const ultimo = writes[writes.length - 1] ?? {};
    return {
      id,
      estado: 'en_revision',
      ...(ultimo.observaciones !== undefined ? { observaciones: ultimo.observaciones } : {}),
    };
  },
});

const jwt = require('jsonwebtoken');
const app = require('../dist/app').default;
const { authLimiter, generalLimiter, loginLimiter, recuperacionLimiter, subidaLimiter } = require('../dist/middleware/rateLimiter');

test('Seguridad avanzada a través de HTTP', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const tokenFor = (rol) => jwt.sign(
    { id: 1, email: 'seguridad@test.com', rol }, process.env.JWT_SECRET, { expiresIn: '1h' }
  );
  const vecino = tokenFor('vecino');
  const funcionario = tokenFor('funcionario');
  const registro = { nombre: 'José Pérez', email: 'seguridad@test.com', password: 'Test1234' };

  t.beforeEach(() => {
    authLimiter.resetKey('127.0.0.1');
    generalLimiter.resetKey('127.0.0.1');
    for (const l of [loginLimiter, recuperacionLimiter, subidaLimiter]) l.resetKey('127.0.0.1');
    writes.length = 0;
  });

  async function request(method, path, { token, body, headers } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }

  await t.test('Helmet aplica headers también a errores y a health', async () => {
    for (const path of ['/api/health', '/api/no-existe', '/api/solicitudes']) {
      const result = await request('GET', path);
      assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(result.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(result.headers.get('x-xss-protection'), '0');
      assert.equal(result.headers.get('x-powered-by'), null);
      assert.match(result.headers.get('strict-transport-security'), /max-age=\d+; includeSubDomains/);
      assert.match(result.headers.get('content-security-policy'), /default-src 'self'/);
    }
  });

  await t.test('Login admite diez intentos fallidos y bloquea el siguiente; el registro tiene su propio cupo', async () => {
    for (let i = 0; i < 10; i++) {
      const result = await request('POST', '/api/auth/login', { body: {} });
      assert.equal(result.status, 400, `intento ${i + 1}`);
    }
    // Los contadores son independientes: el registro aún no está bloqueado.
    assert.equal((await request('POST', '/api/auth/register', { body: {} })).status, 400);
    const blocked = await request('POST', '/api/auth/login', { body: {} });
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false, error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
    });
    assert.match(blocked.headers.get('ratelimit'), /limit=10, remaining=0/);
    assert.match(blocked.headers.get('ratelimit-policy'), /10;w=900/);
    assert.equal(blocked.headers.get('x-ratelimit-limit'), null);
    const retryAfter = Number(blocked.headers.get('retry-after'));
    assert.ok(retryAfter > 0 && retryAfter <= 900);
    assert.equal(blocked.headers.get('x-content-type-options'), 'nosniff');
    // Las peticiones de auth no consumen la cuota completa de la API general.
    assert.equal((await request('GET', '/api/health')).status, 200);
  });

  await t.test('La API permite cien peticiones y bloquea la 101, sin aceptar una IP falsificada', async () => {
    for (let i = 0; i < 100; i++) {
      assert.equal((await request('GET', '/api/health')).status, 200, `petición ${i + 1}`);
    }
    const blocked = await request('GET', '/api/health');
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, {
      success: false, error: 'Demasiadas peticiones. Intenta de nuevo en un momento.',
    });
    assert.match(blocked.headers.get('ratelimit'), /limit=100, remaining=0/);
    assert.match(blocked.headers.get('ratelimit-policy'), /100;w=60/);
    assert.equal(blocked.headers.get('x-ratelimit-limit'), null);
    const retryAfter = Number(blocked.headers.get('retry-after'));
    assert.ok(retryAfter > 0 && retryAfter <= 60);
    assert.equal((await request('GET', '/api/health', {
      headers: { 'X-Forwarded-For': '203.0.113.1' },
    })).status, 429);
  });

  await t.test('Registro y perfil rechazan HTML y eventos JS antes de persistir', async () => {
    for (const nombre of [
      '<script>alert(1)</script>', '<IMG SRC=x ONERROR=alert(1)>',
      'onclick = alert(1)', '<svg/onload=alert(1)>',
    ]) {
      for (const [method, path, token] of [
        ['POST', '/api/auth/register', undefined], ['PUT', '/api/auth/me', vecino],
      ]) {
        const result = await request(method, path, { token, body: { ...registro, nombre } });
        assert.equal(result.status, 400);
        assert.ok(result.body.details.some((detail) => detail.campo === 'nombre'));
      }
    }
    assert.equal(writes.length, 0);
  });

  await t.test('Crear y actualizar solicitudes rechazan XSS, tipos incorrectos y más de mil caracteres', async () => {
    for (const observaciones of [
      '<script>alert(1)</script>', '<img onerror=alert(1)>', 'onmouseover = alert(1)',
      'a'.repeat(1001), 5, {}, [], null,
    ]) {
      for (const [method, path, token, body] of [
        ['POST', '/api/solicitudes', vecino, { tramiteId: 'cert-residencia', observaciones }],
        ['PATCH', '/api/solicitudes/SOL-1001', funcionario, { estado: 'en_revision', observaciones }],
      ]) {
        const result = await request(method, path, { token, body });
        assert.equal(result.status, 400);
        assert.ok(result.body.details.some((detail) => detail.campo === 'observaciones'));
      }
    }
    assert.equal(writes.length, 0);
  });

  await t.test('Tipos y campos obligatorios inválidos reciben 400', async () => {
    for (const tramiteId of [undefined, '', '   ', 5, {}]) {
      assert.equal((await request('POST', '/api/solicitudes', {
        token: vecino, body: { tramiteId },
      })).status, 400);
    }
    for (const estado of [undefined, '', '   ', 5, {}, 'no_existe']) {
      assert.equal((await request('PATCH', '/api/solicitudes/SOL-1001', {
        token: funcionario, body: { estado },
      })).status, 400);
    }
    assert.equal(writes.length, 0);
  });

  await t.test('Conserva tildes, ampersands y comillas; recorta espacios sin codificar el texto', async () => {
    const nombre = 'José Pérez & Asociados "Sur"';
    const observaciones = 'Necesito el certificado para mi hijo José & su "familia" O\'Higgins';
    for (const [method, path, token] of [
      ['POST', '/api/auth/register', undefined], ['PUT', '/api/auth/me', vecino],
    ]) {
      const result = await request(method, path, { token, body: { ...registro, nombre: `  ${nombre}  ` } });
      assert.equal(result.status, method === 'POST' ? 201 : 200);
      assert.equal(result.body.data.user.nombre, nombre);
    }
    for (const [method, path, token, body] of [
      ['POST', '/api/solicitudes', vecino, { tramiteId: 'cert-residencia', observaciones: `  ${observaciones}  ` }],
      ['PATCH', '/api/solicitudes/SOL-1001', funcionario, { estado: 'en_revision', observaciones: `  ${observaciones}  ` }],
    ]) {
      const result = await request(method, path, { token, body });
      assert.equal(result.status, method === 'POST' ? 201 : 200);
      assert.equal(result.body.data.observaciones, observaciones);
    }
    assert.deepEqual(writes, [{ nombre, email: registro.email }, { nombre, email: registro.email },
      { observaciones }, { observaciones }]);
  });

  await t.test('Observaciones opcionales y el límite de mil caracteres siguen siendo válidos', async () => {
    for (const observaciones of [undefined, '', 'a'.repeat(1000)]) {
      for (const [method, path, token, body] of [
        ['POST', '/api/solicitudes', vecino, { tramiteId: 'cert-residencia', observaciones }],
        ['PATCH', '/api/solicitudes/SOL-1001', funcionario, { estado: 'en_revision', observaciones }],
      ]) {
        const result = await request(method, path, { token, body });
        assert.equal(result.status, method === 'POST' ? 201 : 200);
      }
    }
    assert.equal(writes.length, 6);
  });
});
