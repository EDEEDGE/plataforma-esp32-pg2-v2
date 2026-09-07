import express from 'express';

import {
  changePassword,
  forgotPassword,
  resetPassword
} from '../controllers/password.controller.js';

import {
  authMiddleware
} from '../../../middlewares/auth.middleware.js';

const router = express.Router();

router.put('/change-password', authMiddleware, changePassword);//cambio de contraseña
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;