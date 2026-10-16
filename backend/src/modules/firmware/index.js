import express from 'express';
import firmwareRoutes from './routes/firmware.routes.js';

const router = express.Router();

router.use('/', firmwareRoutes);

export default router;