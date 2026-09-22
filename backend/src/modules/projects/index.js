import express from 'express';
import projectsRoutes from './routes/projects.routes.js';

const router = express.Router();

router.use('/', projectsRoutes);

export default router;