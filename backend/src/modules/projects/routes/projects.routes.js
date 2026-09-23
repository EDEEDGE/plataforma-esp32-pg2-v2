import express from 'express';

import {
  createProject,
  getRoomProjects,
  getProjectById,
  updateProject,
  updateProjectStatus
} from '../controllers/projects.controller.js';

import { authMiddleware } from '../../../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/rooms/:roomId/projects',
  authMiddleware,
  createProject
);

router.get(
  '/rooms/:roomId/projects',
  authMiddleware,
  getRoomProjects
);

router.get(
  '/projects/:projectId',
  authMiddleware,
  getProjectById
);

router.put(
  '/projects/:projectId',
  authMiddleware,
  updateProject
);

router.patch(
  '/projects/:projectId/status',
  authMiddleware,
  updateProjectStatus
);

export default router;