import express from 'express';

import {
  createRoom,
  getMyRooms,
  getRoomById,
  updateRoom,
  updateRoomStatus
} from '../controllers/rooms.controller.js';

import {
  getRoomMembers,
  addRoomMember,
  changeMemberRole,
  removeRoomMember,
  leaveRoom
} from '../controllers/roomMembers.controller.js';

import {
  inviteRoomMember,
  acceptRoomInvitation,
  cancelRoomInvitation,
  rejectRoomInvitation,
  getRoomInvitations
} from '../controllers/roomInvitations.controller.js';

import { authMiddleware } from '../../../middlewares/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  createRoom
);

router.get(
  '/',
  authMiddleware,
  getMyRooms
);

router.get(
  '/:id',
  authMiddleware,
  getRoomById
);

router.put(
  '/:id',
  authMiddleware,
  updateRoom
);

router.get(
  '/:id/members',
  authMiddleware,
  getRoomMembers
);

router.post(
  '/:id/members',
  authMiddleware,
  addRoomMember
);

//invitaciones a salas
router.post(
  '/:id/invitations',
  authMiddleware,
  inviteRoomMember
);

//ruta para aceptar las invitaciones enviadas
router.post(
  '/invitations/accept',
  authMiddleware,
  acceptRoomInvitation
);

router.delete(
  '/:id/invitations/:invitationId',
  authMiddleware,
  cancelRoomInvitation
);

router.post(
  '/invitations/reject',
  authMiddleware,
  rejectRoomInvitation
);

router.get(
  '/:id/invitations',
  authMiddleware,
  getRoomInvitations
);

router.patch(
  '/:id/members/:userId/role',
  authMiddleware,
  changeMemberRole
);

router.delete(
  '/:id/members/:userId',
  authMiddleware,
  removeRoomMember
);

router.delete(
  '/:id/members/me',
  authMiddleware,
  leaveRoom
);

router.patch(
  '/:id/status',
  authMiddleware,
  updateRoomStatus
);
export default router;