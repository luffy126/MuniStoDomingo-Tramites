import app from './app';
import pool from './config/database';

const PORT = Number(process.env.PORT || 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT debe ser un puerto válido');
}

/**
 * Comprueba la conexión a la BD antes de aceptar peticiones.
 * createPool no se conecta hasta la primera consulta, así que sin esta prueba
 * el servidor arrancaría "bien" con MySQL apagado y fallaría en la primera petición.
 */
async function start(): Promise<void> {
  const destino = `${process.env.DB_NAME || 'muni_stodomingo'} en ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`;
  try {
    await pool.query('SELECT 1');
    console.log(`✅ Conectado a la BD ${destino}`);
  } catch (err) {
    const code = (err as { code?: string }).code || (err as Error).message;
    console.error(`❌ No se pudo conectar a la BD ${destino} (${code})`);
    console.error('   Revisa que MySQL/MariaDB esté encendido y las variables DB_* del .env');
    await pool.end().catch(() => {});
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

void start();
