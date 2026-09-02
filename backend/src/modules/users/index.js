import express from 'express';
import usersRoutes from './routes/users.routes.js';

const router = express.Router();

router.use('/', usersRoutes);

export default router;