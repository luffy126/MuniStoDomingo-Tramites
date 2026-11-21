// Pruebas de integración contra una base MySQL/MariaDB REAL (sin mocks).
//
// Usan una base aparte (por defecto `muni_stodomingo_test`) que se BORRA y se
// recrea desde schema.sql en cada ejecución. Nunca tocan la base de desarrollo:
// se ignora DB_NAME del .env y se exige que el nombre termine en `_test`.
//
// Conexión (todas opcionales): TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER,
// TEST_DB_PASSWORD, TEST_DB_NAME. Ver README, sección "Pruebas".
const { test, before, beforeEach, after } = require('node:test');
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
const uploadDir = path.join(__dirname, '..', '.uploads-test');

// Debe fijarse ANTES de cargar dist/: dotenv no pisa variables ya definidas.
Object.assign(process.env, {
  DB_HOST: dbConfig.host, DB_PORT: String(dbConfig.port), DB_USER: dbConfig.user,
  DB_PASSWORD: dbConfig.password, DB_NAME: dbName,
  JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: '24h', NODE_ENV: 'test',
  // Sin clave: el servicio de email queda en dry run y ninguna prueba llama a Resend.
  RESEND_API_KEY: '', EMAIL_REDIRECT_TO: '',
  // Los adjuntos de prueba se escriben aquí y se borran al terminar.
  UPLOAD_DIR: uploadDir,
  // Sin proxy de confianza, aunque el .env de desarrollo lo configure.
  TRUST_PROXY: '',
  // La suite crea muchas solicitudes con el mismo vecino; el tope se prueba aparte.
  MAX_SOLICITUDES_ABIERTAS: '1000',
});

const mysql = require('mysql2/promise');
const app = require('../dist/app').default;
const pool = require('../dist/config/database').default;
const emailService = require('../dist/services/emailService');
const { esperarRecuperaciones } = require('../dist/controllers/authController');
const { authLimiter, generalLimiter, loginLimiter, recuperacionLimiter, subidaLimiter } = require('../dist/middleware/rateLimiter');

// Aislar ventanas entre escenarios sin desactivar los límites de producción.
beforeEach(() => {
  authLimiter.resetKey('127.0.0.1');
  generalLimiter.resetKey('127.0.0.1');
  for (const l of [loginLimiter, recuperacionLimiter, subidaLimiter]) l.resetKey('127.0.0.1');
});

let server;
let base;

/** Lee schema.sql sin las líneas CREATE DATABASE y USE, para aplicarlo sobre la base de pruebas. */
function leerSchema() {
  return fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')
    .replace(/^\s*CREATE DATABASE[^;]*;/im, '')
    .replace(/^\s*USE\s+\w+;/im, '');
}

/** Recrea la base de pruebas desde schema.sql (estructura + datos semilla). */
async function recrearBase() {
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
  try {
    const schema = leerSchema();
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
    fs.rmSync(uploadDir, { recursive: true, force: true });
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
  fs.rmSync(uploadDir, { recursive: true, force: true });
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
  // Las respuestas 204 no traen cuerpo.
  const texto = await response.text();
  return { status: response.status, body: texto ? JSON.parse(texto) : null };
}

/** Sube bytes con la cabecera que usa el front para el nombre original. */
async function apiArchivo(ruta, { token, bytes, tipo, nombre, requisitoId }) {
  const response = await fetch(base + ruta, {
    method: 'POST',
    headers: {
      'Content-Type': tipo,
      'X-Nombre-Archivo': encodeURIComponent(nombre),
      ...(requisitoId ? { 'X-Requisito-Id': String(requisitoId) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: bytes,
  });
  const texto = await response.text();
  return { status: response.status, body: texto ? JSON.parse(texto) : null };
}

/** Descarga un adjunto tal cual, sin parsear la respuesta como JSON. */
async function apiDescarga(ruta, { token } = {}) {
  const response = await fetch(base + ruta, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    body,
    tipo: response.headers.get('content-type'),
    headers: response.headers,
  };
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
    assert.deepEqual(r.body.data.user, {
      id: 1,
      nombre: 'Vecino Demo',
      email: 'vecino@test.com',
      rol: 'vecino',
      telefono: null,
      direccion: null,
    });
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

  await t.test('Perfil: PUT /me actualiza, valida y detecta duplicados', async () => {
    const original = await registrarVecino('perfil@correo.cl');
    const id = original.user.id;
    const r = await api('PUT', '/api/auth/me', {
      token: original.token,
      body: {
        nombre: ' Perfil Nuevo ',
        email: 'Perfil.Nuevo@Correo.cl',
        rol: 'funcionario',
        telefono: '+56 9 1234 5678',
        direccion: 'Av. Principal 123, Santo Domingo',
        passwordActual: 'Test1234',
      },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.user, {
      id,
      nombre: 'Perfil Nuevo',
      email: 'perfil.nuevo@correo.cl',
      rol: 'vecino',
      telefono: '+56 9 1234 5678',
      direccion: 'Av. Principal 123, Santo Domingo',
    });
    assert.equal(typeof r.body.data.token, 'string');
    assert.equal(JSON.stringify(r.body).includes('password'), false);

    // Cambiar el email cierra las demás sesiones: el token anterior ya no sirve.
    assert.equal((await api('GET', '/api/auth/me', { token: original.token })).status, 401);

    // El token reemitido refleja el email nuevo, y el login funciona con él.
    const yo = await api('GET', '/api/auth/me', { token: r.body.data.token });
    assert.deepEqual(yo.body.data, {
      id,
      nombre: 'Perfil Nuevo',
      email: 'perfil.nuevo@correo.cl',
      rol: 'vecino',
      telefono: '+56 9 1234 5678',
      direccion: 'Av. Principal 123, Santo Domingo',
    });
    assert.equal((await api('POST', '/api/auth/login', { body: { email: 'perfil.nuevo@correo.cl', password: 'Test1234' } })).status, 200);

    // Mismo email (sin cambios) es válido; el de otro usuario da 409.
    const token = r.body.data.token;
    assert.equal((await api('PUT', '/api/auth/me', { token, body: { nombre: 'Perfil Nuevo', email: 'perfil.nuevo@correo.cl' } })).status, 200);
    // Cambiar el email sin la contraseña actual (o con una incorrecta) se rechaza.
    for (const extra of [{}, { passwordActual: 'Incorrecta1' }]) {
      assert.equal((await api('PUT', '/api/auth/me', { token, body: { nombre: 'Perfil Nuevo', email: 'otro.perfil@correo.cl', ...extra } })).status, 403);
    }
    assert.deepEqual(await api('PUT', '/api/auth/me', { token, body: { nombre: 'Perfil Nuevo', email: 'vecino@test.com', passwordActual: 'Test1234' } }), {
      status: 409, body: { success: false, error: 'El email ya está registrado' },
    });

    const invalido = await api('PUT', '/api/auth/me', { token, body: { nombre: '', email: 'x' } });
    assert.equal(invalido.status, 400);
    assert.ok(invalido.body.details.length >= 2);
    assert.equal((await api('PUT', '/api/auth/me', { token, body: {} })).status, 400);
    assert.equal((await api('PUT', '/api/auth/me', { body: { nombre: 'Sin Token', email: 'sin@token.cl' } })).status, 401);

    // Un email de más de 160 caracteres se rechaza con 400 (antes daba 500 por ER_DATA_TOO_LONG).
    const largo = 'a'.repeat(60) + '@' + 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.cl';
    assert.equal((await api('POST', '/api/auth/register', { body: { nombre: 'Largo', email: largo, password: 'Test1234' } })).status, 400);
  });

  await t.test('/me devuelve datos públicos', async () => {
    const token = await login('vecino@test.com');
    const r = await api('GET', '/api/auth/me', { token });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body.data).sort(), ['direccion', 'email', 'id', 'nombre', 'rol', 'telefono']);
  });

  await t.test('Recuperación de contraseña: token de un uso, vencimiento y respuesta genérica', async () => {
    const cuenta = await registrarVecino('recuperar@correo.cl');
    const correos = [];
    emailService.setEmailSender(async (email) => {
      correos.push(email);
      return true;
    });

    try {
      const pedido = await api('POST', '/api/auth/forgot-password', {
        body: { email: 'recuperar@correo.cl' },
      });
      assert.equal(pedido.status, 200);
      // El correo sale después de responder (la respuesta no revela si la cuenta existe).
      await esperarRecuperaciones();
      assert.equal(correos.length, 1);
      assert.match(correos[0].text, /recuperar-password\?token=[a-f0-9]{64}/);
      const enlace = correos[0].text.match(/https?:\/\/\S+/)[0];
      const token = new URL(enlace).searchParams.get('token');

      // El token en claro no se guarda: solo su hash.
      const [[fila]] = await pool.query('SELECT token_hash FROM password_reset WHERE usuario_id = ?', [cuenta.user.id]);
      assert.notEqual(fila.token_hash, token);
      assert.equal(fila.token_hash.length, 64);

      // Un correo desconocido responde igual y no envía nada.
      const desconocido = await api('POST', '/api/auth/forgot-password', {
        body: { email: 'nadie@correo.cl' },
      });
      assert.equal(desconocido.status, 200);
      await esperarRecuperaciones();
      assert.equal(correos.length, 1);

      assert.equal((await api('POST', '/api/auth/reset-password', {
        body: { token: 'f'.repeat(64), password: 'Nueva1234' },
      })).status, 400);
      assert.equal((await api('POST', '/api/auth/reset-password', {
        body: { token, password: 'debil' },
      })).status, 400);

      const cambio = await api('POST', '/api/auth/reset-password', {
        body: { token, password: 'Nueva1234' },
      });
      assert.equal(cambio.status, 200);
      // La sesión abierta antes del cambio de contraseña queda cerrada.
      assert.equal((await api('GET', '/api/auth/me', { token: cuenta.token })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', {
        body: { email: 'recuperar@correo.cl', password: 'Test1234' },
      })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', {
        body: { email: 'recuperar@correo.cl', password: 'Nueva1234' },
      })).status, 200);

      // El mismo enlace ya no sirve.
      assert.equal((await api('POST', '/api/auth/reset-password', {
        body: { token, password: 'Otra1234' },
      })).status, 400);
      const [[restantes]] = await pool.query('SELECT COUNT(*) AS total FROM password_reset WHERE usuario_id = ?', [cuenta.user.id]);
      assert.equal(restantes.total, 0);
    } finally {
      emailService.setEmailSender();
    }
  });
});

test('Verificación en dos pasos por correo', async (t) => {
  await t.test('Activar exige contraseña; el login pide el código y solo entrega token con el correcto', async () => {
    const cuenta = await registrarVecino('dos.pasos@correo.cl');
    const correos = [];
    emailService.setEmailSender(async (email) => { correos.push(email); return true; });
    try {
      // Sin la contraseña correcta no se activa.
      assert.equal((await api('PUT', '/api/auth/2fa', {
        token: cuenta.token, body: { activo: true, password: 'Incorrecta1' },
      })).status, 403);
      assert.deepEqual((await api('GET', '/api/auth/2fa', { token: cuenta.token })).body.data, { activo: false });

      // Activar no surte efecto con la contraseña: hay que confirmar el código del correo.
      const pedir = await api('PUT', '/api/auth/2fa', {
        token: cuenta.token, body: { activo: true, password: 'Test1234' },
      });
      assert.equal(pedir.status, 202);
      assert.equal(pedir.body.data.requiereConfirmacion, true);
      assert.equal(pedir.body.data.token, undefined);
      assert.deepEqual((await api('GET', '/api/auth/2fa', { token: cuenta.token })).body.data, { activo: false });
      assert.equal(correos.length, 1);
      const codigoActivacion = correos[0].text.match(/(\d{6})/)[1];
      correos.length = 0;

      // El desafío de otro usuario no sirve para activar la cuenta propia.
      const otraCuenta = await registrarVecino('dos.pasos.otro@correo.cl');
      assert.equal((await api('POST', '/api/auth/2fa/confirmar', {
        token: otraCuenta.token, body: { desafio: pedir.body.data.desafio, codigo: codigoActivacion },
      })).status, 400);

      // Ese intento consumió el desafío: se pide otro y se confirma con su código.
      const pedir2 = await api('PUT', '/api/auth/2fa', {
        token: cuenta.token, body: { activo: true, password: 'Test1234' },
      });
      const codigoActivacion2 = correos[0].text.match(/(\d{6})/)[1];
      correos.length = 0;
      const malo1 = codigoActivacion2 === '000000' ? '111111' : '000000';
      assert.equal((await api('POST', '/api/auth/2fa/confirmar', {
        token: cuenta.token, body: { desafio: pedir2.body.data.desafio, codigo: malo1 },
      })).status, 401);
      const activar = await api('POST', '/api/auth/2fa/confirmar', {
        token: cuenta.token, body: { desafio: pedir2.body.data.desafio, codigo: codigoActivacion2 },
      });
      assert.equal(activar.status, 200);
      assert.equal(activar.body.data.activo, true);
      // El cambio cierra las otras sesiones y reemite el token de quien lo hizo.
      assert.equal((await api('GET', '/api/auth/me', { token: cuenta.token })).status, 401);
      assert.deepEqual((await api('GET', '/api/auth/2fa', { token: activar.body.data.token })).body.data, { activo: true });

      // La contraseña ya no basta: no hay token, hay desafío y un correo con el código.
      const paso1 = await api('POST', '/api/auth/login', { body: { email: 'dos.pasos@correo.cl', password: 'Test1234' } });
      assert.equal(paso1.status, 200);
      assert.equal(paso1.body.data.token, undefined);
      assert.equal(paso1.body.data.requiere2fa, true);
      assert.match(paso1.body.data.desafio, /^[a-f0-9]{64}$/);
      assert.equal(paso1.body.data.destino, 'do•••@correo.cl');
      assert.equal(correos.length, 1);
      const codigo = correos[0].text.match(/(\d{6})/)[1];
      const desafio = paso1.body.data.desafio;

      // El código no se guarda en claro.
      const [[fila]] = await pool.query('SELECT codigo_hash FROM desafio_2fa WHERE usuario_id = ?', [cuenta.user.id]);
      assert.notEqual(fila.codigo_hash, codigo);

      const otro = codigo === '000000' ? '111111' : '000000';
      const malo = await api('POST', '/api/auth/2fa/verificar', { body: { desafio, codigo: otro } });
      assert.equal(malo.status, 401);
      assert.match(malo.body.error, /Te quedan 4 intentos/);
      assert.equal((await api('POST', '/api/auth/2fa/verificar', { body: { desafio, codigo: '12' } })).status, 400);

      const bueno = await api('POST', '/api/auth/2fa/verificar', { body: { desafio, codigo } });
      assert.equal(bueno.status, 200);
      assert.equal((await api('GET', '/api/auth/me', { token: bueno.body.data.token })).status, 200);
      // Un desafío sirve una sola vez.
      assert.equal((await api('POST', '/api/auth/2fa/verificar', { body: { desafio, codigo } })).status, 400);

      // Cinco códigos incorrectos invalidan el desafío aunque después llegue el correcto.
      correos.length = 0;
      const paso1b = await api('POST', '/api/auth/login', { body: { email: 'dos.pasos@correo.cl', password: 'Test1234' } });
      const codigoB = correos[0].text.match(/(\d{6})/)[1];
      const otroB = codigoB === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) {
        await api('POST', '/api/auth/2fa/verificar', { body: { desafio: paso1b.body.data.desafio, codigo: otroB } });
      }
      assert.equal((await api('POST', '/api/auth/2fa/verificar', {
        body: { desafio: paso1b.body.data.desafio, codigo: codigoB },
      })).status, 400);

      // Desactivar vuelve al login de un paso.
      assert.equal((await api('PUT', '/api/auth/2fa', {
        token: bueno.body.data.token, body: { activo: false, password: 'Test1234' },
      })).status, 200);
      const directo = await api('POST', '/api/auth/login', { body: { email: 'dos.pasos@correo.cl', password: 'Test1234' } });
      assert.equal(typeof directo.body.data.token, 'string');
    } finally {
      emailService.setEmailSender();
    }
  });
});

test('Trámites (públicos)', async (t) => {
  await t.test('Los requisitos traen su tipo: documento (se adjunta) o dato (observaciones)', async () => {
    const det = await api('GET', '/api/tramites/reclamo-alumbrado');
    assert.equal(det.status, 200);
    assert.deepEqual(det.body.data.requisitosDetalle.map(({ tipo, obligatorio }) => ({ tipo, obligatorio })), [
      { tipo: 'dato', obligatorio: true },
      { tipo: 'documento', obligatorio: false },
    ]);
    const lista = await api('GET', '/api/tramites');
    const numero = lista.body.data.find((t) => t.id === 'cert-numero-municipal');
    assert.ok(numero.requisitosDetalle.every((r) => r.tipo === 'documento' && r.obligatorio));
  });

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

  await t.test('Un trámite inactivo responde 404 en el detalle', async () => {
    await pool.query("UPDATE tramite SET activo = FALSE WHERE id = 'permiso-evento'");
    try {
      assert.deepEqual(await api('GET', '/api/tramites/permiso-evento'), {
        status: 404, body: { success: false, error: 'Trámite no encontrado' },
      });
    } finally {
      await pool.query("UPDATE tramite SET activo = TRUE WHERE id = 'permiso-evento'");
    }
    assert.equal((await api('GET', '/api/tramites/permiso-evento')).status, 200);
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
    // El cambio crea exactamente un aviso para el vecino dueño (la semilla ya trae otros
    // avisos de SOL-1001 con otro título, por eso se filtra por el título nuevo).
    const avisos = async (folio, titulo) => (await pool.query(
      'SELECT titulo, mensaje FROM notificacion WHERE solicitud_id = (SELECT id FROM solicitud WHERE folio = ?) AND usuario_id = 1 AND titulo = ?',
      [folio, titulo]))[0];
    const avisosAprobada = await avisos('SOL-1001', 'Solicitud aprobada');
    assert.equal(avisosAprobada.length, 1);
    assert.equal(avisosAprobada[0].titulo, 'Solicitud aprobada');
    assert.ok(avisosAprobada[0].mensaje.includes('SOL-1001'));
    assert.ok(avisosAprobada[0].mensaje.includes('Observaciones: Todo en orden'));

    // SOL-1002 ya viene en revisión y gestionada por el funcionario 2 desde la semilla.
    const [[semilla]] = await pool.query('SELECT funcionario_id FROM solicitud WHERE folio = ?', ['SOL-1002']);
    assert.equal(semilla.funcionario_id, 2);

    // Repetir en_revision exige observaciones (se recortan al guardar); no resuelve la solicitud.
    const rev = await api('PATCH', '/api/solicitudes/SOL-1002', {
      token: funcionario, body: { estado: 'en_revision', observaciones: '  Planos recibidos  ' },
    });
    assert.equal(rev.status, 200);
    assert.equal(rev.body.data.observaciones, 'Planos recibidos');
    const [[sinResolver]] = await pool.query('SELECT resuelta_en FROM solicitud WHERE folio = ?', ['SOL-1002']);
    assert.equal(sinResolver.resuelta_en, null);
    const avisosRevision = await avisos('SOL-1002', 'Solicitud en revisión');
    assert.equal(avisosRevision.length, 1);
    assert.ok(avisosRevision[0].mensaje.includes('Observaciones: Planos recibidos'));

    // Sin observaciones (o en blanco) no hay información nueva: 409 y sin aviso repetido.
    const errorMismoEstado = {
      status: 409, body: { success: false, error: 'No se puede pasar una solicitud de "en_revision" a "en_revision"' },
    };
    assert.deepEqual(await api('PATCH', '/api/solicitudes/SOL-1002', { token: funcionario, body: { estado: 'en_revision' } }), errorMismoEstado);
    assert.deepEqual(await api('PATCH', '/api/solicitudes/SOL-1002', {
      token: funcionario, body: { estado: 'en_revision', observaciones: '   ' },
    }), errorMismoEstado);
    // Reenviar las mismas observaciones ya guardadas (la UI las precarga) tampoco es información nueva.
    assert.deepEqual(await api('PATCH', '/api/solicitudes/SOL-1002', {
      token: funcionario, body: { estado: 'en_revision', observaciones: ' Planos recibidos ' },
    }), errorMismoEstado);
    assert.equal((await avisos('SOL-1002', 'Solicitud en revisión')).length, 1);

    // Sin observaciones nuevas se conservan las anteriores al resolver.
    const resuelta = await api('PATCH', '/api/solicitudes/SOL-1002', { token: funcionario, body: { estado: 'aprobado' } });
    assert.equal(resuelta.body.data.observaciones, 'Planos recibidos');
    const [[final]] = await pool.query('SELECT resuelta_en FROM solicitud WHERE folio = ?', ['SOL-1002']);
    assert.notEqual(final.resuelta_en, null);

    assert.equal((await api('PATCH', '/api/solicitudes/SOL-1001', { token: funcionario, body: { estado: 'raro' } })).status, 400);
    assert.equal((await api('PATCH', '/api/solicitudes/SOL-9999', { token: funcionario, body })).status, 404);
  });

  await t.test('Transiciones inválidas: 409 sin cambios ni avisos', async () => {
    const contar = async () => (await pool.query('SELECT COUNT(*) AS n FROM notificacion'))[0][0].n;
    const estadoDe = async (folio) => (await pool.query('SELECT estado FROM solicitud WHERE folio = ?', [folio]))[0][0].estado;
    const avisosAntes = await contar();

    // SOL-1001 ya fue aprobada en la subprueba anterior: es un estado final.
    assert.deepEqual(await api('PATCH', '/api/solicitudes/SOL-1001', { token: funcionario, body: { estado: 'pendiente' } }), {
      status: 409, body: { success: false, error: 'No se puede pasar una solicitud de "aprobado" a "pendiente"' },
    });
    assert.equal((await api('PATCH', '/api/solicitudes/SOL-1001', { token: funcionario, body: { estado: 'rechazado' } })).status, 409);
    // Ninguna transición lleva a pendiente.
    assert.equal((await api('PATCH', '/api/solicitudes/SOL-1005', { token: funcionario, body: { estado: 'pendiente' } })).status, 409);

    assert.equal(await estadoDe('SOL-1001'), 'aprobado');
    assert.equal(await estadoDe('SOL-1005'), 'pendiente');
    assert.equal(await contar(), avisosAntes);
  });

  await t.test('Resoluciones simultáneas: una gana, la otra 409', async () => {
    const creada = await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'reclamo-alumbrado' } });
    const folio = creada.body.data.id;
    const resultados = await Promise.all(['aprobado', 'rechazado'].map((estado) =>
      api('PATCH', `/api/solicitudes/${folio}`, { token: funcionario, body: { estado } })));
    assert.deepEqual(resultados.map((r) => r.status).sort(), [200, 409]);
    const [[{ n }]] = await pool.query(
      'SELECT COUNT(*) AS n FROM notificacion WHERE solicitud_id = (SELECT id FROM solicitud WHERE folio = ?)', [folio]);
    assert.equal(n, 1);
  });

  await t.test('Reportes: solo funcionario, coherentes y filtrables por periodo', async () => {
    assert.equal((await api('GET', '/api/solicitudes/reportes', { token: vecino })).status, 403);
    const r = await api('GET', '/api/solicitudes/reportes', { token: funcionario });
    assert.equal(r.status, 200);
    const [filas] = await pool.query('SELECT estado, COUNT(*) AS n FROM solicitud GROUP BY estado');
    const esperado = { pendiente: 0, en_revision: 0, aprobado: 0, rechazado: 0 };
    for (const f of filas) esperado[f.estado] = Number(f.n);
    for (const estado of Object.keys(esperado)) {
      assert.equal(r.body.data.porEstado[estado], esperado[estado], `Estado ${estado}`);
    }
    assert.equal(
      r.body.data.total,
      Object.values(esperado).reduce((a, b) => a + b, 0),
    );
    assert.ok(Array.isArray(r.body.data.porTramite));
    assert.equal(r.body.data.desde, null);
    assert.equal(r.body.data.hasta, null);

    const vacio = await api('GET', '/api/solicitudes/reportes?desde=2099-01-01&hasta=2099-01-31', { token: funcionario });
    assert.equal(vacio.status, 200);
    assert.equal(vacio.body.data.total, 0);

    const invalido = await api('GET', '/api/solicitudes/reportes?desde=2099-99-99', { token: funcionario });
    assert.equal(invalido.status, 400);
  });

  await t.test('Prioridad, plazo, búsqueda e historial de la solicitud', async () => {
    const creada = await api('POST', '/api/solicitudes', {
      token: vecino,
      body: { tramiteId: 'cert-residencia' },
    });
    assert.equal(creada.status, 201);
    const folio = creada.body.data.id;
    // MySQL compara CURDATE() en hora local: usar UTC aquí daría "hoy" después de las 21:00.
    const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ayer = `${fechaAyer.getFullYear()}-${String(fechaAyer.getMonth() + 1).padStart(2, '0')}-${String(fechaAyer.getDate()).padStart(2, '0')}`;

    assert.equal((await api(
      'PATCH',
      `/api/solicitudes/${folio}/prioridad`,
      { token: vecino, body: { prioridad: 'urgente' } },
    )).status, 403);
    assert.equal((await api(
      'PATCH',
      `/api/solicitudes/${folio}/prioridad`,
      { token: funcionario, body: { prioridad: 'critica' } },
    )).status, 400);

    const priorizada = await api(
      'PATCH',
      `/api/solicitudes/${folio}/prioridad`,
      { token: funcionario, body: { prioridad: 'urgente', fechaLimite: ayer } },
    );
    assert.equal(priorizada.status, 200);
    assert.equal(priorizada.body.data.prioridad, 'urgente');
    assert.equal(priorizada.body.data.fechaLimite, ayer);

    const bandeja = await api(
      'GET',
      '/api/solicitudes?prioridad=urgente&vencidas=1&orden=limite',
      { token: funcionario },
    );
    assert.equal(bandeja.status, 200);
    assert.ok(
      bandeja.body.data.some((s) => s.id === folio && s.fechaLimite === ayer),
      'La solicitud urgente y vencida debe aparecer en la bandeja filtrada',
    );

    const buscada = await api('GET', `/api/solicitudes?q=${encodeURIComponent(folio)}`, { token: funcionario });
    assert.equal(buscada.status, 200);
    assert.ok(buscada.body.data.some((s) => s.id === folio));

    const detalle = await api('GET', `/api/solicitudes/${folio}`, { token: funcionario });
    assert.equal(detalle.status, 200);
    assert.ok(Array.isArray(detalle.body.data.historial));
    assert.ok(detalle.body.data.historial.some(
      (h) => h.estadoAnterior === null && h.estadoNuevo === 'pendiente',
    ));
    assert.ok(detalle.body.data.historial[0].actorNombre);

    const aprobada = await api('PATCH', `/api/solicitudes/${folio}`, {
      token: funcionario,
      body: { estado: 'aprobado', observaciones: 'Revisada y aprobada en la prueba' },
    });
    assert.equal(aprobada.status, 200);
    assert.equal((await api(
      'PATCH',
      `/api/solicitudes/${folio}/prioridad`,
      { token: funcionario, body: { prioridad: 'media' } },
    )).status, 409);

    const final = await api('GET', `/api/solicitudes/${folio}`, { token: funcionario });
    assert.ok(final.body.data.historial.some((h) => h.estadoNuevo === 'aprobado'));
  });

  await t.test('Documentos: validación, autorización, listado y descarga', async () => {
    const creada = await api('POST', '/api/solicitudes', {
      token: vecino,
      body: { tramiteId: 'cert-residencia' },
    });
    assert.equal(creada.status, 201);
    const folio = creada.body.data.id;
    const ruta = `/api/solicitudes/${folio}/documentos`;
    const bytes = Buffer.from('%PDF-1.4\n% contenido de prueba\n');

    assert.equal((await api('GET', ruta, { token: otroVecino })).status, 404);
    assert.equal((await apiArchivo(ruta, {
      token: vecino, bytes: Buffer.from('no es pdf'), tipo: 'application/pdf', nombre: 'falso.pdf',
    })).status, 400);
    const seguro = await apiArchivo(ruta, {
      token: vecino, bytes, tipo: 'application/pdf', nombre: '../salto.pdf',
    });
    assert.equal(seguro.status, 201);
    assert.equal(seguro.body.data.nombre, 'salto.pdf', 'El nombre del cliente nunca debe escapar de la carpeta');
    const extensionForzada = await apiArchivo(ruta, {
      token: vecino, bytes, tipo: 'application/pdf', nombre: 'pagina.html',
    });
    assert.equal(extensionForzada.status, 201);
    assert.equal(extensionForzada.body.data.nombre, 'pagina.pdf', 'La extensión visible debe seguir al tipo real');

    const subida = await apiArchivo(ruta, {
      token: vecino, bytes, tipo: 'application/pdf', nombre: 'certificado.pdf',
    });
    assert.equal(subida.status, 201);
    assert.equal(subida.body.data.nombre, 'certificado.pdf');
    assert.equal(subida.body.data.tamano, bytes.length);
    assert.ok(subida.body.data.id);

    const listado = await api('GET', ruta, { token: vecino });
    assert.equal(listado.status, 200);
    assert.equal(listado.body.data.length, 3);
    assert.equal(listado.body.data[2].nombre, 'certificado.pdf');

    const vistaFuncionario = await api('GET', ruta, { token: funcionario });
    assert.equal(vistaFuncionario.status, 200);
    assert.equal(vistaFuncionario.body.data.length, 3);

    const descargaRuta = `${ruta}/${subida.body.data.id}/descarga`;
    assert.equal((await apiDescarga(descargaRuta, { token: otroVecino })).status, 404);
    const descarga = await apiDescarga(descargaRuta, { token: funcionario });
    assert.equal(descarga.status, 200);
    assert.ok(descarga.tipo?.includes('application/pdf'));
    assert.equal(descarga.body.subarray(0, 5).toString(), '%PDF-');
    assert.equal(descarga.body.length, bytes.length);
    assert.equal(descarga.headers.get('cache-control'), 'private, no-store, must-revalidate');
    assert.equal(descarga.headers.get('vary'), 'Authorization');
    assert.match(descarga.headers.get('content-disposition'), /^attachment;/);
    assert.match(descarga.headers.get('content-disposition'), /certificado\.pdf/);

    const inexistente = await apiDescarga(`${ruta}/no-existe/descarga`, { token: funcionario });
    assert.equal(inexistente.status, 400);

    // Quitar un adjunto: solo el dueño y solo mientras la solicitud esté abierta.
    const docId = subida.body.data.id;
    assert.equal((await api('DELETE', `${ruta}/${docId}`, { token: otroVecino })).status, 404);
    assert.equal((await api('DELETE', `${ruta}/${docId}`, { token: funcionario })).status, 403);
    assert.equal((await api('DELETE', `${ruta}/${docId}`, { token: vecino })).status, 204);
    assert.equal((await api('GET', ruta, { token: vecino })).body.data.length, 2);
    assert.equal((await apiDescarga(descargaRuta, { token: vecino })).status, 404);

    const [archivos] = await pool.query('SELECT COUNT(*) AS n FROM documento');
    assert.equal(archivos[0].n, 2);
    assert.equal(fs.readdirSync(uploadDir).length, 2);
  });

  await t.test('Adjuntos por requisito: solo requisitos de documento del mismo trámite', async () => {
    const tramite = (await api('GET', '/api/tramites/cert-numero-municipal')).body.data;
    const ajeno = (await api('GET', '/api/tramites/solicitud-retiro-escombros')).body.data;
    const [rol] = tramite.requisitosDetalle;
    const creada = await api('POST', '/api/solicitudes', {
      token: vecino, body: { tramiteId: 'cert-numero-municipal' },
    });
    const ruta = `/api/solicitudes/${creada.body.data.id}/documentos`;
    const bytes = Buffer.from('%PDF-1.4\n% rol de avaluo\n');

    // Un requisito de otro trámite, uno de tipo dato o un id mal formado se rechazan.
    for (const requisitoId of [ajeno.requisitosDetalle[0].id, 'abc']) {
      assert.equal((await apiArchivo(ruta, {
        token: vecino, bytes, tipo: 'application/pdf', nombre: 'rol.pdf', requisitoId,
      })).status, 400);
    }

    const subida = await apiArchivo(ruta, {
      token: vecino, bytes, tipo: 'application/pdf', nombre: 'rol.pdf', requisitoId: rol.id,
    });
    assert.equal(subida.status, 201);
    assert.equal(subida.body.data.requisitoId, rol.id);
    assert.equal(subida.body.data.requisito, rol.descripcion);

    const listado = await api('GET', ruta, { token: funcionario });
    assert.equal(listado.body.data[0].requisito, rol.descripcion);
  });

  await t.test('Tope de solicitudes abiertas por vecino: 409 al superarlo', async () => {
    const cuenta = await registrarVecino('tope.abiertas@correo.cl');
    const crear = () => api('POST', '/api/solicitudes', {
      token: cuenta.token, body: { tramiteId: 'cert-residencia' },
    });
    process.env.MAX_SOLICITUDES_ABIERTAS = '2';
    try {
      assert.equal((await crear()).status, 201);
      assert.equal((await crear()).status, 201);
      const bloqueada = await crear();
      assert.equal(bloqueada.status, 409);
      assert.match(bloqueada.body.error, /2 solicitudes abiertas/);
    } finally {
      process.env.MAX_SOLICITUDES_ABIERTAS = '1000';
    }
  });

  await t.test('Cancelar: solo el dueño y solo pendientes', async () => {
    const creada = await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'cert-residencia' } });
    assert.equal(creada.status, 201);
    const folio = creada.body.data.id;
    const existe = async (f) => (await pool.query('SELECT COUNT(*) AS n FROM solicitud WHERE folio = ?', [f]))[0][0].n;

    assert.equal((await api('DELETE', `/api/solicitudes/${folio}`)).status, 401);
    assert.equal((await api('DELETE', `/api/solicitudes/${folio}`, { token: funcionario })).status, 403);
    // Otro vecino recibe lo mismo que ante un folio inexistente.
    assert.deepEqual(await api('DELETE', `/api/solicitudes/${folio}`, { token: otroVecino }), {
      status: 404, body: { success: false, error: 'Solicitud no encontrada' },
    });
    assert.equal(await existe(folio), 1);

    assert.deepEqual(await api('DELETE', `/api/solicitudes/${folio}`, { token: vecino }), { status: 204, body: null });
    assert.equal(await existe(folio), 0);
    assert.equal((await api('DELETE', `/api/solicitudes/${folio}`, { token: vecino })).status, 404);

    // SOL-1003 está aprobada: ya no se puede cancelar.
    assert.deepEqual(await api('DELETE', '/api/solicitudes/SOL-1003', { token: vecino }), {
      status: 409, body: { success: false, error: 'Solo se pueden cancelar solicitudes pendientes' },
    });
    assert.equal(await existe('SOL-1003'), 1);
  });

  await t.test('Cancelar también borra los archivos físicos de sus adjuntos', async () => {
    const creada = await api('POST', '/api/solicitudes', {
      token: vecino, body: { tramiteId: 'cert-residencia' },
    });
    assert.equal(creada.status, 201);
    const folio = creada.body.data.id;
    const antes = fs.readdirSync(uploadDir).length;
    const subida = await apiArchivo(`/api/solicitudes/${folio}/documentos`, {
      token: vecino,
      bytes: Buffer.from('%PDF-1.4\nlimpieza al cancelar\n'),
      tipo: 'application/pdf',
      nombre: 'temporal.pdf',
    });
    assert.equal(subida.status, 201);
    assert.equal(fs.readdirSync(uploadDir).length, antes + 1);

    assert.equal((await api('DELETE', `/api/solicitudes/${folio}`, { token: vecino })).status, 204);
    assert.equal(fs.readdirSync(uploadDir).length, antes, 'No deben quedar adjuntos huérfanos');
  });

  await t.test('Cancelar conserva las notificaciones (ON DELETE SET NULL)', async () => {
    const creada = await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'cert-residencia' } });
    const folio = creada.body.data.id;
    const [[{ id: solicitudId }]] = await pool.query('SELECT id FROM solicitud WHERE folio = ?', [folio]);
    const [insertada] = await pool.query(
      'INSERT INTO notificacion (usuario_id, solicitud_id, titulo, mensaje) VALUES (1, ?, ?, ?)',
      [solicitudId, 'Aviso de prueba', 'Se conserva al cancelar']
    );

    assert.equal((await api('DELETE', `/api/solicitudes/${folio}`, { token: vecino })).status, 204);
    const [filas] = await pool.query('SELECT solicitud_id FROM notificacion WHERE id = ?', [insertada.insertId]);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].solicitud_id, null);
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
    // Los tests anteriores crean avisos (cancelaciones, cambios de estado): se compara con la tabla.
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM notificacion WHERE usuario_id = 1');
    assert.equal(r.body.data.length, n);
    const [[reciente]] = await pool.query('SELECT titulo FROM notificacion WHERE usuario_id = 1 ORDER BY creada_en DESC, id DESC LIMIT 1');
    assert.equal(r.body.data[0].titulo, reciente.titulo);
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
    // Devuelve el recurso actualizado, no un mensaje.
    assert.deepEqual(Object.keys(propia.body.data).sort(), ['fecha', 'folio', 'id', 'leida', 'mensaje', 'titulo']);
    assert.equal(propia.body.data.id, String(sinLeer.id));
    assert.equal(propia.body.data.leida, true);
    const [[leida]] = await pool.query('SELECT leida FROM notificacion WHERE id = ?', [sinLeer.id]);
    assert.equal(leida.leida, 1);
    // Es idempotente: marcarla otra vez también responde 200.
    assert.equal((await api('PATCH', `/api/notificaciones/${sinLeer.id}`, { token: vecino })).status, 200);

    assert.equal((await api('PATCH', '/api/notificaciones/99999', { token: vecino })).status, 404);
    assert.equal((await api('PATCH', '/api/notificaciones/5abc', { token: vecino })).status, 400);
  });
});

test('Integridad de la base de datos', async (t) => {
  await t.test('Los CHECK rechazan valores fuera de catálogo', async () => {
    await assert.rejects(
      pool.query("INSERT INTO solicitud (folio, tramite_id, vecino_id, estado) VALUES ('SOL-9001', 'cert-residencia', 1, 'raro')"),
      // MariaDB (4025) y MySQL 8 (3819) numeran distinto el mismo CHECK. Se compara el errno
      // porque mysql2 le pone a 4025 un nombre de código que no corresponde a este error.
      (err) => [4025, 3819].includes(err.errno),
    );
  });

  await t.test('Las claves foráneas impiden referencias huérfanas y borrados con dependientes', async () => {
    await assert.rejects(
      pool.query("INSERT INTO solicitud (folio, tramite_id, vecino_id) VALUES ('SOL-9002', 'no-existe', 1)"),
      { code: 'ER_NO_REFERENCED_ROW_2' },
    );
    // Los trámites con solicitudes no se pueden borrar (por eso se desactivan con `activo`).
    await assert.rejects(pool.query("DELETE FROM tramite WHERE id = 'cert-residencia'"), { code: 'ER_ROW_IS_REFERENCED_2' });
  });

  await t.test('El email es único', async () => {
    await assert.rejects(
      pool.query("INSERT INTO usuario (nombre, email, password_hash, rol) VALUES ('Repetido', 'vecino@test.com', 'x', 'vecino')"),
      { code: 'ER_DUP_ENTRY' },
    );
  });
});

test('Paginación de listados (EF4)', async (t) => {
  let token, vecinoId, funcionario;
  t.before(async () => {
    const registro = await registrarVecino('paginas@correo.cl');
    token = registro.token;
    vecinoId = registro.user.id;
    funcionario = await login('funcionario@test.com');
    // 25 solicitudes y 25 avisos con la MISMA fecha: obliga a que el orden desempate por id.
    for (let i = 1; i <= 25; i += 1) {
      await pool.query(
        "INSERT INTO solicitud (folio, tramite_id, vecino_id, creada_en) VALUES (?, 'cert-residencia', ?, '2026-01-01 10:00:00')",
        [`PAG-${String(i).padStart(2, '0')}`, vecinoId]
      );
      await pool.query(
        "INSERT INTO notificacion (usuario_id, titulo, mensaje, leida, creada_en) VALUES (?, ?, 'x', ?, '2026-01-01 10:00:00')",
        [vecinoId, `Aviso ${i}`, i <= 7]
      );
    }
  });
  t.after(async () => {
    await pool.query('DELETE FROM notificacion WHERE usuario_id = ?', [vecinoId]);
    await pool.query('DELETE FROM solicitud WHERE vecino_id = ?', [vecinoId]);
  });

  await t.test('Sin parámetros: primera página de 20 con sus metadatos', async () => {
    const r = await api('GET', '/api/solicitudes', { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 20);
    assert.deepEqual(r.body.pagination, {
      page: 1, limit: 20, total: 25, totalPages: 2, hasNext: true, hasPrev: false,
    });
  });

  await t.test('Recorrer las páginas entrega cada solicitud una sola vez y en orden', async () => {
    const vistas = [];
    for (const [page, esperadas] of [[1, 10], [2, 10], [3, 5]]) {
      const r = await api('GET', `/api/solicitudes?page=${page}&limit=10`, { token });
      assert.equal(r.body.data.length, esperadas);
      assert.equal(r.body.pagination.totalPages, 3);
      assert.equal(r.body.pagination.hasNext, page < 3);
      assert.equal(r.body.pagination.hasPrev, page > 1);
      vistas.push(...r.body.data.map((s) => s.id));
    }
    assert.equal(new Set(vistas).size, 25);
    // Misma fecha: el desempate es por id descendente (la última insertada primero).
    assert.equal(vistas[0], 'PAG-25');
    assert.equal(vistas[24], 'PAG-01');
  });

  await t.test('Una página más allá del final responde vacía, no error', async () => {
    const r = await api('GET', '/api/solicitudes?page=9&limit=10', { token });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.pagination.total, 25);
    assert.equal(r.body.pagination.hasNext, false);
    assert.equal(r.body.pagination.hasPrev, true);
  });

  await t.test('Valores inválidos o excesivos se normalizan sin responder 500', async () => {
    for (const query of ['page=abc&limit=xyz', 'page=-3&limit=0', 'page=1.5&limit=2e1', 'page=1&page=2&limit=5&limit=6']) {
      const r = await api('GET', `/api/solicitudes?${query}`, { token });
      assert.equal(r.status, 200, query);
      assert.equal(r.body.pagination.page, 1, query);
      assert.equal(r.body.pagination.limit, 20, query);
    }
    const grande = await api('GET', '/api/solicitudes?limit=5000', { token });
    assert.equal(grande.body.pagination.limit, 100);
    assert.equal(grande.body.data.length, 25);
    const lejos = await api('GET', '/api/solicitudes?page=999999999&limit=100', { token });
    assert.equal(lejos.status, 200);
    assert.deepEqual(lejos.body.data, []);
  });

  await t.test('El total del funcionario respeta el filtro por estado', async () => {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM solicitud WHERE estado = 'pendiente'");
    const r = await api('GET', '/api/solicitudes?estado=pendiente&limit=5', { token: funcionario });
    assert.equal(r.body.pagination.total, n);
    assert.equal(r.body.data.length, 5);
    assert.ok(r.body.data.every((s) => s.estado === 'pendiente'));
    const [[{ todas }]] = await pool.query('SELECT COUNT(*) AS todas FROM solicitud');
    assert.equal((await api('GET', '/api/solicitudes?limit=1', { token: funcionario })).body.pagination.total, todas);
  });

  await t.test('Notificaciones: páginas, total y no leídas de todas las páginas', async () => {
    const r = await api('GET', '/api/notificaciones?page=2&limit=10', { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 10);
    assert.deepEqual(r.body.pagination, {
      page: 2, limit: 10, total: 25, totalPages: 3, hasNext: true, hasPrev: true, unread: 18,
    });
    assert.equal(r.body.data[0].titulo, 'Aviso 15');
    const sinAvisos = await api('GET', '/api/notificaciones', { token: (await registrarVecino('sinavisos@correo.cl')).token });
    assert.deepEqual(sinAvisos.body.pagination, {
      page: 1, limit: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false, unread: 0,
    });
  });
});

test('Aviso por email al cambiar el estado (EF5)', async (t) => {
  let funcionario, vecino;
  const enviados = [];
  /** Espera a que el envío en segundo plano ocurra (va después de la respuesta HTTP). */
  const esperarEnvios = async (cantidad) => {
    for (let i = 0; i < 100 && enviados.length < cantidad; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  const crearSolicitud = async () =>
    (await api('POST', '/api/solicitudes', { token: vecino, body: { tramiteId: 'cert-residencia' } })).body.data.id;

  t.before(async () => {
    funcionario = await login('funcionario@test.com');
    vecino = (await registrarVecino('correo.real@correo.cl')).token;
  });
  t.beforeEach(() => {
    enviados.length = 0;
    emailService.setEmailSender(async (email) => { enviados.push(email); return true; });
  });
  t.after(() => {
    emailService.setEmailSender();
    delete process.env.EMAIL_REDIRECT_TO;
  });

  await t.test('Un cambio de estado envía un correo al vecino dueño', async () => {
    const folio = await crearSolicitud();
    const r = await api('PATCH', `/api/solicitudes/${folio}`, {
      token: funcionario, body: { estado: 'rechazado', observaciones: 'Falta el comprobante & la firma' },
    });
    assert.equal(r.status, 200);
    await esperarEnvios(1);
    assert.equal(enviados.length, 1);
    const [email] = enviados;
    assert.equal(email.to, 'correo.real@correo.cl');
    assert.equal(email.subject, `Solicitud ${folio}: Rechazada`);
    assert.ok(email.html.includes('Certificado de residencia'));
    assert.ok(email.html.includes('Falta el comprobante &amp; la firma'));
    assert.ok(email.text.includes('Observaciones: Falta el comprobante & la firma'));
  });

  await t.test('Si el proveedor de correo falla, el cambio de estado se guarda igual', async () => {
    emailService.setEmailSender(async () => { throw new Error('Resend caído'); });
    const folio = await crearSolicitud();
    // El fallo se registra con console.error; se silencia para no ensuciar la salida.
    const original = console.error;
    const errores = [];
    console.error = (...args) => errores.push(args.join(' '));
    try {
      const r = await api('PATCH', `/api/solicitudes/${folio}`, { token: funcionario, body: { estado: 'aprobado' } });
      assert.equal(r.status, 200);
      for (let i = 0; i < 100 && errores.length === 0; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } finally {
      console.error = original;
    }
    assert.ok(errores.some((e) => e.includes('Resend caído')));
    const [[fila]] = await pool.query('SELECT estado FROM solicitud WHERE folio = ?', [folio]);
    assert.equal(fila.estado, 'aprobado');
    const [[{ n }]] = await pool.query(
      'SELECT COUNT(*) AS n FROM notificacion WHERE solicitud_id = (SELECT id FROM solicitud WHERE folio = ?)', [folio]);
    assert.equal(n, 1);
  });

  await t.test('Un cambio rechazado (409) o inexistente (404) no envía correo', async () => {
    const folio = await crearSolicitud();
    await api('PATCH', `/api/solicitudes/${folio}`, { token: funcionario, body: { estado: 'aprobado' } });
    await esperarEnvios(1);
    enviados.length = 0;
    assert.equal((await api('PATCH', `/api/solicitudes/${folio}`, { token: funcionario, body: { estado: 'rechazado' } })).status, 409);
    assert.equal((await api('PATCH', '/api/solicitudes/SOL-0', { token: funcionario, body: { estado: 'aprobado' } })).status, 404);
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(enviados.length, 0);
  });

  await t.test('EMAIL_REDIRECT_TO desvía el correo y conserva el destinatario en el asunto', async () => {
    process.env.EMAIL_REDIRECT_TO = 'demo@correo.cl';
    const folio = await crearSolicitud();
    await api('PATCH', `/api/solicitudes/${folio}`, { token: funcionario, body: { estado: 'en_revision' } });
    await esperarEnvios(1);
    assert.equal(enviados[0].to, 'demo@correo.cl');
    assert.equal(enviados[0].subject, `[para correo.real@correo.cl] Solicitud ${folio}: En revisión`);
    delete process.env.EMAIL_REDIRECT_TO;
  });
});

// Debe ser el ÚLTIMO test: deja la base de pruebas en la semilla.
test('schema.sql se puede ejecutar dos veces', async () => {
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
  try {
    await conn.query(`USE \`${dbName}\``);
    const schema = leerSchema();
    await conn.query(schema);
    await conn.query(schema);
    const contar = async (tabla) => (await conn.query(`SELECT COUNT(*) AS n FROM ${tabla}`))[0][0].n;
    assert.equal(await contar('tramite'), 6);
    assert.equal(await contar('solicitud'), 5);
    assert.equal(await contar('notificacion'), 3);
    const [[resuelta]] = await conn.query("SELECT resuelta_en FROM solicitud WHERE folio = 'SOL-1003'");
    assert.notEqual(resuelta.resuelta_en, null);
  } finally {
    await conn.end();
  }
});
