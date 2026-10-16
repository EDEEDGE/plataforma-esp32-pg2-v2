import { db } from '../../../prisma/db.ts';


// Crear una nueva versión de firmware
export const createFirmwareVersion = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { version, description } = req.body;

    // Validar versión
    if (!version || !version.trim()) {
      return res.status(400).json({
        message: 'La versión es obligatoria'
      });
    }

    const normalizedVersion = version.trim();

    // Formato básico de versión: 1.0.0
    const versionRegex = /^\d+\.\d+\.\d+$/;

    if (!versionRegex.test(normalizedVersion)) {
      return res.status(400).json({
        message: 'La versión debe tener el formato X.Y.Z, por ejemplo 1.0.0'
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

    // El proyecto debe estar activo
    if (!project.isActive) {
      return res.status(409).json({
        message: 'No se pueden crear versiones en un proyecto desactivado'
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

    // La sala debe estar activa
    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se pueden crear versiones en una sala desactivada'
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

    // Solo OWNER y ADMIN
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para crear versiones de firmware'
      });
    }

    // Evitar versiones duplicadas dentro del proyecto
    const existingVersion =
      await db.orm.public.FirmwareVersion.first({
        projectId,
        version: normalizedVersion
      });

    if (existingVersion) {
      return res.status(409).json({
        message: 'Esta versión ya existe en el proyecto'
      });
    }

    // Crear versión
    const firmwareVersion =
      await db.orm.public.FirmwareVersion.create({
        projectId,
        createdById: req.user.id,
        version: normalizedVersion,
        description:
          description?.trim() || null
      });

    return res.status(201).json({
      message: 'Versión de firmware creada correctamente',

      firmwareVersion: {
        id: firmwareVersion.id,
        projectId: firmwareVersion.projectId,
        version: firmwareVersion.version,
        description: firmwareVersion.description,
        isActive: firmwareVersion.isActive,
        createdAt: firmwareVersion.createdAt
      }
    });

  } catch (error) {
    console.error(
      'Error al crear versión de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Listar versiones de firmware de un proyecto
export const getProjectFirmwareVersions = async (req, res) => {
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

    // Obtener versiones
    const firmwareVersions =
      await db.orm.public.FirmwareVersion
        .where({
          projectId
        })
        .all();

    return res.status(200).json({
      message: 'Versiones obtenidas correctamente',

      firmwareVersions: firmwareVersions.map((firmwareVersion) => ({
        id: firmwareVersion.id,
        projectId: firmwareVersion.projectId,
        version: firmwareVersion.version,
        description: firmwareVersion.description,
        isActive: firmwareVersion.isActive,
        createdById: firmwareVersion.createdById,
        createdAt: firmwareVersion.createdAt,
        updatedAt: firmwareVersion.updatedAt
      }))
    });

  } catch (error) {
    console.error(
      'Error al obtener versiones de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Obtener una versión de firmware por ID
export const getFirmwareVersionById = async (req, res) => {
  try {
    const { versionId } = req.params;

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

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: firmwareVersion.projectId
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
        message: 'No tienes acceso a esta versión de firmware'
      });
    }

    return res.status(200).json({
      message: 'Versión de firmware obtenida correctamente',

      firmwareVersion: {
        id: firmwareVersion.id,
        projectId: firmwareVersion.projectId,
        version: firmwareVersion.version,
        description: firmwareVersion.description,
        isActive: firmwareVersion.isActive,
        createdById: firmwareVersion.createdById,
        createdAt: firmwareVersion.createdAt,
        updatedAt: firmwareVersion.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al obtener versión de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Editar una versión de firmware
export const updateFirmwareVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { version, description } = req.body;

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

    // Buscar proyecto
    const project = await db.orm.public.Project.first({
      id: firmwareVersion.projectId
    });

    if (!project) {
      return res.status(404).json({
        message: 'Proyecto no encontrado'
      });
    }

    if (!project.isActive) {
      return res.status(409).json({
        message: 'No se puede editar una versión de un proyecto desactivado'
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
        message: 'No se puede editar una versión de una sala desactivada'
      });
    }

    // Verificar membresía
    const membership = await db.orm.public.RoomMember.first({
      roomId: room.id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta versión'
      });
    }

    // Solo OWNER y ADMIN
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para editar versiones de firmware'
      });
    }

    // Validar versión si se desea modificar
    let normalizedVersion = firmwareVersion.version;

    if (version !== undefined) {
      normalizedVersion = version.trim();

      const versionRegex = /^\d+\.\d+\.\d+$/;

      if (!versionRegex.test(normalizedVersion)) {
        return res.status(400).json({
          message: 'La versión debe tener el formato X.Y.Z, por ejemplo 1.0.0'
        });
      }

      // Revisar duplicados dentro del proyecto
      const existingVersion =
        await db.orm.public.FirmwareVersion.first({
          projectId: firmwareVersion.projectId,
          version: normalizedVersion
        });

      if (
        existingVersion &&
        existingVersion.id !== firmwareVersion.id
      ) {
        return res.status(409).json({
          message: 'Esta versión ya existe en el proyecto'
        });
      }
    }

    // Actualizar
    const updatedFirmwareVersion =
      await db.orm.public.FirmwareVersion
        .where({
          id: versionId
        })
        .update({
          version: normalizedVersion,
          description:
            description !== undefined
              ? description.trim() || null
              : firmwareVersion.description,
          updatedAt: Temporal.Now.instant()
        });

    return res.status(200).json({
      message: 'Versión de firmware actualizada correctamente',

      firmwareVersion: {
        id: updatedFirmwareVersion.id,
        projectId: updatedFirmwareVersion.projectId,
        version: updatedFirmwareVersion.version,
        description: updatedFirmwareVersion.description,
        isActive: updatedFirmwareVersion.isActive,
        createdAt: updatedFirmwareVersion.createdAt,
        updatedAt: updatedFirmwareVersion.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al actualizar versión de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Activar o desactivar una versión de firmware
export const updateFirmwareVersionStatus = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { isActive } = req.body;

    // Validar estado
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'El estado debe ser true o false'
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
        message: 'No se puede cambiar el estado de una versión de un proyecto desactivado'
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
        message: 'No se puede cambiar el estado de una versión de una sala desactivada'
      });
    }

    // Verificar membresía
    const membership =
      await db.orm.public.RoomMember.first({
        roomId: room.id,
        userId: req.user.id
      });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta versión'
      });
    }

    // Solo OWNER y ADMIN
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para cambiar el estado de versiones'
      });
    }

    // Evitar cambio innecesario
    if (firmwareVersion.isActive === isActive) {
      return res.status(409).json({
        message: isActive
          ? 'La versión ya está activa'
          : 'La versión ya está desactivada'
      });
    }

    // Actualizar estado
    const updatedFirmwareVersion =
      await db.orm.public.FirmwareVersion
        .where({
          id: versionId
        })
        .update({
          isActive,
          updatedAt: Temporal.Now.instant()
        });

    return res.status(200).json({
      message: isActive
        ? 'Versión activada correctamente'
        : 'Versión desactivada correctamente',

      firmwareVersion: {
        id: updatedFirmwareVersion.id,
        projectId: updatedFirmwareVersion.projectId,
        version: updatedFirmwareVersion.version,
        description: updatedFirmwareVersion.description,
        isActive: updatedFirmwareVersion.isActive,
        updatedAt: updatedFirmwareVersion.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al cambiar estado de versión de firmware:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};