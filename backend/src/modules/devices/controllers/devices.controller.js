import { db } from '../../../prisma/db.ts';
import { randomBytes, createHash } from 'node:crypto';

// Crear un dispositivo dentro de un proyecto
export const createDevice = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, deviceType } = req.body;

    // Validar nombre
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre del dispositivo es obligatorio'
      });
    }

    // Validar tipo de dispositivo
    if (
      deviceType !== 'ESP32' &&
      deviceType !== 'ESP8266'
    ) {
      return res.status(400).json({
        message: 'El tipo de dispositivo debe ser ESP32 o ESP8266'
      });
    }

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    // No registrar dispositivos en proyectos desactivados
    if (!project.isActive) {
      return res.status(409).json({
        message: 'No se pueden registrar dispositivos en un proyecto desactivado'
      });
    }

    // Buscar sala del proyecto
    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // La sala también debe estar activa
    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se pueden registrar dispositivos en una sala desactivada'
      });
    }

    // Verificar membresía
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Solo OWNER y ADMIN pueden registrar dispositivos
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para registrar dispositivos'
      });
    }

    const normalizedName = name.trim();
    const nameKey = normalizedName.toLowerCase();

    // Evitar nombres duplicados dentro del proyecto
    const existingDevice = await db.orm.public.Device.first({
      projectId,
      nameKey
    });

    if (existingDevice) {
      return res.status(409).json({
        message: 'Ya existe un dispositivo con ese nombre en este proyecto'
      });
    }

    // Crear dispositivo pendiente de vinculación
    const device = await db.orm.public.Device.create({
      projectId,
      createdById: req.user.id,
      name: normalizedName,
      nameKey,
      deviceType
    });

    return res.status(201).json({
      message: 'Dispositivo registrado correctamente',

      device: {
        id: device.id,
        projectId: device.projectId,
        name: device.name,
        deviceType: device.deviceType,
        hardwareId: device.hardwareId,
        isPaired: device.isPaired,
        isActive: device.isActive,
        createdAt: device.createdAt
      }
    });

  } catch (error) {
    console.error(
      'Error al registrar dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

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

// Confirmar comunicación del dispositivo con el backend
export const deviceHeartbeat = async (req, res) => {
  try {
    return res.status(200).json({
      message: 'Dispositivo conectado correctamente',

      device: {
        id: req.device.id,
        projectId: req.device.projectId,
        name: req.device.name,
        deviceType: req.device.deviceType,
        hardwareId: req.device.hardwareId
      },

      serverTime: Temporal.Now.instant()
    });

  } catch (error) {
    console.error(
      'Error al procesar heartbeat del dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Listar dispositivos de un proyecto
export const getProjectDevices = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
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

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Obtener dispositivos
    const devices = await db.orm.public.Device
      .where({
        projectId
      })
      .all();

    return res.status(200).json({
      project: {
        id: project.id,
        name: project.name
      },

      devices: devices.map((device) => ({
        id: device.id,
        name: device.name,
        deviceType: device.deviceType,
        hardwareId: device.hardwareId,
        isPaired: device.isPaired,
        isActive: device.isActive,
        lastSeenAt: device.lastSeenAt,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt
      }))
    });

  } catch (error) {
    console.error(
      'Error al obtener dispositivos:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Obtener un dispositivo específico
export const getDeviceById = async (req, res) => {
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

    // Buscar sala
    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
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

    return res.status(200).json({
      device: {
        id: device.id,
        projectId: device.projectId,
        name: device.name,
        deviceType: device.deviceType,
        hardwareId: device.hardwareId,
        isPaired: device.isPaired,
        isActive: device.isActive,
        lastSeenAt: device.lastSeenAt,
        role: membership.role,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al obtener dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Editar un dispositivo
export const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { name, deviceType } = req.body;

    // Validar nombre
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre del dispositivo es obligatorio'
      });
    }

    // Validar tipo
    if (
      deviceType !== 'ESP32' &&
      deviceType !== 'ESP8266'
    ) {
      return res.status(400).json({
        message: 'El tipo de dispositivo debe ser ESP32 o ESP8266'
      });
    }

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

    // No editar si el proyecto está desactivado
    if (!project.isActive) {
      return res.status(409).json({
        message: 'No se puede editar un dispositivo de un proyecto desactivado'
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

    // No editar si la sala está desactivada
    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se puede editar un dispositivo de una sala desactivada'
      });
    }

    // Verificar membresía
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este dispositivo'
      });
    }

    // Solo OWNER y ADMIN pueden editar
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para editar este dispositivo'
      });
    }

    const normalizedName = name.trim();
    const nameKey = normalizedName.toLowerCase();

    // Evitar nombre duplicado dentro del mismo proyecto
    const existingDevice = await db.orm.public.Device.first({
      projectId: device.projectId,
      nameKey
    });

    if (
      existingDevice &&
      existingDevice.id !== device.id
    ) {
      return res.status(409).json({
        message: 'Ya existe un dispositivo con ese nombre en este proyecto'
      });
    }

    // Actualizar
    const updatedDevice =
      await db.orm.public.Device
        .where({
          id: deviceId
        })
        .update({
          name: normalizedName,
          nameKey,
          deviceType,
          updatedAt: Temporal.Now.instant()
        });

    return res.status(200).json({
      message: 'Dispositivo actualizado correctamente',

      device: {
        id: updatedDevice.id,
        projectId: updatedDevice.projectId,
        name: updatedDevice.name,
        deviceType: updatedDevice.deviceType,
        hardwareId: updatedDevice.hardwareId,
        isPaired: updatedDevice.isPaired,
        isActive: updatedDevice.isActive,
        updatedAt: updatedDevice.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al actualizar dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Activar o desactivar un dispositivo
export const updateDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { isActive } = req.body;

    // Validar estado
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'El estado del dispositivo debe ser true o false'
      });
    }

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

    // Buscar sala
    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // Verificar membresía
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este dispositivo'
      });
    }

    // Solo OWNER y ADMIN pueden cambiar estado
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para cambiar el estado del dispositivo'
      });
    }

    // Evitar actualización innecesaria
    if (device.isActive === isActive) {
      return res.status(409).json({
        message: isActive
          ? 'El dispositivo ya está activo'
          : 'El dispositivo ya está desactivado'
      });
    }

    // Actualizar estado
    const updatedDevice =
      await db.orm.public.Device
        .where({
          id: deviceId
        })
        .update({
          isActive,
          updatedAt: Temporal.Now.instant()
        });

    return res.status(200).json({
      message: isActive
        ? 'Dispositivo activado correctamente'
        : 'Dispositivo desactivado correctamente',

      device: {
        id: updatedDevice.id,
        name: updatedDevice.name,
        isActive: updatedDevice.isActive,
        updatedAt: updatedDevice.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al cambiar estado del dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};