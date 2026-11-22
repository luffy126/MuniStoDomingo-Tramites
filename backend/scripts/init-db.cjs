#!/usr/bin/env node
/**
 * Inicializa la base de datos de MuniStoDomingo-Tramites en un equipo nuevo.
 *
 *   npm run db:init              crea la base y carga estructura + datos semilla
 *   npm run db:init -- --force   la recrea aunque ya exista (BORRA sus datos)
 *
 * Qué hace:
 *   1. Si no existe `.env`, lo crea desde `.env.example` con un JWT_SECRET nuevo.
 *   2. Se conecta al servidor MySQL/MariaDB con DB_HOST, DB_PORT, DB_USER y DB_PASSWORD.
 *   3. Se niega a continuar si la base ya tiene tablas (salvo con --force).
 *   4. Ejecuta `schema.sql` (el esquema completo, que ya incluye todas las migraciones
 *      de `migrations/`) usando el nombre de DB_NAME.
 *   5. Verifica que las tablas y los datos semilla quedaron cargados.
 *
 * No necesita el cliente `mysql` en el PATH: usa el mismo driver (mysql2) que el backend.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const rutaEnv = path.join(raiz, '.env');
const rutaEjemplo = path.join(raiz, '.env.example');
const rutaSchema = path.join(raiz, 'schema.sql');

const TABLAS_ESPERADAS = [
  'usuario', 'password_reset', 'desafio_2fa', 'tramite', 'requisito',
  'solicitud', 'notificacion', 'solicitud_historial', 'documento',
];

const forzar = process.argv.includes('--force');

function fallar(mensaje) {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

/** Crea `.env` desde `.env.example` si falta; no pisa uno existente. */
function asegurarEnv() {
  if (fs.existsSync(rutaEnv)) {
    console.log('• .env encontrado, se usa tal cual.');
    return;
  }
  if (!fs.existsSync(rutaEjemplo)) fallar('No existe .env ni .env.example.');
  const secreto = crypto.randomBytes(48).toString('hex');
  const contenido = fs.readFileSync(rutaEjemplo, 'utf8')
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secreto}`)
    // XAMPP/MariaDB local trae root sin contraseña; si la tuya tiene una, edítala en .env.
    .replace(/^DB_PASSWORD=.*$/m, 'DB_PASSWORD=');
  fs.writeFileSync(rutaEnv, contenido, { mode: 0o600 });
  console.log('• .env creado desde .env.example (JWT_SECRET nuevo, DB_PASSWORD vacío).');
  console.log('  Si tu usuario de MySQL tiene contraseña, escríbela en DB_PASSWORD y vuelve a ejecutar.');
}

/** Quita CREATE DATABASE y USE del esquema: el nombre de la base lo decide DB_NAME. */
function leerSchema() {
  if (!fs.existsSync(rutaSchema)) fallar('No se encontró schema.sql.');
  return fs.readFileSync(rutaSchema, 'utf8')
    .replace(/^\s*CREATE DATABASE[^;]*;/im, '')
    .replace(/^\s*USE\s+\w+;/im, '');
}

async function main() {
  asegurarEnv();
  require('dotenv').config({ path: rutaEnv });
  const mysql = require('mysql2/promise');

  const dbName = process.env.DB_NAME || 'muni_stodomingo';
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) fallar(`DB_NAME no es válido: "${dbName}" (solo letras, números y _).`);

  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  }).catch((e) => {
    const pista = e.code === 'ECONNREFUSED'
      ? 'El servidor MySQL/MariaDB no está encendido (con XAMPP, presiona Start en MySQL).'
      : e.code === 'ER_ACCESS_DENIED_ERROR'
        ? 'Usuario o contraseña incorrectos: revisa DB_USER y DB_PASSWORD en .env.'
        : e.message;
    return fallar(`No se pudo conectar a la base de datos: ${pista}`);
  });

  try {
    console.log(`• Conectado a ${conexion.config.host}:${conexion.config.port} como ${conexion.config.user}.`);

    const [existentes] = await conexion.query(
      'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?',
      [dbName],
    );
    if (existentes[0].n > 0 && !forzar) {
      fallar(
        `La base "${dbName}" ya tiene ${existentes[0].n} tablas y este script las borraría.\n`
        + '  Si quieres reiniciarla a la semilla (se pierden sus datos): npm run db:init -- --force\n'
        + '  Si solo faltan cambios de estructura, aplica las migraciones de migrations/ en orden.',
      );
    }

    await conexion.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conexion.query(`USE \`${dbName}\``);
    await conexion.query(leerSchema());
    console.log(`• Esquema y datos semilla cargados en "${dbName}".`);

    const [tablas] = await conexion.query(
      'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?',
      [dbName],
    );
    const presentes = new Set(tablas.map((fila) => String(fila.t).toLowerCase()));
    const faltan = TABLAS_ESPERADAS.filter((t) => !presentes.has(t));
    if (faltan.length > 0) fallar(`Faltan tablas tras la carga: ${faltan.join(', ')}`);

    const [[conteo]] = await conexion.query(
      'SELECT (SELECT COUNT(*) FROM usuario) AS usuarios, (SELECT COUNT(*) FROM tramite) AS tramites,'
      + ' (SELECT COUNT(*) FROM requisito) AS requisitos, (SELECT COUNT(*) FROM solicitud) AS solicitudes',
    );
    console.log(
      `• Verificado: ${TABLAS_ESPERADAS.length} tablas · ${conteo.usuarios} usuarios · `
      + `${conteo.tramites} trámites · ${conteo.requisitos} requisitos · ${conteo.solicitudes} solicitudes.`,
    );
  } finally {
    await conexion.end();
  }

  fs.mkdirSync(path.join(raiz, 'uploads'), { recursive: true });

  console.log('\n✓ Base lista. Cuentas de prueba (contraseña: Test1234):');
  console.log('    vecino@test.com        (vecino)');
  console.log('    funcionario@test.com   (funcionario)');
  console.log('\n  Siguiente paso: npm run dev\n');
}

main().catch((e) => fallar(e.message));
