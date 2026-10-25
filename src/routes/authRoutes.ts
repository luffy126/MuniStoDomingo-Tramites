import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRegister, validateLogin, validateUpdateProfile } from '../middleware/validateRequest';

const router = Router();
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, validateUpdateProfile, updateMe);
export default router;
