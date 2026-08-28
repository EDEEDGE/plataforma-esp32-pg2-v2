import express from 'express';

import authRoutes from './routes/auth.routes.js';
import passwordRoutes from './routes/password.routes.js';

const router = express.Router();

router.use('/', authRoutes);
router.use('/', passwordRoutes);

export default router;