import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import authRoutes from './routes/authRoutes';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/api/auth', authRoutes);
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 500;
  const message = status === 413 ? 'Solicitud demasiado grande' :
    status === 400 ? 'Datos de entrada inválidos' : 'Error interno del servidor';
  res.status(status).json({ success: false, error: message });
};
app.use(handleError);
export default app;
