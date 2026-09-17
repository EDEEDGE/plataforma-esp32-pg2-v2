import { db } from '../../../prisma/db.ts';


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