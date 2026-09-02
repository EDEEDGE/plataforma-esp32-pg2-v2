import express from 'express';

import {
  updateMyProfile,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
} from '../controllers/users.controller.js';

import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { allowRoles } from '../../../middlewares/role.middleware.js';

const router = express.Router();

router.put('/me',authMiddleware, updateMyProfile);//ruta para que el usuario actualice su propio perfil
router.get('/', authMiddleware, allowRoles('ADMIN'), getUsers); //solo e admin puede obtener todos los usuarios
router.get('/:id', authMiddleware, allowRoles('ADMIN'), getUserById);//obtener usuarios por id, solo el admin puede realizarlo
router.patch('/:id/status', authMiddleware, allowRoles('ADMIN'), updateUserStatus);//solo el admin puede desactivar o activar usuarios
router.patch('/:id/role', authMiddleware, allowRoles('ADMIN'), updateUserRole);//cambiar rol, solo el admin puede hacerlo

export default router;