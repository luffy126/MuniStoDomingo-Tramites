import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';
import {
  crearSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  actualizarEstado,
  obtenerReportes,
  cancelarSolicitud,
} from '../controllers/solicitudController';

const router = Router();

// Todas las rutas de solicitudes requieren autenticación
router.use(authMiddleware);

// Vecino crea una solicitud
router.post('/', roleMiddleware('vecino'), crearSolicitud);

// Listar solicitudes (vecino ve las suyas, funcionario ve todas)
router.get('/', listarSolicitudes);

// Reportes: solo funcionarios.
// Va ANTES de /:id para que Express no interprete "reportes" como un folio.
router.get('/reportes', roleMiddleware('funcionario'), obtenerReportes);

// Detalle de una solicitud (por folio)
router.get('/:id', obtenerSolicitud);

// Funcionario cambia el estado
router.patch('/:id', roleMiddleware('funcionario'), actualizarEstado);

// Vecino cancela su solicitud mientras siga pendiente
router.delete('/:id', roleMiddleware('vecino'), cancelarSolicitud);

export default router;
