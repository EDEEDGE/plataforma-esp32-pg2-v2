import { createHash, randomUUID } from 'node:crypto';

import { db } from '../../../prisma/db.ts';

import {
  uploadFile,
  deleteFile
} from '../../../services/storage/storage.service.js';


// Subir archivo .bin para una versión de firmware
export const uploadFirmwareFile = async (req, res) => {
  let uploadedObjectKey = null;

  try {
    const { versionId } = req.params;
    const { deviceType } = req.body;

    // Validar archivo
    if (!req.file) {
      return res.status(400).json({
        message: 'Debe seleccionar un archivo .bin'
      });
    }

    // Validar tipo de dispositivo
    if (
      deviceType !== 'ESP32' &&
      deviceType !== 'ESP8266'
    ) {
      return res.status(400).json({
        message: 'deviceType debe ser ESP32 o ESP8266'
      });
    }

    // Buscar versión
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.first({
        id: versionId
      });

    if (!firmwareVersion) {
      return res.status(404).json({
        message: 'Versión de firmware no encontrada'
      });
    }

    if (!firmwareVersion.isActive) {
      return res.status(409).json({
        message: 'No se pueden subir archivos a una versión desactivada'
      });
    }

    // Buscar proyecto
    const project =
      await db.orm.public.Project.first({
        id: firmwareVersion.projectId
      });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    if (!project.isActive) {
      return res.status(409).json({
        message: 'El proyecto está desactivado'
      });
    }

    // Buscar sala
    const room =
      await db.orm.public.Room.first({
        id: project.roomId
      });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    if (!room.isActive) {
      return res.status(409).json({
        message: 'La sala está desactivada'
      });
    }

    // Verificar membresía del usuario
    const membership =
      await db.orm.public.RoomMember.first({
        roomId: room.id,
        userId: req.user.id
      });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Solo OWNER y ADMIN pueden subir firmware
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para subir archivos de firmware'
      });
    }

    // Cada versión admite un archivo por tipo de dispositivo.
    const existingFile =
      await db.orm.public.FirmwareFile.first({
        firmwareVersionId: versionId,
        deviceType
      });

    if (existingFile) {
      return res.status(409).json({
        message: `Ya existe un archivo para ${deviceType} en esta versión. Usa la opción de reemplazo para actualizarlo.`
      });
    }

    // Calcular SHA-256 del archivo
    const sha256 = createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    // Ruta lógica dentro del Object Storage
    const objectKey =
      `projects/${project.id}` +
      `/versions/${firmwareVersion.id}` +
      `/${deviceType.toLowerCase()}` +
      `/firmware.bin`;

    // Subir archivo al Object Storage
    await uploadFile({
      objectKey,
      buffer: req.file.buffer,
      contentType:
        req.file.mimetype ||
        'application/octet-stream'
    });

    uploadedObjectKey = objectKey;

    // Registrar metadata en PostgreSQL
    const firmwareFile =
      await db.orm.public.FirmwareFile.create({
        firmwareVersionId: firmwareVersion.id,
        deviceType,
        objectKey,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        sha256,
        contentType:
          req.file.mimetype ||
          'application/octet-stream'
      });

    return res.status(201).json({
      message: 'Archivo de firmware subido correctamente',

      firmwareFile: {
        id: firmwareFile.id,
        firmwareVersionId:
          firmwareFile.firmwareVersionId,
        deviceType: firmwareFile.deviceType,
        originalName: firmwareFile.originalName,
        sizeBytes: firmwareFile.sizeBytes,
        sha256: firmwareFile.sha256,
        contentType: firmwareFile.contentType,
        createdAt: firmwareFile.createdAt
      }
    });

  } catch (error) {

    // Si el archivo llegó al storage pero falló el registro
    // en PostgreSQL, intentar limpiar el archivo
    if (uploadedObjectKey) {
      try {
        await deleteFile(uploadedObjectKey);
      } catch (cleanupError) {
        console.error(
          'No se pudo limpiar el archivo del storage:',
          cleanupError
        );
      }
    }

    console.error(
      'Error al subir archivo de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// REEMPLAZAR ARCHIVO DE FIRMWARE
// ============================================

export const replaceFirmwareFile = async (req, res) => {
  let newObjectKey = null;
  let databaseUpdated = false;

  try {
    const { fileId } = req.params;

    // 1. Verificar que se haya enviado un archivo
    if (!req.file) {
      return res.status(400).json({
        message: 'Debe seleccionar un archivo .bin'
      });
    }

    // 2. Buscar el archivo registrado
    const firmwareFile =
      await db.orm.public.FirmwareFile.first({
        id: fileId
      });

    if (!firmwareFile) {
      return res.status(404).json({
        message: 'Archivo de firmware no encontrado'
      });
    }

    // 3. Buscar la versión
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.first({
        id: firmwareFile.firmwareVersionId
      });

    if (!firmwareVersion) {
      return res.status(404).json({
        message: 'Versión de firmware no encontrada'
      });
    }

    if (!firmwareVersion.isActive) {
      return res.status(409).json({
        message: 'La versión de firmware está desactivada'
      });
    }

    // 4. Buscar el proyecto
    const project =
      await db.orm.public.Project.first({
        id: firmwareVersion.projectId
      });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    if (!project.isActive) {
      return res.status(409).json({
        message: 'El proyecto está desactivado'
      });
    }

    // 5. Buscar la sala
    const room =
      await db.orm.public.Room.first({
        id: project.roomId
      });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    if (!room.isActive) {
      return res.status(409).json({
        message: 'La sala está desactivada'
      });
    }

    // 6. Verificar permisos
    const membership =
      await db.orm.public.RoomMember.first({
        roomId: room.id,
        userId: req.user.id
      });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para reemplazar firmware'
      });
    }

    // 7. Impedir reemplazos si ya existe un despliegue
    const existingDeployment =
      await db.orm.public.Deployment.first({
        firmwareVersionId: firmwareVersion.id
      });

    if (existingDeployment) {
      return res.status(409).json({
        message:
          'No se puede reemplazar el archivo porque ' +
          'esta versión ya tiene despliegues registrados'
      });
    }

    // 8. Calcular SHA-256 del archivo nuevo
    const sha256 = createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    // 9. Generar una ruta única
    newObjectKey =
      `projects/${project.id}` +
      `/versions/${firmwareVersion.id}` +
      `/${firmwareFile.deviceType.toLowerCase()}` +
      `/${randomUUID()}.bin`;

    // 10. Guardar el archivo nuevo
    await uploadFile({
      objectKey: newObjectKey,
      buffer: req.file.buffer,
      contentType:
        req.file.mimetype || 'application/octet-stream'
    });

    // 11. Actualizar el registro existente en PostgreSQL
    const updatedFile =
      await db.orm.public.FirmwareFile
        .where({
          id: fileId,
          objectKey: firmwareFile.objectKey
        })
        .update({
          objectKey: newObjectKey,
          originalName: req.file.originalname,
          sizeBytes: req.file.size,
          sha256,
          contentType:
            req.file.mimetype || 'application/octet-stream'
        });

    if (!updatedFile) {
      await deleteFile(newObjectKey);
      newObjectKey = null;

      return res.status(409).json({
        message: 'El archivo fue modificado durante el reemplazo'
      });
    }

    databaseUpdated = true;

    // 12. Eliminar el archivo físico anterior
    // Su fallo no debe deshacer el reemplazo correcto
    try {
      await deleteFile(firmwareFile.objectKey);
    } catch (cleanupError) {
      console.error(
        'No se pudo eliminar el archivo anterior:',
        cleanupError
      );
    }

    return res.status(200).json({
      message: 'Archivo de firmware reemplazado correctamente',

      firmwareFile: {
        id: updatedFile.id,
        firmwareVersionId: updatedFile.firmwareVersionId,
        deviceType: updatedFile.deviceType,
        originalName: updatedFile.originalName,
        sizeBytes: updatedFile.sizeBytes,
        sha256: updatedFile.sha256,
        contentType: updatedFile.contentType
      }
    });

  } catch (error) {

    // Si falló antes de actualizar PostgreSQL,
    // eliminar el nuevo archivo para evitar residuos.
    if (newObjectKey && !databaseUpdated) {
      try {
        await deleteFile(newObjectKey);
      } catch (cleanupError) {
        console.error(
          'No se pudo limpiar el archivo nuevo:',
          cleanupError
        );
      }
    }

    console.error(
      'Error al reemplazar firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};