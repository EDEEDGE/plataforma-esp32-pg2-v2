import express from 'express';

import {
  createDevice,
  generatePairingCode,
  pairDevice,
  deviceHeartbeat,
  getProjectDevices,
  getDeviceById,
  updateDevice,
  updateDeviceStatus
} from '../controllers/devices.controller.js';

import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { deviceAuthMiddleware } from '../../../middlewares/deviceAuth.middleware.js';

const router = express.Router();

router.post(
  '/projects/:projectId/devices',
  authMiddleware,
  createDevice
);

router.post(
  '/devices/:deviceId/pairing-code',
  authMiddleware,
  generatePairingCode
);

router.post(
  '/devices/pair',
  pairDevice
);

router.post(
  '/devices/heartbeat',
  deviceAuthMiddleware,
  deviceHeartbeat
);

router.get(
  '/projects/:projectId/devices',
  authMiddleware,
  getProjectDevices
);

router.get(
  '/devices/:deviceId',
  authMiddleware,
  getDeviceById
);

router.put(
  '/devices/:deviceId',
  authMiddleware,
  updateDevice
);

router.patch(
  '/devices/:deviceId/status',
  authMiddleware,
  updateDeviceStatus
);

export default router;