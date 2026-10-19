import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tramiteRoutes from './routes/tramiteRoutes';
import solicitudRoutes from './routes/solicitudRoutes';
import notificacionRoutes from './routes/notificacionRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── Middlewares globales ──────────────────────────
app.disable('x-powered-by');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8100',
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));

// ── Ruta de health check ─────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── Montar rutas ─────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tramites', tramiteRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/notificaciones', notificacionRoutes);
// El endpoint de reportes se monta dentro de solicitudRoutes (/api/solicitudes/reportes)

// ── Ruta no encontrada ───────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// ── Manejo de errores global ─────────────────────
app.use(errorHandler);

export default app;
