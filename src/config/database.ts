import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Pool de conexiones a MySQL/MariaDB.
 *
 * Se usa un pool y no conexiones sueltas para que las peticiones concurrentes
 * reutilicen conexiones ya abiertas en lugar de negociar una nueva cada vez.
 *
 * La configuración se lee de variables de entorno (.env). Los valores por
 * defecto sirven para desarrollo local; en producción deben venir del entorno.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'muni_stodomingo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
