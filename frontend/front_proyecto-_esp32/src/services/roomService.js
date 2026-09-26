import { request } from './http.js';

const normalizeRoom = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description,
  ownerId: room.ownerId,
  isActive: room.isActive,
  role: room.role,
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

export async function getMyRooms() {
  const data = await request('/rooms', {
    auth: true,
    fallbackMessage: 'No se pudieron cargar las salas',
  });

  if (!Array.isArray(data.rooms)) {
    throw new Error('La respuesta del servidor no contiene la lista de salas.');
  }

  return data.rooms.map(normalizeRoom);
}

export async function createRoom(roomData) {
  const data = await request('/rooms', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(roomData),
    fallbackMessage: 'No se pudo crear la sala',
  });

  if (!data.room) {
    throw new Error('La respuesta del servidor no contiene la sala creada.');
  }

  return normalizeRoom({ ...data.room, role: 'OWNER' });
}

export async function getRoomById(roomId) {
  const data = await request(`/rooms/${roomId}`, {
    auth: true,
    fallbackMessage: 'No se pudo cargar la sala',
  });

  if (!data.room) {
    throw new Error('La respuesta del servidor no contiene la sala solicitada.');
  }

  return normalizeRoom(data.room);
}

export async function updateRoom(roomId, roomData) {
  const data = await request(`/rooms/${roomId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(roomData),
    fallbackMessage: 'No se pudo actualizar la sala',
  });

  if (!data.room) {
    throw new Error('La respuesta del servidor no contiene la sala actualizada.');
  }

  return {
    message: data.message,
    room: normalizeRoom(data.room),
  };
}

export async function updateRoomStatus(roomId, isActive) {
  const data = await request(`/rooms/${roomId}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ isActive }),
    fallbackMessage: 'No se pudo cambiar el estado de la sala',
  });

  if (!data.room || typeof data.room.isActive !== 'boolean') {
    throw new Error('La respuesta del servidor no contiene el nuevo estado de la sala.');
  }

  return {
    message: data.message,
    room: data.room,
  };
}

export async function getRoomMembers(roomId) {
  const data = await request(`/rooms/${roomId}/members`, {
    auth: true,
    fallbackMessage: 'No se pudieron cargar los miembros',
  });

  if (!Array.isArray(data.members)) {
    throw new Error('La respuesta del servidor no contiene la lista de miembros.');
  }

  return data.members;
}

export async function getRoomInvitations(roomId) {
  const data = await request(`/rooms/${roomId}/invitations`, {
    auth: true,
    fallbackMessage: 'No se pudieron cargar las invitaciones',
  });

  if (!Array.isArray(data.invitations)) {
    throw new Error('La respuesta del servidor no contiene las invitaciones.');
  }

  return data.invitations;
}

export async function inviteRoomMember(roomId, email) {
  return request(`/rooms/${roomId}/invitations`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ email }),
    fallbackMessage: 'No se pudo enviar la invitación',
  });
}

export async function cancelRoomInvitation(roomId, invitationId) {
  return request(`/rooms/${roomId}/invitations/${invitationId}`, {
    method: 'DELETE',
    auth: true,
    fallbackMessage: 'No se pudo cancelar la invitación',
  });
}

export async function changeRoomMemberRole(roomId, userId, role) {
  const data = await request(`/rooms/${roomId}/members/${userId}/role`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ role }),
    fallbackMessage: 'No se pudo cambiar el rol del miembro',
  });

  if (!data.member) {
    throw new Error('La respuesta del servidor no contiene el miembro actualizado.');
  }

  return data.member;
}

export async function removeRoomMember(roomId, userId) {
  return request(`/rooms/${roomId}/members/${userId}`, {
    method: 'DELETE',
    auth: true,
    fallbackMessage: 'No se pudo eliminar al miembro',
  });
}

export async function leaveRoom(roomId) {
  return request(`/rooms/${roomId}/members/me`, {
    method: 'DELETE',
    auth: true,
    fallbackMessage: 'No se pudo salir de la sala',
  });
}

export async function acceptRoomInvitation(token) {
  return request('/rooms/invitations/accept', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ token }),
    fallbackMessage: 'No se pudo aceptar la invitación',
  });
}

export async function rejectRoomInvitation(token) {
  return request('/rooms/invitations/reject', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ token }),
    fallbackMessage: 'No se pudo rechazar la invitación',
  });
}
