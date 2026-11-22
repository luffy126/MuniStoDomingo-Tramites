import { Router, raw } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';
import { subidaLimiter } from '../middleware/rateLimiter';
import { validateCrearSolicitud, validateActualizarEstado } from '../middleware/validateRequest';
import {
  crearSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  actualizarEstado,
  actualizarPrioridad,
  obtenerReportes,
  cancelarSolicitud,
} from '../controllers/solicitudController';
import {
  listarDocumentos, subirDocumento, descargarDocumento, eliminarDocumento,
} from '../controllers/documentoController';

const router = Router();

// Todas las rutas de solicitudes requieren autenticación
router.use(authMiddleware);

// Vecino crea una solicitud
router.post('/', roleMiddleware('vecino'), validateCrearSolicitud, crearSolicitud);

// Listar solicitudes (vecino ve las suyas, funcionario ve todas)
router.get('/', listarSolicitudes);

// Reportes: solo funcionarios.
// Va ANTES de /:id para que Express no interprete "reportes" como un folio.
router.get('/reportes', roleMiddleware('funcionario'), obtenerReportes);

// Documentos adjuntos: el vecino dueño sube; dueño y funcionario listan/descargan.
router.get('/:id/documentos', listarDocumentos);
router.post(
  '/:id/documentos',
  roleMiddleware('vecino'),
  subidaLimiter,
  raw({ type: ['application/pdf', 'image/jpeg', 'image/png'], limit: '5mb' }),
  subirDocumento
);
router.get('/:id/documentos/:docId/descarga', descargarDocumento);
router.delete('/:id/documentos/:docId', roleMiddleware('vecino'), eliminarDocumento);

// Detalle de una solicitud (por folio)
router.get('/:id', obtenerSolicitud);

// Funcionario cambia el estado
router.patch('/:id', roleMiddleware('funcionario'), validateActualizarEstado, actualizarEstado);

// Funcionario ajusta prioridad y fecha límite (solo solicitudes abiertas)
router.patch('/:id/prioridad', roleMiddleware('funcionario'), actualizarPrioridad);

// Vecino cancela su solicitud mientras siga pendiente
router.delete('/:id', roleMiddleware('vecino'), cancelarSolicitud);

export default router;
