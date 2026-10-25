const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_EXPIRES_IN = '24h';
// La suite no depende del .env de quien la ejecuta (p. ej. NODE_ENV=development).
process.env.NODE_ENV = 'test';

// Sustituir únicamente la persistencia para probar HTTP, bcrypt y JWT sin MySQL.
const users = [];
let serviceFailure = false;
let duplicateOnInsert = false;
const servicePath = require.resolve('../dist/services/userService');
require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: {
  async createUser(nombre, email, password_hash, rol) {
    if (duplicateOnInsert) throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY' });
    const user = { id: users.length + 1, nombre, email, password_hash, rol };
    users.push(user);
    return user;
  },
  async findByEmail(email) {
    if (serviceFailure) throw new Error('Error de persistencia simulado');
    return users.find((user) => user.email === email) || null;
  },
  async findById(id) { return users.find((user) => user.id === id) || null; },
} };

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../dist/app').default;
const { authMiddleware } = require('../dist/middleware/authMiddleware');
const { roleMiddleware } = require('../dist/middleware/roleMiddleware');

test('Autenticación y autorización a través de HTTP', async (t) => {
  const harness = express();
  harness.get('/solo-funcionario', authMiddleware, roleMiddleware('funcionario'),
    (req, res) => res.json({ success: true, data: req.user }));
  harness.get('/sin-autenticacion', roleMiddleware('funcionario'), (_req, res) => res.sendStatus(200));
  harness.use(app);
  const server = harness.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body, token) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token === undefined ? {} : { Authorization: token }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }
  const credentials = { nombre: '  Test User  ', email: 'TEST@Test.com', password: 'Test1234' };
  let token;

  await t.test('Registro: normaliza datos, hashea y entrega un token con expiración', async () => {
    const result = await request('/api/auth/register', credentials);
    assert.equal(result.status, 201);
    assert.deepEqual(result.body.data.user, { id: 1, nombre: 'Test User', email: 'test@test.com', rol: 'vecino' });
    assert.equal(bcrypt.getRounds(users[0].password_hash), 10);
    assert.equal(await bcrypt.compare(credentials.password, users[0].password_hash), true);
    token = result.body.data.token;
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    assert.deepEqual(Object.keys(claims).sort(), ['email', 'exp', 'iat', 'id', 'rol']);
    assert.equal(claims.exp - claims.iat, 86400);
    assert.equal(JSON.stringify(result.body).includes('password'), false);
  });
  await t.test('Registro duplicado y conflicto concurrente: 409', async () => {
    assert.equal((await request('/api/auth/register', credentials)).status, 409);
    duplicateOnInsert = true;
    try {
      assert.equal((await request('/api/auth/register', { ...credentials, email: 'otro@test.com' })).status, 409);
    } finally { duplicateOnInsert = false; }
  });
  await t.test('Datos inválidos y tipos incorrectos: 400 sin filtrar contraseñas', async () => {
    for (const body of [
      { nombre: '', email: 'incorrecto', password: '123' },
      { ...credentials, nombre: {} }, { ...credentials, email: [] },
      { ...credentials, password: {} }, { ...credentials, password: 'Aa1' + 'á'.repeat(36) },
    ]) {
      const result = await request('/api/auth/register', body);
      assert.equal(result.status, 400);
      assert.ok(result.body.details.length > 0);
      assert.ok(result.body.details.every((detail) => typeof detail.mensaje === 'string' && !('value' in detail)));
    }
    assert.equal((await request('/api/auth/login', {})).status, 400);
    assert.equal((await request('/api/auth/login', { email: credentials.email, password: 123 })).status, 400);
  });
  await t.test('Login correcto y errores genéricos para usuario o contraseña incorrectos', async () => {
    const success = await request('/api/auth/login', credentials);
    assert.equal(success.status, 200);
    assert.equal(success.body.data.user.rol, 'vecino');
    assert.equal(JSON.stringify(success.body).includes('password'), false);
    for (const body of [{ email: credentials.email, password: 'x' }, { email: 'nadie@test.com', password: 'x' }]) {
      assert.deepEqual(await request('/api/auth/login', body), {
        status: 401, body: { success: false, error: 'Credenciales inválidas' },
      });
    }
  });
  await t.test('Perfil público con token válido: 200; usuario eliminado: 404', async () => {
    const result = await request('/api/auth/me', undefined, `Bearer ${token}`);
    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(result.body.data).sort(), ['email', 'id', 'nombre', 'rol']);
    const missingUser = jwt.sign({ id: 999, email: 'borrado@test.com', rol: 'vecino' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    assert.equal((await request('/api/auth/me', undefined, `Bearer ${missingUser}`)).status, 404);
  });
  await t.test('Token ausente, corrupto, expirado o con payload incorrecto: 401', async () => {
    const payload = { id: 1, email: 'test@test.com', rol: 'vecino' };
    const cases = [
      [undefined, 'Token no proporcionado'], ['Basic abc', 'Token no proporcionado'],
      // HTTP elimina el espacio final: un Bearer vacío llega sin el prefijo "Bearer ".
      ['Bearer ', 'Token no proporcionado'], ['Bearer corrupto', 'Token inválido'],
      [`Bearer ${jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 })}`, 'Token expirado'],
      [`Bearer ${jwt.sign(payload, randomBytes(48).toString('hex'), { expiresIn: '1h' })}`, 'Token inválido'],
      [`Bearer ${jwt.sign(payload, process.env.JWT_SECRET)}`, 'Token inválido'],
      [`Bearer ${jwt.sign({ ...payload, rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`, 'Token inválido'],
    ];
    for (const [header, error] of cases) {
      assert.deepEqual(await request('/api/auth/me', undefined, header), { status: 401, body: { success: false, error } });
    }
  });
  await t.test('Permisos: vecino 403, funcionario 200, sin autenticación 401', async () => {
    assert.equal((await request('/solo-funcionario', undefined, `Bearer ${token}`)).status, 403);
    assert.equal((await request('/sin-autenticacion')).status, 401);
    // El registro público ignora `rol`: nadie puede autoasignarse funcionario.
    const intento = await request('/api/auth/register', { ...credentials, email: 'funcionario@test.com', rol: 'funcionario' });
    assert.equal(intento.status, 201);
    assert.equal(intento.body.data.user.rol, 'vecino');
    assert.equal((await request('/solo-funcionario', undefined, `Bearer ${intento.body.data.token}`)).status, 403);
    // Los funcionarios reales vienen de la base de datos; aquí se firma su token directamente.
    const funcionario = jwt.sign({ id: 50, email: 'func@test.com', rol: 'funcionario' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const allowed = await request('/solo-funcionario', undefined, `Bearer ${funcionario}`);
    assert.equal(allowed.status, 200);
    assert.deepEqual(Object.keys(allowed.body.data).sort(), ['email', 'id', 'rol']);
  });
  await t.test('Errores de persistencia: 500 genérico (también en development)', async () => {
    serviceFailure = true;
    process.env.NODE_ENV = 'development';
    try {
      for (const path of ['/api/auth/register', '/api/auth/login']) {
        assert.deepEqual(await request(path, credentials), {
          status: 500, body: { success: false, error: 'Error interno del servidor' },
        });
      }
    } finally {
      serviceFailure = false;
      process.env.NODE_ENV = 'test';
    }
  });
  await t.test('JSON malformado: 400; ruta inexistente: 404', async () => {
    const result = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(result.status, 400);
    assert.deepEqual(await result.json(), { success: false, error: 'Datos de entrada inválidos' });
    assert.equal((await request('/inexistente')).status, 404);

    // Un body de más de 16kb lo rechaza body-parser con 413.
    const grande = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a'.repeat(20000) }),
    });
    assert.deepEqual({ status: grande.status, body: await grande.json() }, {
      status: 413, body: { success: false, error: 'Solicitud demasiado grande' },
    });

    // Un body comprimido inválido (gzip sin comprimir) también es culpa del cliente: 400, no 500.
    const comprimido = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body: '{}',
    });
    assert.deepEqual({ status: comprimido.status, body: await comprimido.json() }, {
      status: 400, body: { success: false, error: 'Datos de entrada inválidos' },
    });

    // Un charset no soportado lo rechaza body-parser con 415: no debe terminar en 500.
    const charset = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=latin1' }, body: '{}',
    });
    assert.deepEqual({ status: charset.status, body: await charset.json() }, {
      status: 415, body: { success: false, error: 'Tipo de contenido no soportado' },
    });
  });
});

test('La configuración rechaza secretos y expiraciones inválidos', () => {
  for (const overrides of [{ JWT_SECRET: '' }, { JWT_SECRET: 'corto' }, { JWT_EXPIRES_IN: '-1' }, { JWT_EXPIRES_IN: 'invalido' }]) {
    const result = spawnSync(process.execPath, ['-e', "require('./dist/config/jwt')"], {
      cwd: require('node:path').resolve(__dirname, '..'),
      env: { ...process.env, ...overrides }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
  }
});
