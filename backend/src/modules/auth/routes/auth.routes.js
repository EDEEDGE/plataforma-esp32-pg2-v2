import express from 'express';
import { 
    register,
    login,
    me
 } from '../controllers/auth.controller.js';

import { authMiddleware } from '../../../middlewares/auth.middleware.js';//mandamos a llamar al middleware que controla el jwt y rutas protegidas

const router = express.Router();

router.post('/register', register);//ruta para registrar nuevos usuarios, se conecta directamente al controlador
router.post('/login', login);//ruta para realizar el login del usuario con correo y contraseña
router.get('/me', authMiddleware, me)

export default router;