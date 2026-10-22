// Pruebas de integración contra una base MySQL/MariaDB REAL (sin mocks).
//
// Usan una base aparte (por defecto `muni_stodomingo_test`) que se BORRA y se
// recrea desde schema.sql en cada ejecución. Nunca tocan la base de desarrollo:
// se ignora DB_NAME del .env y se exige que el nombre termine en `_test`.
//
// Conexión (todas opcionales): TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER,
// TEST_DB_PASSWORD, TEST_DB_NAME. Ver README, sección "Pruebas".
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');

const dbName = process.env.TEST_DB_NAME || 'muni_stodomingo_test';
if (!/^[A-Za-z0-9_]+_test$/.test(dbName)) {
  throw new Error(`TEST_DB_NAME debe terminar en "_test" para no tocar datos reales (recibido: ${dbName})`);
}
const dbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT) || 3306,
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '',
};

// Debe fijarse ANTES de cargar dist/: dotenv no pisa variables ya definidas.
Object.assign(process.env, {
  DB_HOST: dbConfig.host, DB_PORT: String(dbConfig.port), DB_USER: dbConfig.user,
  DB_PASSWORD: dbConfig.password, DB_NAME: dbName,
  JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: '24h',
});

const mysql = require('mysql2/promise');
const app = require('../dist/app').default;
const pool = require('../dist/config/database').default;

let server;
let base;

/** Recrea la base de pruebas desde schema.sql (estructura + datos semilla). */
async function recrearBase() {
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
  try {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')
      .replace(/^\s*CREATE DATABASE[^;]*;/im, '')
      .replace(/^\s*USE\s+\w+;/im, '');
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);
    await conn.query(schema);
  } finally {
    await conn.end();
  }
}

before(async () => {
  try {
    await recrearBase();
  } catch (error) {
    throw new Error(
      `No se pudo preparar la base de pruebas "${dbName}" en ${dbConfig.host}:${dbConfig.port}. ` +
      `¿Está corriendo MySQL/MariaDB y las credenciales TEST_DB_* son correctas? (${error.code || error.message})`
    );
  }
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  }
  await pool.end();
});

async function api(method, ruta, { token, body } = {}) {
  const response = await fetch(base + ruta, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

async function login(email) {
  const r = await api('POST', '/api/auth/login', { body: { email, password: 'Test1234' } });
  assert.equal(r.status, 200);
  return r.body.data.token;
}

async function registrarVecino(email) {
  const r = await api('POST', '/api/auth/register', {
    body: { nombre: 'Vecino Nuevo', email, password: 'Test1234' },
  });
  assert.equal(r.status, 201);
  return r.body.data;
}

test('Auth contra la base real', async (t) => {
  await t.test('Login con las cuentas semilla', async () => {
    const r = await api('POST', '/api/auth/login', { body: { email: 'Vecino@Test.com', password: 'Test1234' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.user, { id: 1, nombre: 'Vecino Demo', email: 'vecino@test.com', rol: 'vecino' });
    const f = await api('POST', '/api/auth/login', { body: { email: 'funcionario@test.com', password: 'Test1234' } });
    assert.equal(f.body.data.user.rol, 'funcionario');
    const mala = await api('POST', '/api/auth/login', { body: { email: 'vecino@test.com', password: 'Mala1234' } });
    assert.equal(mala.status, 401);
  });

  await t.test('Registro: persiste, rechaza duplicados (UNIQUE real) e ignora el rol', async () => {
    const r = await api('POST', '/api/auth/register', {
      body: { nombre: ' Ana ', email: 'Ana@Correo.cl', password: 'Test1234', rol: 'funcionario' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.user.rol, 'vecino');
    assert.equal(r.body.data.user.email, 'ana@correo.cl');
    const [filas] = await pool.query('SELECT nombre, rol, password_hash FROM usuario WHERE email = ?', ['ana@correo.cl']);
    assert.equal(filas[0].nombre, 'Ana');
    assert.equal(filas[0].rol, 'vecino');
    assert.notEqual(filas[0].password_hash, 'Test1234');

    const dup = await api('POST', '/api/auth/register', {
      body: { nombre: 'Ana', email: 'ANA@correo.cl', password: 'Test1234' },
    });
    assert.equal(dup.status, 409);

    // Registros simultáneos del mismo correo: uno gana, el resto recibe 409 (nunca 500).
    const carrera = await Promise.all(Array.from({ length: 5 }, () => api('POST', '/api/auth/register', {
      body: { nombre: 'Carrera', email: 'carrera@correo.cl', password: 'Test1234' },
    })));
    assert.equal(carrera.filter((x) => x.status === 201).length, 1);
    assert.equal(carrera.filter((x) => x.status === 409).length, 4);
  });

  await t.test('/me devuelve datos públicos', async () => {
    const token = await login('vecino@test.com');
    const r = await api('GET', '/api/auth/me', { token });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body.data).sort(), ['email', 'id', 'nombre', 'rol']);
  });
});

test('Trámites (públicos)', async (t) => {
  await t.test('Listado y detalle con requisitos', async () => {
    const lista = await api('GET', '/api/tramites');
    assert.equal(lista.status, 200);
    assert.equal(lista.body.data.length, 6);
    const det = await api('GET', '/api/tramites/cert-residencia');
    assert.equal(det.status, 200);
    assert.deepEqual(det.body.data.requisitos, [
      'Cédula de identidad vigente',
      'Comprobante de domicilio de los últimos 3 meses',
      'Declaración jurada simple',
    ]);
    assert.equal((await api('GET', '/api/tramites/no-existe')).status, 404);
  });
});

test('Solicitudes contra la base real', async (t) => {
  let vecino, otroVecino, funcionario;
  t.before(async () => {
    vecino = await login('vecino@test.com');
    funcionario = await login('funcionario@test.com');
    otroVecino = (await registrarVecino('otro@correo.cl')).token;
  });

  await t.test('Exigen autenticación', async () => {
    assert.equal((await api('GET', '/api/solicitudes')).status, 401);
    assert.equal((await api('POST', '/api/solicitudes', { body: { tramiteId: 'cert-residencia' } })).status, 401);
  });

  await t.test('Crear: folio correlativo tras la semilla, y validaciones', async () => {
    const r = await api('POST', '/api/solicitudes', {
      token: vecino, body: { tramiteId: 'cert-residencia', observaciones: 'Urgente' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.id, 'SOL-1006');
    assert.equal(r.body.data.estado, 'pendiente');
    assert.equal(r.body.data.vecinoNombre, 'Vecino Demo');
    assert.equal(r.body.data.observaciones, 'Urgente');
    assert.match(r.body.data.fecha, /^\d{4}-\d{2}-\d{2}$/);

    assert.equal((await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'no-existe' } })).status, 400);
    assert.equal((await api('POST', '/api/solicitudes', { token: vecino, body: {} })).status, 400);
    assert.equal((await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'cert-residencia', observaciones: 5 } })).status, 400);
    assert.equal((await api('POST', '/api/solicitudes', { token: funcionario, body: { tramiteId: 'cert-residencia' } })).status, 403);
  });

  await t.test('Creaciones simultáneas: todas 201, folios únicos y sin huecos de formato', async () => {
    const resultados = await Promise.all(Array.from({ length: 20 }, () => api('POST', '/api/solicitudes', {
      token: vecino, body: { tramiteId: 'reclamo-alumbrado' },
    })));
    assert.ok(resultados.every((r) => r.status === 201), resultados.map((r) => r.status).join());
    const folios = resultados.map((r) => r.body.data.id);
    assert.equal(new Set(folios).size, 20);
    const [filas] = await pool.query("SELECT id, folio FROM solicitud WHERE folio NOT REGEXP '^SOL-[0-9]+$'");
    assert.equal(filas.length, 0, 'no deben quedar folios temporales');
    const [todas] = await pool.query('SELECT id, folio FROM solicitud');
    for (const fila of todas) assert.equal(fila.folio, `SOL-${1000 + fila.id}`);
  });

  await t.test('Una creación fallida no deja filas huérfanas', async () => {
    const antes = (await pool.query('SELECT COUNT(*) AS n FROM solicitud'))[0][0].n;
    // Trámite inactivo: el controlador responde 400 antes de insertar.
    await pool.query("UPDATE tramite SET activo = FALSE WHERE id = 'permiso-evento'");
    const r = await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'permiso-evento' } });
    await pool.query("UPDATE tramite SET activo = TRUE WHERE id = 'permiso-evento'");
    assert.equal(r.status, 400);
    assert.equal((await pool.query('SELECT COUNT(*) AS n FROM solicitud'))[0][0].n, antes);
  });

  await t.test('Listar: el vecino solo ve las suyas; el funcionario ve todas y filtra', async () => {
    const mias = await api('GET', '/api/solicitudes', { token: otroVecino });
    assert.deepEqual(mias.body.data, []);
    const demo = await api('GET', '/api/solicitudes', { token: vecino });
    assert.ok(demo.body.data.length >= 6);
    assert.ok(demo.body.data.every((s) => s.vecinoNombre === 'Vecino Demo'));

    const todas = await api('GET', '/api/solicitudes', { token: funcionario });
    assert.equal(todas.body.data.length, demo.body.data.length);
    const aprobadas = await api('GET', '/api/solicitudes?estado=aprobado', { token: funcionario });
    assert.deepEqual(aprobadas.body.data.map((s) => s.id), ['SOL-1003']);
    assert.equal((await api('GET', '/api/solicitudes?estado=raro', { token: funcionario })).status, 400);
  });

  await t.test('Detalle: el dueño y el funcionario lo ven; otro vecino recibe 404', async () => {
    const dueño = await api('GET', '/api/solicitudes/SOL-1002', { token: vecino });
    assert.equal(dueño.status, 200);
    assert.equal(dueño.body.data.estado, 'en_revision');
    assert.equal((await api('GET', '/api/solicitudes/SOL-1002', { token: funcionario })).status, 200);

    const ajeno = await api('GET', '/api/solicitudes/SOL-1002', { token: otroVecino });
    assert.deepEqual(ajeno, { status: 404, body: { success: false, error: 'Solicitud no encontrada' } });
    // Misma respuesta que un folio inexistente: no se revela que existe.
    const inexistente = await api('GET', '/api/solicitudes/SOL-9999', { token: otroVecino });
    assert.deepEqual(inexistente, ajeno);
    assert.equal((await api('GET', '/api/solicitudes/SOL-9999', { token: funcionario })).status, 404);
  });

  await t.test('Cambiar estado: solo funcionario; registra funcionario y fecha de resolución', async () => {
    const body = { estado: 'aprobado', observaciones: 'Todo en orden' };
    assert.equal((await api('PATCH', '/api/solicitudes/SOL-1001', { token: vecino, body })).status, 403);

    const r = await api('PATCH', '/api/solicitudes/SOL-1001', { token: funcionario, body });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.estado, 'aprobado');
    assert.equal(r.body.data.observaciones, 'Todo en orden');
    const [[fila]] = await pool.query('SELECT funcionario_id, resuelta_en FROM solicitud WHERE folio = ?', ['SOL-1001']);
    assert.equal(fila.funcionario_id, 2);
    assert.notEqual(fila.resuelta_en, null);

    // Sin observaciones nuevas se conservan las anteriores; en_revision no resuelve.
    const rev = await api('PATCH', '/api/solicitudes/SOL-1002', { token: funcionario, body: { estado: 'en_revision' } });
    assert.equal(rev.body.data.observaciones, 'Faltan planos firmados por el arquitecto.');
    const [[sinResolver]] = await pool.query('SELECT resuelta_en FROM solicitud WHERE folio = ?', ['SOL-1002']);
    assert.equal(sinResolver.resuelta_en, null);

    assert.equal((await api('PATCH', '/api/solicitudes/SOL-1001', { token: funcionario, body: { estado: 'raro' } })).status, 400);
    assert.equal((await api('PATCH', '/api/solicitudes/SOL-9999', { token: funcionario, body })).status, 404);
  });

  await t.test('Reportes: solo funcionario y coherentes con la tabla', async () => {
    assert.equal((await api('GET', '/api/solicitudes/reportes', { token: vecino })).status, 403);
    const r = await api('GET', '/api/solicitudes/reportes', { token: funcionario });
    assert.equal(r.status, 200);
    const [filas] = await pool.query('SELECT estado, COUNT(*) AS n FROM solicitud GROUP BY estado');
    const esperado = { pendiente: 0, en_revision: 0, aprobado: 0, rechazado: 0 };
    for (const f of filas) esperado[f.estado] = Number(f.n);
    assert.deepEqual(r.body.data, esperado);
  });
});

test('Notificaciones contra la base real', async (t) => {
  let vecino, otro;
  t.before(async () => {
    vecino = await login('vecino@test.com');
    otro = (await registrarVecino('notif@correo.cl')).token;
  });

  await t.test('Cada usuario ve solo las suyas', async () => {
    const r = await api('GET', '/api/notificaciones', { token: vecino });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 3);
    assert.deepEqual(Object.keys(r.body.data[0]).sort(), ['fecha', 'id', 'leida', 'mensaje', 'titulo']);
    assert.deepEqual((await api('GET', '/api/notificaciones', { token: otro })).body.data, []);
    assert.equal((await api('GET', '/api/notificaciones')).status, 401);
  });

  await t.test('Marcar como leída: solo la propia', async () => {
    const [[sinLeer]] = await pool.query('SELECT id FROM notificacion WHERE usuario_id = 1 AND leida = FALSE LIMIT 1');

    const ajena = await api('PATCH', `/api/notificaciones/${sinLeer.id}`, { token: otro });
    assert.equal(ajena.status, 404);
    const [[intacta]] = await pool.query('SELECT leida FROM notificacion WHERE id = ?', [sinLeer.id]);
    assert.equal(intacta.leida, 0, 'la notificación ajena no debe cambiar');

    const propia = await api('PATCH', `/api/notificaciones/${sinLeer.id}`, { token: vecino });
    assert.equal(propia.status, 200);
    const [[leida]] = await pool.query('SELECT leida FROM notificacion WHERE id = ?', [sinLeer.id]);
    assert.equal(leida.leida, 1);

    assert.equal((await api('PATCH', '/api/notificaciones/99999', { token: vecino })).status, 404);
    assert.equal((await api('PATCH', '/api/notificaciones/5abc', { token: vecino })).status, 400);
  });
});
