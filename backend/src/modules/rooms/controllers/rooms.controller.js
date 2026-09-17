import { db } from '../../../prisma/db.ts';

// Crear una nueva sala
export const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validar nombre obligatorio
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre de la sala es obligatorio'
      });
    }

    // Nombre visible
    const normalizedName = name.trim();

    // Nombre interno para controlar duplicados
    const nameKey = normalizedName.toLowerCase();

    // Verificar si el usuario ya tiene una sala con ese nombre
    const existingRoom = await db.orm.public.Room.first({
      ownerId: req.user.id,
      nameKey
    });

    if (existingRoom) {
      return res.status(409).json({
        message: 'Ya tienes una sala registrada con ese nombre'
      });
    }

    // Crear la sala
    const room = await db.orm.public.Room.create({
      name: normalizedName,
      nameKey,
      description: description?.trim() || null,
      ownerId: req.user.id
    });

    // Agregar al creador como OWNER
    await db.orm.public.RoomMember.create({
      roomId: room.id,
      userId: req.user.id,
      role: 'OWNER'
    });

    return res.status(201).json({
      message: 'Sala creada correctamente',
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        ownerId: room.ownerId,
        isActive: room.isActive,
        createdAt: room.createdAt
      }
    });

  } catch (error) {
    console.error('Error al crear sala:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};


// Listar las salas del usuario autenticado
export const getMyRooms = async (req, res) => {
  try {
    // Buscar las membresías del usuario
    const memberships = await db.orm.public.RoomMember
      .where({
        userId: req.user.id
      })
      .all();

    // Obtener la información de cada sala
    const rooms = await Promise.all(
      memberships.map(async (membership) => {

        const room = await db.orm.public.Room.first({
          id: membership.roomId
        });

        if (!room) {
          return null;
        }

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          ownerId: room.ownerId,
          isActive: room.isActive,

          // Rol que este usuario tiene dentro de esta sala
          role: membership.role,

          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        };
      })
    );

    return res.status(200).json({
      rooms: rooms.filter(Boolean)
    });

  } catch (error) {
    console.error('Error al obtener las salas:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Obtener una sala específica
export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId: id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta sala'
      });
    }

    // Buscar la sala
    const room = await db.orm.public.Room.first({
      id
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    return res.status(200).json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        ownerId: room.ownerId,
        isActive: room.isActive,
        role: membership.role,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      }
    });

  } catch (error) {
    console.error('Error al obtener sala:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

// Editar una sala
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validar nombre
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'El nombre de la sala es obligatorio'
      });
    }

    // Buscar la sala
    const room = await db.orm.public.Room.first({
      id
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // Verificar que el usuario pertenezca a la sala
    const membership = await db.orm.public.RoomMember.first({
      roomId: id,
      userId: req.user.id
    });

    if (!membership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta sala'
      });
    }

    // Solo OWNER o ADMIN pueden editar
    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para editar esta sala'
      });
    }

    const normalizedName = name.trim();
    const nameKey = normalizedName.toLowerCase();

    // Verificar que el propietario no tenga otra sala
    // con el mismo nombre
    const existingRoom = await db.orm.public.Room.first({
      ownerId: room.ownerId,
      nameKey
    });

    if (existingRoom && existingRoom.id !== room.id) {
      return res.status(409).json({
        message: 'Ya existe una sala con ese nombre'
      });
    }

    // Actualizar sala
    const updatedRoom = await db.orm.public.Room
      .where({
        id
      })
      .update({
        name: normalizedName,
        nameKey,
        description: description?.trim() || null,
        updatedAt: Temporal.Now.instant()
      });

    return res.status(200).json({
      message: 'Sala actualizada correctamente',
      room: {
        id: updatedRoom.id,
        name: updatedRoom.name,
        description: updatedRoom.description,
        ownerId: updatedRoom.ownerId,
        isActive: updatedRoom.isActive,
        role: membership.role,
        updatedAt: updatedRoom.updatedAt
      }
    });

  } catch (error) {
    console.error('Error al actualizar sala:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};


// Listar los miembros de una sala
export const getRoomMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Comprobar que la sala exista
    const room = await db.orm.public.Room.first({
      id
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // Comprobar que el usuario actual pertenezca a la sala
    const currentMembership = await db.orm.public.RoomMember.first({
      roomId: id,
      userId: req.user.id
    });

    if (!currentMembership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta sala'
      });
    }

    // Obtener las membresías de la sala
    const memberships = await db.orm.public.RoomMember
      .where({
        roomId: id
      })
      .all();

    // Obtener información de cada usuario
    const members = await Promise.all(
      memberships.map(async (membership) => {

        const user = await db.orm.public.User.first({
          id: membership.userId
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: membership.role,
          isActive: user.isActive,
          joinedAt: membership.createdAt
        };
      })
    );

    return res.status(200).json({
      room: {
        id: room.id,
        name: room.name
      },
      members: members.filter(Boolean)
    });

  } catch (error) {
    console.error('Error al obtener miembros de la sala:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};


// Agregar un miembro a una sala
export const addRoomMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'El correo del usuario es obligatorio'
      });
    }

    // Verificar que la sala exista
    const room = await db.orm.public.Room.first({
      id
    });

    if (!room) {
      return res.status(404).json({
        message: 'Sala no encontrada'
      });
    }

    // Verificar permisos del usuario actual dentro de la sala
    const currentMembership = await db.orm.public.RoomMember.first({
      roomId: id,
      userId: req.user.id
    });

    if (!currentMembership) {
      return res.status(403).json({
        message: 'No tienes acceso a esta sala'
      });
    }

    if (
      currentMembership.role !== 'OWNER' &&
      currentMembership.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'No tienes permisos para agregar miembros'
      });
    }

    // Buscar al usuario que se desea agregar
    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.orm.public.User.first({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // No agregar usuarios desactivados
    if (!user.isActive) {
      return res.status(400).json({
        message: 'No se puede agregar un usuario desactivado'
      });
    }

    // Verificar si ya pertenece a la sala
    const existingMembership = await db.orm.public.RoomMember.first({
      roomId: id,
      userId: user.id
    });

    if (existingMembership) {
      return res.status(409).json({
        message: 'El usuario ya pertenece a esta sala'
      });
    }

    // Agregarlo inicialmente como MEMBER
    const membership = await db.orm.public.RoomMember.create({
      roomId: id,
      userId: user.id,
      role: 'MEMBER'
    });

    return res.status(201).json({
      message: 'Usuario agregado correctamente a la sala',
      member: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: membership.role
      }
    });

  } catch (error) {
    console.error('Error al agregar miembro a la sala:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};