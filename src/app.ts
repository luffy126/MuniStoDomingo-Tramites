import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { generalLimiter } from './middleware/rateLimiter';
import tramiteRoutes from './routes/tramiteRoutes';
import solicitudRoutes from './routes/solicitudRoutes';
import notificacionRoutes from './routes/notificacionRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── Middlewares globales ──────────────────────────
app.disable('x-powered-by');
// Detrás de un proxy reverso (Nginx en Docker) la IP real viene en X-Forwarded-For.
// Sin esto, el rate limit vería a todos los clientes con la IP del proxy.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
// JSON y respuestas de la API viajan comprimidas; no toca las descargas de archivos.
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.path.includes('/documentos/') && req.path.includes('/descarga')) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '16kb' }));
app.use(generalLimiter);

// ── Respuestas con datos personales: nunca se cachean ──
// El catálogo público (/api/tramites) queda fuera: puede cachearse.
const noStore = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

// ── Ruta de health check ─────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── Montar rutas ─────────────────────────────────
app.use('/api/auth', noStore, authRoutes);
app.use('/api/tramites', tramiteRoutes);
app.use('/api/solicitudes', noStore, solicitudRoutes);
app.use('/api/notificaciones', noStore, notificacionRoutes);
// El endpoint de reportes se monta dentro de solicitudRoutes (/api/solicitudes/reportes)

// ── Ruta no encontrada ───────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// ── Manejo de errores global ─────────────────────
app.use(errorHandler);

export default app;
