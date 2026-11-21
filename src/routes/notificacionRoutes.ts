import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../controllers/notificacionController';

const router = Router();

// Todas las rutas de notificaciones requieren autenticación
router.use(authMiddleware);

router.get('/', listarNotificaciones);
// Va antes de /:id para que "leidas" no se interprete como un id.
router.patch('/leidas', marcarTodasLeidas);
router.patch('/:id', marcarLeida);

export default router;
