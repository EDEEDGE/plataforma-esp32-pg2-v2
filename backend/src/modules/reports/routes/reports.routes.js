import { Router } from 'express';

import {
  getProjectSummary,
  getProjectUpdateHistory,
  getProjectDevicesReport
} from '../controllers/reports.controller.js';

import {
  authMiddleware
} from '../../../middlewares/auth.middleware.js';

const router = Router();

// ============================================
// REPORTE GENERAL DE UN PROYECTO
// ============================================

router.get(
  '/projects/:projectId/reports/summary',
  authMiddleware,
  getProjectSummary
);

// ============================================
// REPORTE 2: HISTORIAL DE ACTUALIZACIONES
// ============================================

router.get(
  '/projects/:projectId/reports/history',
  authMiddleware,
  getProjectUpdateHistory
);

// ============================================
// REPORTE 3: DISPOSITIVOS DEL PROYECTO
// ============================================

router.get(
  '/projects/:projectId/reports/devices',
  authMiddleware,
  getProjectDevicesReport
);

export default router;