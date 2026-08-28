import express from 'express';
import { register } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);//ruta para registrar nuevos usuarios, se conecta directamente al controlador

export default router;