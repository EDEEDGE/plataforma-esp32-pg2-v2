import express from 'express';

import {
  createFirmwareVersion,
  getProjectFirmwareVersions,
  getFirmwareVersionById,
  updateFirmwareVersion,
  updateFirmwareVersionStatus
} from '../controllers/firmwareVersions.controller.js';

import {
  uploadFirmwareFile
} from '../controllers/firmwareFiles.controller.js';

import {
  createDeployment
} from '../controllers/deployments.controller.js'

//middleware para subir el archivo
import {
  firmwareUpload
} from '../../../middlewares/firmwareUpload.middleware.js';

import {
  authMiddleware
} from '../../../middlewares/auth.middleware.js';


import {
  checkFirmwareUpdate,
  downloadDeviceFirmware
} from '../controllers/deviceFirmware.controller.js';

import {
  deviceAuthMiddleware
} from '../../../middlewares/deviceAuth.middleware.js';

const router = express.Router();


// Crear versión de firmware
router.post(
  '/projects/:projectId/firmware/versions',
  authMiddleware,
  createFirmwareVersion
);

// Listar versiones de firmware del proyecto
router.get(
  '/projects/:projectId/firmware/versions',
  authMiddleware,
  getProjectFirmwareVersions
);

// Obtener una versión específica
router.get(
  '/firmware/versions/:versionId',
  authMiddleware,
  getFirmwareVersionById
);

// Editar versión de firmware
router.put(
  '/firmware/versions/:versionId',
  authMiddleware,
  updateFirmwareVersion
);

// Activar o desactivar versión
router.patch(
  '/firmware/versions/:versionId/status',
  authMiddleware,
  updateFirmwareVersionStatus
);

// Subir archivo .bin a una versión de firmware
router.post(
  '/firmware/versions/:versionId/files',
  authMiddleware,
  firmwareUpload.single('file'),
  uploadFirmwareFile
);

// Crear despliegue de firmware
router.post(
  '/projects/:projectId/deployments',
  authMiddleware,
  createDeployment
);


// ESP32 consulta si tiene una actualización pendiente
router.get(
  '/devices/firmware/check-update',
  deviceAuthMiddleware,
  checkFirmwareUpdate
);


// Descargar archivo .bin para el ESP32 / ESP8266
router.get(
  '/devices/firmware/files/:fileId/download',
  deviceAuthMiddleware,
  downloadDeviceFirmware
);
export default router;