import { db } from '../../../prisma/db.ts';
import { getFile } from '../../../services/storage/storage.service.js';
import { Temporal } from 'temporal-polyfill';

// Comparar versiones con formato X.Y.Z
const compararVersionesFirmware = (versionA, versionB) => {

  const patron = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

  if (
    typeof versionA !== 'string' ||
    typeof versionB !== 'string' ||
    !patron.test(versionA) ||
    !patron.test(versionB)
  ) {
    return null;
  }

  const a = versionA.split('.').map(Number);
  const b = versionB.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }

  return 0;
};

// Consultar si el dispositivo tiene una actualización pendiente
export const checkFirmwareUpdate = async (req, res) => {
  try {
    const deviceId = req.device.id;
    const deviceType = req.device.deviceType;

    // Buscar actualizaciones pendientes del dispositivo
    const pendingUpdates =
      await db.orm.public.DeploymentDevice
        .where({
          deviceId,
          status: 'PENDING'
        })
        .all();

    // No hay actualización pendiente
    if (pendingUpdates.length === 0) {
      return res.status(200).json({
        updateAvailable: false,
        message: 'No hay actualizaciones pendientes'
      });
    }

    // ============================================
    // SELECCIONAR LA VERSION MAS RECIENTE
    // ============================================

    const updatesWithVersion = [];

    for (const pending of pendingUpdates) {

      // Buscar despliegue
      const pendingDeployment =
        await db.orm.public.Deployment.first({
          id: pending.deploymentId
        });

      if (
        !pendingDeployment ||
        pendingDeployment.projectId !== req.device.projectId
      ) {
        continue;
      }

      // Buscar version
      const pendingVersion =
        await db.orm.public.FirmwareVersion.first({
          id: pendingDeployment.firmwareVersionId
        });

      if (
        !pendingVersion ||
        !pendingVersion.isActive ||
        pendingVersion.projectId !== req.device.projectId
      ) {
        continue;
      }

      // Verificar formato de version
      if (
        compararVersionesFirmware(
          pendingVersion.version,
          pendingVersion.version
        ) === null
      ) {
        continue;
      }

      updatesWithVersion.push({
        assignment: pending,
        version: pendingVersion.version
      });
    }

    // No existen actualizaciones validas
    if (updatesWithVersion.length === 0) {
      return res.status(200).json({
        updateAvailable: false,
        message: 'No hay actualizaciones disponibles'
      });
    }

    // Ordenar desde la version mayor
    updatesWithVersion.sort((a, b) => {

      const comparison = compararVersionesFirmware(
        b.version,
        a.version
      );

      if (comparison !== 0) {
        return comparison;
      }

      // Si son iguales, utilizar la asignacion mas reciente
      return String(b.assignment.assignedAt).localeCompare(
        String(a.assignment.assignedAt)
      );
    });

    // Seleccionar la actualizacion mas reciente
    const pendingUpdate = updatesWithVersion[0].assignment;


    // Buscar Deployment
    const deployment =
      await db.orm.public.Deployment.first({
        id: pendingUpdate.deploymentId
      });

    if (!deployment) {
      return res.status(404).json({
        message: 'Despliegue no encontrado'
      });
    }


    // Buscar versión
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.first({
        id: deployment.firmwareVersionId
      });

    if (!firmwareVersion) {
      return res.status(404).json({
        message: 'Versión de firmware no encontrada'
      });
    }


    if (!firmwareVersion.isActive) {
      return res.status(409).json({
        message: 'La versión asignada está desactivada'
      });
    }


    // Buscar el .bin correspondiente al tipo del dispositivo
    const firmwareFile =
      await db.orm.public.FirmwareFile.first({
        firmwareVersionId: firmwareVersion.id,
        deviceType
      });

    if (!firmwareFile) {
      return res.status(404).json({
        message:
          `No existe un archivo de firmware para ${deviceType}`
      });
    }


    return res.status(200).json({
      updateAvailable: true,

      update: {
        deploymentId: deployment.id,

        deploymentDeviceId:
          pendingUpdate.id,

        firmwareVersionId:
          firmwareVersion.id,

        version:
          firmwareVersion.version,

        file: {
          id: firmwareFile.id,
          sizeBytes: firmwareFile.sizeBytes,
          sha256: firmwareFile.sha256,

          downloadPath:
            `/api/devices/firmware/files/${firmwareFile.id}/download`
        }
      }
    });

  } catch (error) {
    console.error(
      'Error consultando actualización de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Descargar firmware para el dispositivo
export const downloadDeviceFirmware = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Dispositivo identificado por su DeviceCredential
    const device = req.device;

    // Buscar archivo en PostgreSQL
    const firmwareFile =
      await db.orm.public.FirmwareFile.first({
        id: fileId
      });

    if (!firmwareFile) {
      return res.status(404).json({
        message: 'Archivo de firmware no encontrado'
      });
    }

    // Verificar compatibilidad con el dispositivo
    if (firmwareFile.deviceType !== device.deviceType) {
      return res.status(403).json({
        message: 'El firmware no es compatible con este dispositivo'
      });
    }

    // Buscar versión
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.first({
        id: firmwareFile.firmwareVersionId
      });

    if (!firmwareVersion || !firmwareVersion.isActive) {
      return res.status(409).json({
        message: 'La versión de firmware no está disponible'
      });
    }

    // Comprobar que pertenece al proyecto del dispositivo
    if (firmwareVersion.projectId !== device.projectId) {
      return res.status(403).json({
        message: 'El firmware no pertenece al proyecto del dispositivo'
      });
    }

    // Verificar proyecto y sala
    const project = await db.orm.public.Project.first({
      id: device.projectId
    });

    if (!project || !project.isActive) {
      return res.status(409).json({
        message: 'El proyecto no está disponible'
      });
    }

    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room || !room.isActive) {
      return res.status(409).json({
        message: 'La sala no está disponible'
      });
    }

    // Buscar actualizaciones pendientes del dispositivo
    const pendingUpdates =
      await db.orm.public.DeploymentDevice
        .where({
          deviceId: device.id,
          status: 'PENDING'
        })
        .all();

    let authorized = false;

    for (const pendingUpdate of pendingUpdates) {
      const deployment =
        await db.orm.public.Deployment.first({
          id: pendingUpdate.deploymentId
        });

      if (
        deployment &&
        deployment.projectId === device.projectId &&
        deployment.firmwareVersionId === firmwareVersion.id
      ) {
        authorized = true;
        break;
      }
    }

    // El ESP solo puede descargar firmware que tenga asignado
    if (!authorized) {
      return res.status(403).json({
        message: 'El dispositivo no tiene este firmware pendiente'
      });
    }

    // Recuperar el archivo desde el StorageService
    const file = await getFile(firmwareFile.objectKey);

    // Preparar descarga binaria
    res.setHeader(
      'Content-Type',
      'application/octet-stream'
    );

    res.setHeader(
      'Content-Length',
      file.buffer.length
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="firmware.bin"'
    );

    res.setHeader(
      'X-Firmware-SHA256',
      firmwareFile.sha256
    );

    res.setHeader('Cache-Control', 'no-store');

    // Entregar archivo .bin
    return res.status(200).send(file.buffer);

  } catch (error) {
    console.error(
      'Error al descargar firmware del dispositivo:',
      error
    );

    if (error.code === 'ENOENT') {
      return res.status(404).json({
        message: 'El archivo físico no existe'
      });
    }

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};


// Confirmar una actualización OTA después de reiniciar
export const confirmFirmwareInstallation = async (req, res) => {
  try {
    const device = req.device;

    const {
      deploymentDeviceId,
      firmwareVersionId,
      version
    } = req.body ?? {};

    if (
      typeof deploymentDeviceId !== 'string' ||
      typeof firmwareVersionId !== 'string' ||
      typeof version !== 'string' ||
      !deploymentDeviceId.trim() ||
      !firmwareVersionId.trim() ||
      !version.trim()
    ) {
      return res.status(400).json({
        message: 'Faltan datos para confirmar la instalación'
      });
    }

    // Buscar la actualización asignada
    const deploymentDevice =
      await db.orm.public.DeploymentDevice.first({
        id: deploymentDeviceId
      });

    if (!deploymentDevice) {
      return res.status(404).json({
        message: 'Actualización asignada no encontrada'
      });
    }

    // Asegurar que pertenece al ESP32 autenticado
    if (deploymentDevice.deviceId !== device.id) {
      return res.status(403).json({
        message: 'La actualización no pertenece a este dispositivo'
      });
    }

    // Comprobar el Deployment
    const deployment =
      await db.orm.public.Deployment.first({
        id: deploymentDevice.deploymentId
      });

    if (
      !deployment ||
      deployment.projectId !== device.projectId ||
      deployment.firmwareVersionId !== firmwareVersionId
    ) {
      return res.status(409).json({
        message: 'Los datos del despliegue no coinciden'
      });
    }

    // Comprobar la versión que el ESP32 dice haber instalado
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.first({
        id: deployment.firmwareVersionId
      });

    if (
      !firmwareVersion ||
      firmwareVersion.projectId !== device.projectId ||
      firmwareVersion.version !== version
    ) {
      return res.status(409).json({
        message: 'La versión confirmada no coincide'
      });
    }

    // Permitir repetir una confirmación ya procesada
    if (deploymentDevice.status === 'INSTALLED') {
      return res.status(200).json({
        message: 'Instalación confirmada anteriormente',
        status: 'INSTALLED'
      });
    }

    if (deploymentDevice.status !== 'PENDING') {
      return res.status(409).json({
        message: 'La actualización ya no está pendiente'
      });
    }

    const now = Temporal.Now.instant();

    // Actualizar solamente si continúa pendiente
    const updated =
      await db.orm.public.DeploymentDevice
        .where({
          id: deploymentDeviceId,
          deviceId: device.id,
          status: 'PENDING'
        })
        .update({
          status: 'INSTALLED',
          installedAt: now,
          updatedAt: now,
          errorMessage: null
        });

    if (!updated) {
      return res.status(409).json({
        message: 'El estado de la actualización cambió'
      });
    }

    // ============================================
    // CERRAR ACTUALIZACIONES OBSOLETAS
    // ============================================

    // La instalación nueva ya está confirmada.
    // Esta limpieza no debe impedir responder HTTP 200.

    try {

      const pendingUpdates =
        await db.orm.public.DeploymentDevice
          .where({
            deviceId: device.id,
            status: 'PENDING'
          })
          .all();

      for (const pending of pendingUpdates) {

        const previousDeployment =
          await db.orm.public.Deployment.first({
            id: pending.deploymentId
          });

        if (
          !previousDeployment ||
          previousDeployment.projectId !== device.projectId
        ) {
          continue;
        }

        const previousVersion =
          await db.orm.public.FirmwareVersion.first({
            id: previousDeployment.firmwareVersionId
          });

        if (!previousVersion) {
          continue;
        }

        const comparison = compararVersionesFirmware(
          previousVersion.version,
          firmwareVersion.version
        );

        // Solo sustituir versiones iguales o anteriores
        if (comparison === null || comparison > 0) {
          continue;
        }

        await db.orm.public.DeploymentDevice
          .where({
            id: pending.id,
            deviceId: device.id,
            status: 'PENDING'
          })
          .update({
            status: 'SUPERSEDED',
            updatedAt: now,
            errorMessage: null
          });
      }

    } catch (cleanupError) {

      console.error(
        'Error cerrando actualizaciones obsoletas:',
        cleanupError
      );
    }

    return res.status(200).json({
      message: 'Instalación OTA confirmada correctamente',
      deploymentDeviceId: updated.id,
      status: updated.status,
      installedAt: updated.installedAt
    });

  } catch (error) {
    console.error(
      'Error confirmando instalación OTA:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};
