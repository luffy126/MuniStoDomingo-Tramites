import { Router } from 'express';
import { listarTramites, obtenerTramite } from '../controllers/tramiteController';

const router = Router();

// Los trámites son públicos (catálogo visible sin login).
// Si se quiere proteger, agregar authMiddleware aquí.
router.get('/', listarTramites);
router.get('/:id', obtenerTramite);

export default router;
