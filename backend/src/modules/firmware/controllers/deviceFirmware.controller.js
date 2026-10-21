import { db } from '../../../prisma/db.ts';
import { getFile } from '../../../services/storage/storage.service.js';

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

    /*
      Si existen varias versiones diferentes pendientes,
      se atiende primero la más antigua.
    */
    pendingUpdates.sort((a, b) =>
      String(a.assignedAt).localeCompare(
        String(b.assignedAt)
      )
    );

    const pendingUpdate = pendingUpdates[0];


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