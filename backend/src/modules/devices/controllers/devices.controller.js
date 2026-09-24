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















