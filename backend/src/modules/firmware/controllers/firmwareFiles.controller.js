import { createHash } from 'node:crypto';

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

    // Solo puede existir un .bin por tipo de dispositivo
    // dentro de una misma versión
    const existingFile =
      await db.orm.public.FirmwareFile.first({
        firmwareVersionId: versionId,
        deviceType
      });

    if (existingFile) {
      return res.status(409).json({
        message: `Ya existe un archivo para ${deviceType} en esta versión`
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