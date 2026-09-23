import express from 'express';
import devicesRoutes from './routes/devices.routes.js';

const router = express.Router();

router.use('/', devicesRoutes);

export default router;