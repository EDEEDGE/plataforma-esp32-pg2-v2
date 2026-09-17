import express from 'express';
import roomsRoutes from './routes/rooms.routes.js';

const router = express.Router();

router.use('/', roomsRoutes);

export default router;