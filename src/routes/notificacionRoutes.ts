import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { listarNotificaciones, marcarLeida } from '../controllers/notificacionController';

const router = Router();

// Todas las rutas de notificaciones requieren autenticación
router.use(authMiddleware);

router.get('/', listarNotificaciones);
router.patch('/:id', marcarLeida);

export default router;
