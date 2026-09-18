import { db } from '../../../prisma/db.ts';

import { randomBytes, createHash } from 'node:crypto';

import { transporter } from '../../../config/mailer.js';

// Enviar invitación para unirse a una sala
export const inviteRoomMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        // Validar correo
        if (!email) {
            return res.status(400).json({
                message: 'El correo electrónico es obligatorio'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Buscar la sala
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
                message: 'No se pueden enviar invitaciones a una sala desactivada'
            });
        }

        // Verificar que quien invita pertenezca a la sala
        const currentMembership = await db.orm.public.RoomMember.first({
            roomId: id,
            userId: req.user.id
        });

        if (!currentMembership) {
            return res.status(403).json({
                message: 'No tienes acceso a esta sala'
            });
        }

        // Solo OWNER y ADMIN pueden invitar
        if (
            currentMembership.role !== 'OWNER' &&
            currentMembership.role !== 'ADMIN'
        ) {
            return res.status(403).json({
                message: 'No tienes permisos para invitar miembros'
            });
        }

        // Evitar invitarse a sí mismo
        if (normalizedEmail === req.user.email.toLowerCase()) {
            return res.status(400).json({
                message: 'Ya perteneces a esta sala'
            });
        }

        // Buscar si existe un usuario con ese correo
        const invitedUser = await db.orm.public.User.first({
            email: normalizedEmail
        });

        // Si existe, verificar que no sea ya miembro
        if (invitedUser) {
            const existingMembership = await db.orm.public.RoomMember.first({
                roomId: id,
                userId: invitedUser.id
            });

            if (existingMembership) {
                return res.status(409).json({
                    message: 'El usuario ya pertenece a esta sala'
                });
            }
        }

        // Buscar invitaciones anteriores
        const previousInvitations =
            await db.orm.public.RoomInvitation
                .where({
                    roomId: id,
                    invitedEmail: normalizedEmail
                })
                .all();

        const now = Temporal.Now.instant();

        // Verificar si ya existe una invitación pendiente
        const activeInvitation = previousInvitations.find((invitation) => {
            return (
                !invitation.acceptedAt &&
                !invitation.rejectedAt &&
                Temporal.Instant.compare(
                    invitation.expiresAt,
                    now
                ) > 0
            );
        });

        if (activeInvitation) {
            return res.status(409).json({
                message: 'Ya existe una invitación pendiente para este correo'
            });
        }

        // Generar token seguro
        const invitationToken = randomBytes(32).toString('hex');

        // Guardar solo el hash del token
        const tokenHash = createHash('sha256')
            .update(invitationToken)
            .digest('hex');

        // Invitación válida por 24 horas
        const expiresAt = now.add({
            hours: 24
        });

        // Crear invitación en la base de datos
        const invitation =
            await db.orm.public.RoomInvitation.create({
                roomId: room.id,
                invitedById: req.user.id,
                invitedEmail: normalizedEmail,
                role: 'MEMBER',
                tokenHash,
                expiresAt
            });

        // Enlace que utilizará el frontend
        const invitationUrl =
            `http://localhost:5173/room-invitation?token=${invitationToken}`;

        // Intentar enviar el correo
        try {
            await transporter.sendMail({
                from: {
                    name: 'Plataforma OTA',
                    address: process.env.MAIL_FROM
                },

                to: normalizedEmail,

                subject: `Invitación a la sala ${room.name}`,

                html: `
          <h2>Invitación a una sala</h2>

          <p>Hola,</p>

          <p>
            ${req.user.firstName} ${req.user.lastName}
            te ha invitado a unirte a la sala:
          </p>

          <h3>${room.name}</h3>

          <p>
            Haz clic en el siguiente enlace para aceptar la invitación:
          </p>

          <p>
            <a href="${invitationUrl}">
              Aceptar invitación
            </a>
          </p>

          <p>
            Esta invitación expirará en 24 horas.
          </p>

          <p>
            Si no esperabas esta invitación,
            puedes ignorar este correo.
          </p>
        `
            });

        } catch (emailError) {

            console.error(
                'Error al enviar correo de invitación:',
                emailError
            );

            // Si falla el correo, eliminar la invitación creada
            await db.orm.public.RoomInvitation
                .where({
                    id: invitation.id
                })
                .delete();

            return res.status(503).json({
                message:
                    'No fue posible enviar el correo de invitación. Inténtalo nuevamente.'
            });
        }

        // Todo salió correctamente
        return res.status(201).json({
            message: 'Invitación enviada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al crear invitación:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Aceptar invitación para unirse a una sala
export const acceptRoomInvitation = async (req, res) => {
    try {
        const { token } = req.body;

        // Validar que venga el token
        if (!token) {
            return res.status(400).json({
                message: 'El token de invitación es obligatorio'
            });
        }

        // Convertir el token recibido al mismo hash guardado en BD
        const tokenHash = createHash('sha256')
            .update(token)
            .digest('hex');

        // Buscar invitación por hash
        const invitation = await db.orm.public.RoomInvitation.first({
            tokenHash
        });

        if (!invitation) {
            return res.status(404).json({
                message: 'Invitación no válida'
            });
        }

        const room = await db.orm.public.Room.first({
            id: invitation.roomId
        });

        if (!room) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        if (!room.isActive) {
            return res.status(409).json({
                message: 'No puedes aceptar una invitación de una sala desactivada'
            });
        }

        // Verificar si ya fue aceptada
        if (invitation.acceptedAt) {
            return res.status(409).json({
                message: 'Esta invitación ya fue aceptada'
            });
        }

        // Verificar si fue rechazada
        if (invitation.rejectedAt) {
            return res.status(409).json({
                message: 'Esta invitación fue rechazada'
            });
        }

        const now = Temporal.Now.instant();

        // Verificar expiración
        if (
            Temporal.Instant.compare(
                invitation.expiresAt,
                now
            ) <= 0
        ) {
            return res.status(410).json({
                message: 'Esta invitación ha expirado'
            });
        }

        // Verificar que la invitación pertenezca
        // al usuario que inició sesión
        const userEmail = req.user.email
            .trim()
            .toLowerCase();

        const invitationEmail = invitation.invitedEmail
            .trim()
            .toLowerCase();

        if (userEmail !== invitationEmail) {
            return res.status(403).json({
                message: 'Esta invitación pertenece a otra cuenta'
            });
        }

        // Verificar que todavía no sea miembro de la sala
        const existingMembership =
            await db.orm.public.RoomMember.first({
                roomId: invitation.roomId,
                userId: req.user.id
            });

        if (existingMembership) {
            return res.status(409).json({
                message: 'Ya perteneces a esta sala'
            });
        }

        // Crear membresía
        const membership =
            await db.orm.public.RoomMember.create({
                roomId: invitation.roomId,
                userId: req.user.id,
                role: invitation.role
            });

        // Marcar invitación como aceptada
        await db.orm.public.RoomInvitation
            .where({
                id: invitation.id
            })
            .update({
                acceptedAt: now
            });

        return res.status(200).json({
            message: 'Invitación aceptada correctamente',

            membership: {
                id: membership.id,
                roomId: membership.roomId,
                role: membership.role,
                createdAt: membership.createdAt
            }
        });

    } catch (error) {
        console.error(
            'Error al aceptar invitación:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Cancelar una invitación pendiente
export const cancelRoomInvitation = async (req, res) => {
    try {
        const { id, invitationId } = req.params;

        // Verificar que la sala exista
        const room = await db.orm.public.Room.first({
            id
        });

        if (!room) {
            return res.status(404).json({
                message: 'Sala no encontrada'
            });
        }

        // Verificar que el usuario pertenezca a la sala
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

        // Solo OWNER y ADMIN pueden cancelar invitaciones
        if (
            currentMembership.role !== 'OWNER' &&
            currentMembership.role !== 'ADMIN'
        ) {
            return res.status(403).json({
                message: 'No tienes permisos para cancelar invitaciones'
            });
        }

        // Buscar la invitación
        const invitation =
            await db.orm.public.RoomInvitation.first({
                id: invitationId
            });

        if (!invitation) {
            return res.status(404).json({
                message: 'Invitación no encontrada'
            });
        }

        // Verificar que la invitación pertenezca a esta sala
        if (invitation.roomId !== id) {
            return res.status(404).json({
                message: 'Invitación no encontrada en esta sala'
            });
        }

        // No permitir cancelar una invitación aceptada
        if (invitation.acceptedAt) {
            return res.status(409).json({
                message: 'La invitación ya fue aceptada'
            });
        }

        // No permitir cancelar una invitación rechazada
        if (invitation.rejectedAt) {
            return res.status(409).json({
                message: 'La invitación ya fue rechazada'
            });
        }

        // Eliminar la invitación pendiente
        await db.orm.public.RoomInvitation
            .where({
                id: invitation.id
            })
            .delete();

        return res.status(200).json({
            message: 'Invitación cancelada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al cancelar invitación:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Rechazar invitación para unirse a una sala
export const rejectRoomInvitation = async (req, res) => {
    try {
        const { token } = req.body;

        // Validar token
        if (!token || !token.trim()) {
            return res.status(400).json({
                message: 'El token de invitación es obligatorio'
            });
        }

        const normalizedToken = token.trim();

        // Convertir el token recibido al hash guardado en BD
        const tokenHash = createHash('sha256')
            .update(normalizedToken)
            .digest('hex');

        // Buscar invitación
        const invitation = await db.orm.public.RoomInvitation.first({
            tokenHash
        });

        if (!invitation) {
            return res.status(404).json({
                message: 'Invitación no válida'
            });
        }

        // Verificar si ya fue aceptada
        if (invitation.acceptedAt) {
            return res.status(409).json({
                message: 'Esta invitación ya fue aceptada'
            });
        }

        // Verificar si ya fue rechazada
        if (invitation.rejectedAt) {
            return res.status(409).json({
                message: 'Esta invitación ya fue rechazada'
            });
        }

        const now = Temporal.Now.instant();

        // Verificar expiración
        if (
            Temporal.Instant.compare(
                invitation.expiresAt,
                now
            ) <= 0
        ) {
            return res.status(410).json({
                message: 'Esta invitación ha expirado'
            });
        }

        // Verificar que el usuario autenticado
        // sea el destinatario de la invitación
        const userEmail = req.user.email
            .trim()
            .toLowerCase();

        const invitationEmail = invitation.invitedEmail
            .trim()
            .toLowerCase();

        if (userEmail !== invitationEmail) {
            return res.status(403).json({
                message: 'Esta invitación pertenece a otra cuenta'
            });
        }

        // Marcar invitación como rechazada
        await db.orm.public.RoomInvitation
            .where({
                id: invitation.id
            })
            .update({
                rejectedAt: now
            });

        return res.status(200).json({
            message: 'Invitación rechazada correctamente'
        });

    } catch (error) {
        console.error(
            'Error al rechazar invitación:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Listar las invitaciones de una sala
export const getRoomInvitations = async (req, res) => {
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

        // Verificar que el usuario pertenezca a la sala
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

        // Solo OWNER y ADMIN pueden ver las invitaciones
        if (
            currentMembership.role !== 'OWNER' &&
            currentMembership.role !== 'ADMIN'
        ) {
            return res.status(403).json({
                message: 'No tienes permisos para consultar las invitaciones'
            });
        }

        // Obtener invitaciones de la sala
        const invitations =
            await db.orm.public.RoomInvitation
                .where({
                    roomId: id
                })
                .all();

        const now = Temporal.Now.instant();

        // Preparar respuesta
        const result = await Promise.all(
            invitations.map(async (invitation) => {

                // Obtener información de quien envió la invitación
                const invitedBy = await db.orm.public.User.first({
                    id: invitation.invitedById
                });

                // Determinar estado
                let status = 'PENDING';

                if (invitation.acceptedAt) {
                    status = 'ACCEPTED';
                } else if (invitation.rejectedAt) {
                    status = 'REJECTED';
                } else if (
                    Temporal.Instant.compare(
                        invitation.expiresAt,
                        now
                    ) <= 0
                ) {
                    status = 'EXPIRED';
                }

                return {
                    id: invitation.id,
                    invitedEmail: invitation.invitedEmail,
                    role: invitation.role,
                    status,

                    invitedBy: invitedBy
                        ? {
                            id: invitedBy.id,
                            username: invitedBy.username,
                            firstName: invitedBy.firstName,
                            lastName: invitedBy.lastName
                        }
                        : null,

                    createdAt: invitation.createdAt,
                    expiresAt: invitation.expiresAt,
                    acceptedAt: invitation.acceptedAt,
                    rejectedAt: invitation.rejectedAt
                };
            })
        );

        return res.status(200).json({
            room: {
                id: room.id,
                name: room.name
            },

            invitations: result
        });

    } catch (error) {
        console.error(
            'Error al obtener invitaciones:',
            error
        );

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};