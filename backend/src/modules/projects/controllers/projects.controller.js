import { db } from '../../../prisma/db.ts';

// Crear un proyecto dentro de una sala
export const createProject = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;

    // Validar nombre obligatorio
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre del proyecto es obligatorio'
      });
    }

    // Buscar la sala
    const room = await db.orm.public.Room.first({
      id: roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // No permitir crear proyectos en una sala desactivada
    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se pueden crear proyectos en una sala desactivada'
      });
    }

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta sala'
      });
    }

    // Solo OWNER y ADMIN pueden crear proyectos
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para crear proyectos'
      });
    }

    // Normalizar nombre
    const normalizedName = name.trim();
    const nameKey = normalizedName.toLowerCase();

    // Verificar que no exista otro proyecto
    // con el mismo nombre dentro de la sala
    const existingProject = await db.orm.public.Project.first({
      roomId,
      nameKey
    });

    if (existingProject) {
      return res.status(409).json({
        message: 'Ya existe un proyecto con ese nombre en esta sala'
      });
    }

    // Crear proyecto
    const project = await db.orm.public.Project.create({
      roomId,
      createdById: req.user.id,
      name: normalizedName,
      nameKey,
      description: description?.trim() || null
    });

    return res.status(201).json({
      message: 'Proyecto creado correctamente',

      project: {
        id: project.id,
        roomId: project.roomId,
        name: project.name,
        description: project.description,
        createdById: project.createdById,
        isActive: project.isActive,
        createdAt: project.createdAt
      }
    });

  } catch (error) {
    console.error('Error al crear proyecto:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Listar proyectos de una sala
export const getRoomProjects = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verificar que la sala exista
    const room = await db.orm.public.Room.first({
      id: roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta sala'
      });
    }

    // Obtener proyectos de la sala
    const projects = await db.orm.public.Project
      .where({
        roomId
      })
      .all();

    return res.status(200).json({
      room: {
        id: room.id,
        name: room.name
      },

      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        isActive: project.isActive,
        createdById: project.createdById,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error al obtener proyectos:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Obtener un proyecto específico
export const getProjectById = async (req, res) => {
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

    // Verificar que el usuario pertenezca a la sala del proyecto
    const membership = await db.orm.public.RoomMember.first({
      roomId: project.roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    return res.status(200).json({
      project: {
        id: project.id,
        roomId: project.roomId,
        name: project.name,
        description: project.description,
        createdById: project.createdById,
        isActive: project.isActive,
        role: membership.role,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });

  } catch (error) {
    console.error('Error al obtener proyecto:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Editar un proyecto
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    // Validar nombre
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre del proyecto es obligatorio'
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

    // Buscar la sala
    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // No editar proyectos si la sala está desactivada
    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se puede editar un proyecto de una sala desactivada'
      });
    }

    // Verificar membresía
    const membership = await db.orm.public.RoomMember.first({
      roomId: project.roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Solo OWNER y ADMIN pueden editar
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para editar este proyecto'
      });
    }

    const normalizedName = name.trim();
    const nameKey = normalizedName.toLowerCase();

    // Verificar que no exista otro proyecto
    // con el mismo nombre dentro de la sala
    const existingProject = await db.orm.public.Project.first({
      roomId: project.roomId,
      nameKey
    });

    if (
      existingProject &&
      existingProject.id !== project.id
    ) {
      return res.status(409).json({
        message: 'Ya existe un proyecto con ese nombre en esta sala'
      });
    }

    // Actualizar proyecto
    const updatedProject =
      await db.orm.public.Project
        .where({
          id: projectId
        })
        .update({
          name: normalizedName,
          nameKey,
          description: description?.trim() || null,
          updatedAt: Temporal.Now.instant()
        });

    return res.status(200).json({
      message: 'Proyecto actualizado correctamente',

      project: {
        id: updatedProject.id,
        roomId: updatedProject.roomId,
        name: updatedProject.name,
        description: updatedProject.description,
        isActive: updatedProject.isActive,
        updatedAt: updatedProject.updatedAt
      }
    });

  } catch (error) {
    console.error('Error al actualizar proyecto:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Activar o desactivar un proyecto
export const updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { isActive } = req.body;

    // Validar estado
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'El estado del proyecto debe ser true o false'
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

    // Buscar la sala
    const room = await db.orm.public.Room.first({
      id: project.roomId
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // Si la sala está desactivada, no se puede modificar el proyecto
    if (!room.isActive) {
      return res.status(409).json({
        message: 'No se puede cambiar el estado de un proyecto de una sala desactivada'
      });
    }

    // Verificar membresía
    const membership = await db.orm.public.RoomMember.first({
      roomId: project.roomId,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a este proyecto'
      });
    }

    // Solo OWNER y ADMIN pueden cambiar el estado
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para cambiar el estado de este proyecto'
      });
    }

    // Evitar actualización innecesaria
    if (project.isActive === isActive) {
      return res.status(409).json({
        message: isActive
          ? 'El proyecto ya está activo'
          : 'El proyecto ya está desactivado'
      });
    }

    // Actualizar estado
    const updatedProject =
      await db.orm.public.Project
        .where({
          id: projectId
        })
        .update({
          isActive,
          updatedAt: Temporal.Now.instant()
        });

    return res.status(200).json({
      message: isActive
        ? 'Proyecto activado correctamente'
        : 'Proyecto desactivado correctamente',

      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        isActive: updatedProject.isActive,
        updatedAt: updatedProject.updatedAt
      }
    });

  } catch (error) {
    console.error(
      'Error al cambiar estado del proyecto:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};