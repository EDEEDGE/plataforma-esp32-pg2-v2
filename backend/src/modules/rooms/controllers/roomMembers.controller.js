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

        if (!room.isActive) {
            return res.status(409).json({
                message: 'No se pueden agregar miembros a una sala desactivada'
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

// Cambiar el rol de un miembro dentro de una sala
export const changeMemberRole = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { role } = req.body;

        // Validar rol
        if (!role) {
            return res.status(400).json({
                message: 'El rol es obligatorio'
            });
        }

        const normalizedRole = role.trim().toUpperCase();

        // Solo se permite cambiar entre MEMBER y ADMIN
        if (
            normalizedRole !== 'MEMBER' &&
            normalizedRole !== 'ADMIN'
        ) {
            return res.status(400).json({
                message: 'El rol debe ser MEMBER o ADMIN'
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
        if (!room.isActive) {
            return res.status(409).json({
                message: 'No se pueden modificar roles en una sala desactivada'
            });
        }

        // Buscar la membresía del usuario actual
        const currentMembership =
            await db.orm.public.RoomMember.first({
                roomId: id,
                userId: req.user.id
            });

        if (!currentMembership) {
            return res.status(403).json({
                message: 'No tienes acceso a esta sala'
            });
        }

        // Solo el OWNER puede cambiar roles
        if (currentMembership.role !== 'OWNER') {
            return res.status(403).json({
                message: 'Solo el propietario de la sala puede cambiar roles'
            });
        }

        // Buscar al miembro que se desea modificar
        const targetMembership =
            await db.orm.public.RoomMember.first({
                roomId: id,
                userId
            });

        if (!targetMembership) {
            return res.status(404).json({
                message: 'El usuario no pertenece a esta sala'
            });
        }

        // El OWNER no puede ser modificado desde esta ruta
        if (targetMembership.role === 'OWNER') {
            return res.status(403).json({
                message: 'No se puede modificar el rol del propietario de la sala'
            });
        }

        // Evitar actualización innecesaria
        if (targetMembership.role === normalizedRole) {
            return res.status(409).json({
                message: `El usuario ya tiene el rol ${normalizedRole}`
            });
        }

        // Actualizar rol
        const updatedMembership =
            await db.orm.public.RoomMember
                .where({
                    id: targetMembership.id
                })
                .update({
                    role: normalizedRole
                });

        return res.status(200).json({
            message: 'Rol del miembro actualizado correctamente',

            member: {
                userId: updatedMembership.userId,
                roomId: updatedMembership.roomId,
                role: updatedMembership.role
            }
        });

    } catch (error) {
        console.error(
            'Error al cambiar rol del miembro:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Eliminar un miembro de una sala
export const removeRoomMember = async (req, res) => {
    try {
        const { id, userId } = req.params;

        // Verificar que la sala exista
        const room = await db.orm.public.Room.first({
            id
        });

        if (!room) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        if (!room.isActive) {
            return res.status(409).json({
                message: 'No se pueden eliminar miembros de una sala desactivada'
            });
        }

        // Buscar la membresía del usuario actual
        const currentMembership =
            await db.orm.public.RoomMember.first({
                roomId: id,
                userId: req.user.id
            });

        if (!currentMembership) {
            return res.status(403).json({
                message: 'No tienes acceso a esta sala'
            });
        }

        // Solo OWNER y ADMIN pueden eliminar miembros
        if (
            currentMembership.role !== 'OWNER' &&
            currentMembership.role !== 'ADMIN'
        ) {
            return res.status(403).json({
                message: 'No tienes permisos para eliminar miembros'
            });
        }

        // Buscar al miembro que se desea eliminar
        const targetMembership =
            await db.orm.public.RoomMember.first({
                roomId: id,
                userId
            });

        if (!targetMembership) {
            return res.status(404).json({
                message: 'El usuario no pertenece a esta sala'
            });
        }

        // Nunca eliminar al OWNER desde esta ruta
        if (targetMembership.role === 'OWNER') {
            return res.status(403).json({
                message: 'No se puede eliminar al propietario de la sala'
            });
        }

        // Un ADMIN no puede eliminar a otro ADMIN
        if (
            currentMembership.role === 'ADMIN' &&
            targetMembership.role === 'ADMIN'
        ) {
            return res.status(403).json({
                message: 'Un administrador no puede eliminar a otro administrador'
            });
        }

        // Evitar que el usuario se elimine a sí mismo desde esta ruta
        if (targetMembership.userId === req.user.id) {
            return res.status(400).json({
                message: 'Utiliza la opción para salir de la sala'
            });
        }

        // Eliminar membresía
        await db.orm.public.RoomMember
            .where({
                id: targetMembership.id
            })
            .delete();

        return res.status(200).json({
            message: 'Miembro eliminado correctamente'
        });

    } catch (error) {
        console.error(
            'Error al eliminar miembro de la sala:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Salir voluntariamente de una sala
export const leaveRoom = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la sala exista
        const room = await db.orm.public.Room.first({
            id
        });

        if (!room) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        // Buscar la membresía del usuario actual
        const membership =
            await db.orm.public.RoomMember.first({
                roomId: id,
                userId: req.user.id
            });

        if (!membership) {
            return res.status(404).json({
                message: 'No perteneces a esta sala'
            });
        }

        // El OWNER no puede abandonar la sala
        if (membership.role === 'OWNER') {
            return res.status(403).json({
                message: 'El propietario no puede abandonar la sala'
            });
        }

        // Eliminar su propia membresía
        await db.orm.public.RoomMember
            .where({
                id: membership.id
            })
            .delete();

        return res.status(200).json({
            message: 'Has salido de la sala correctamente'
        });

    } catch (error) {
        console.error(
            'Error al salir de la sala:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};