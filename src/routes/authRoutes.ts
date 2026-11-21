import { Router } from 'express';
import {
  register, login, getMe, updateMe, forgotPassword, resetPassword,
  verificarDosFactores, estadoDosFactores, cambiarDosFactores, confirmarDosFactores,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { authLimiter, loginLimiter, recuperacionLimiter } from '../middleware/rateLimiter';
import {
  validateRegister, validateLogin, validateUpdateProfile, validateForgotPassword,
  validateResetPassword, validateVerificar2fa, validateCambiar2fa,
} from '../middleware/validateRequest';

const router = Router();
// El límite de intentos protege las credenciales, no la consulta de sesión.
// /me se llama en cada recarga y debe seguir el límite general de la API.
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/forgot-password', recuperacionLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', recuperacionLimiter, validateResetPassword, resetPassword);
// 2FA: verificar cuenta como intento de login (solo los fallos consumen cupo).
router.post('/2fa/verificar', loginLimiter, validateVerificar2fa, verificarDosFactores);
router.get('/2fa', authMiddleware, estadoDosFactores);
router.put('/2fa', authMiddleware, authLimiter, validateCambiar2fa, cambiarDosFactores);
router.post('/2fa/confirmar', authMiddleware, validateVerificar2fa, confirmarDosFactores);
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, validateUpdateProfile, updateMe);
export default router;
