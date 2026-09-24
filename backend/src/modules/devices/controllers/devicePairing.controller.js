import { db } from '../../../prisma/db.ts';
import { randomBytes, createHash } from 'node:crypto';

// Generar código temporal de vinculación para un dispositivo
export const generatePairingCode = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Buscar dispositivo
    const device = await db.orm.public.Device.first({
      id: deviceId
    });

    if (!device) {
      return res.status(404).json({
        message: 'Dispositivo no encontrado'
      });
    }

    // El dispositivo debe estar activo
    if (!device.isActive) {
      return res.status(409).json({
        message: 'No se puede vincular un dispositivo desactivado'
      });
    }

    // Si ya está vinculado, no generar otro código
    if (device.isPaired) {
      return res.status(409).json({
        message: 'El dispositivo ya está vinculado'
      });
    }

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: device.projectId
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
    const room = await db.orm.public.Room.first({
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

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este dispositivo'
      });
    }

    // Solo OWNER y ADMIN pueden generar códigos
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para generar códigos de vinculación'
      });
    }

    const now = Temporal.Now.instant();

    // Buscar códigos anteriores del dispositivo
    const previousTokens =
      await db.orm.public.DevicePairingToken
        .where({
          deviceId
        })
        .all();

    // Verificar si todavía existe un código válido
    const activeToken = previousTokens.find((pairingToken) => {
      return (
        !pairingToken.usedAt &&
        Temporal.Instant.compare(
          pairingToken.expiresAt,
          now
        ) > 0
      );
    });

    if (activeToken) {
      return res.status(409).json({
        message: 'Ya existe un código de vinculación activo para este dispositivo'
      });
    }

    // Generar código
    const rawCode = randomBytes(4)
      .toString('hex')
      .toUpperCase();

    // Formato XXXX-XXXX
    const pairingCode =
      `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}`;

    // Guardar únicamente el hash
    const tokenHash = createHash('sha256')
      .update(pairingCode)
      .digest('hex');

    // Código válido durante 15 minutos
    const expiresAt = now.add({
      minutes: 15
    });

    // Guardar código temporal
    await db.orm.public.DevicePairingToken.create({
      deviceId,
      tokenHash,
      expiresAt
    });

    return res.status(201).json({
      message: 'Código de vinculación generado correctamente',
      pairingCode,
      expiresAt
    });

  } catch (error) {
    console.error(
      'Error al generar código de vinculación:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Vincular un dispositivo físico con la plataforma
export const pairDevice = async (req, res) => {
  try {
    const {
      pairingCode,
      hardwareId,
      deviceType
    } = req.body;

    // Validar datos obligatorios
    if (!pairingCode || !pairingCode.trim()) {
      return res.status(400).json({
        message: 'El código de vinculación es obligatorio'
      });
    }

    if (!hardwareId || !hardwareId.trim()) {
      return res.status(400).json({
        message: 'El identificador del dispositivo es obligatorio'
      });
    }

    if (!deviceType || !deviceType.trim()) {
      return res.status(400).json({
        message: 'El tipo de dispositivo es obligatorio'
      });
    }

    const normalizedCode = pairingCode
      .trim()
      .toUpperCase();

    const normalizedHardwareId = hardwareId
      .trim()
      .toUpperCase();

    const normalizedDeviceType = deviceType
      .trim()
      .toUpperCase();

    // Validar tipo de dispositivo
    if (
      normalizedDeviceType !== 'ESP32' &&
      normalizedDeviceType !== 'ESP8266'
    ) {
      return res.status(400).json({
        message: 'El tipo de dispositivo debe ser ESP32 o ESP8266'
      });
    }

    // Generar hash del código recibido
    const tokenHash = createHash('sha256')
      .update(normalizedCode)
      .digest('hex');

    // Buscar código de vinculación
    const pairingToken =
      await db.orm.public.DevicePairingToken.first({
        tokenHash
      });

    if (!pairingToken) {
      return res.status(404).json({
        message: 'Código de vinculación no válido'
      });
    }

    // Verificar que no haya sido utilizado
    if (pairingToken.usedAt) {
      return res.status(409).json({
        message: 'El código de vinculación ya fue utilizado'
      });
    }

    const now = Temporal.Now.instant();

    // Verificar expiración
    if (
      Temporal.Instant.compare(
        pairingToken.expiresAt,
        now
      ) <= 0
    ) {
      return res.status(410).json({
        message: 'El código de vinculación ha expirado'
      });
    }

    // Buscar dispositivo asociado al código
    const device = await db.orm.public.Device.first({
      id: pairingToken.deviceId
    });

    if (!device) {
      return res.status(404).json({
        message: 'Dispositivo no encontrado'
      });
    }

    // Verificar que esté activo
    if (!device.isActive) {
      return res.status(409).json({
        message: 'El dispositivo está desactivado'
      });
    }

    // No permitir una segunda vinculación
    if (device.isPaired) {
      return res.status(409).json({
        message: 'El dispositivo ya está vinculado'
      });
    }

    // El tipo enviado por el ESP debe coincidir
    // con el registrado previamente en la plataforma
    if (device.deviceType !== normalizedDeviceType) {
      return res.status(409).json({
        message: 'El tipo de dispositivo no coincide con el registrado'
      });
    }

    // Verificar proyecto
    const project = await db.orm.public.Project.first({
      id: device.projectId
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

    // Verificar sala
    const room = await db.orm.public.Room.first({
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

    // Verificar que este hardware no esté registrado
    // en otro dispositivo
    const existingHardware =
      await db.orm.public.Device.first({
        hardwareId: normalizedHardwareId
      });

    if (
      existingHardware &&
      existingHardware.id !== device.id
    ) {
      return res.status(409).json({
        message: 'Este dispositivo físico ya está registrado'
      });
    }

    // Vincular el dispositivo físico
    const pairedDevice =
      await db.orm.public.Device
        .where({
          id: device.id
        })
        .update({
          hardwareId: normalizedHardwareId,
          isPaired: true,
          lastSeenAt: now,
          updatedAt: now
        });

    // Marcar código como utilizado
    await db.orm.public.DevicePairingToken
      .where({
        id: pairingToken.id
      })
      .update({
        usedAt: now
      });

    // Generar credencial permanente para el dispositivo
    const deviceCredential =
      `dev_${randomBytes(32).toString('hex')}`;

    // Guardar únicamente el hash de la credencial
    const credentialHash = createHash('sha256')
      .update(deviceCredential)
      .digest('hex');

    // Registrar la credencial
    await db.orm.public.DeviceCredential.create({
      deviceId: device.id,
      credentialHash
    });

    return res.status(200).json({
      message: 'Dispositivo vinculado correctamente',

      device: {
        id: pairedDevice.id,
        name: pairedDevice.name,
        deviceType: pairedDevice.deviceType,
        hardwareId: pairedDevice.hardwareId,
        isPaired: pairedDevice.isPaired,
        isActive: pairedDevice.isActive,
        lastSeenAt: pairedDevice.lastSeenAt
      },

      credential: deviceCredential
    });

  } catch (error) {
    console.error(
      'Error al vincular dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

export const resetDevicePairing = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Buscar dispositivo
    const device = await db.orm.public.Device.first({
      id: deviceId
    });

    if (!device) {
      return res.status(404).json({
        message: 'Dispositivo no encontrado'
      });
    }

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: device.projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    if (!project.isActive) {
      return res.status(409).json({
        message: 'No se puede reiniciar la vinculación de un proyecto desactivado'
      });
    }

    // Buscar sala
    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se puede reiniciar la vinculación de una sala desactivada'
      });
    }

    // Verificar acceso del usuario a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este dispositivo'
      });
    }

    // Solo OWNER y ADMIN
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para reiniciar la vinculación'
      });
    }

    // Debe estar vinculado
    if (!device.isPaired) {
      return res.status(409).json({
        message: 'El dispositivo no se encuentra vinculado'
      });
    }

    const now = Temporal.Now.instant();

    // Buscar credenciales del dispositivo
    const credentials =
      await db.orm.public.DeviceCredential
        .where({
          deviceId
        })
        .all();

    // Revocar credenciales activas
    for (const credential of credentials) {
      if (!credential.revokedAt) {
        await db.orm.public.DeviceCredential
          .where({
            id: credential.id
          })
          .update({
            revokedAt: now
          });
      }
    }

    // Buscar códigos de vinculación anteriores
    const pairingTokens =
      await db.orm.public.DevicePairingToken
        .where({
          deviceId
        })
        .all();

    // Eliminar códigos anteriores
    for (const pairingToken of pairingTokens) {
      await db.orm.public.DevicePairingToken
        .where({
          id: pairingToken.id
        })
        .delete();
    }

    // Dejar el dispositivo pendiente de vinculación nuevamente
    const updatedDevice =
      await db.orm.public.Device
        .where({
          id: deviceId
        })
        .update({
          hardwareId: null,
          isPaired: false,
          lastSeenAt: null,
          updatedAt: now
        });

    return res.status(200).json({
      message: 'Vinculación reiniciada correctamente',

      device: {
        id: updatedDevice.id,
        name: updatedDevice.name,
        deviceType: updatedDevice.deviceType,
        hardwareId: updatedDevice.hardwareId,
        isPaired: updatedDevice.isPaired,
        isActive: updatedDevice.isActive,
        lastSeenAt: updatedDevice.lastSeenAt
      }
    });

  } catch (error) {
    console.error(
      'Error al reiniciar la vinculación:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};