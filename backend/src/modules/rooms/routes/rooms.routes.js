import express from 'express';

import {
  createRoom,
  getMyRooms,
  getRoomById,
  updateRoom
} from '../controllers/rooms.controller.js';

import {
  getRoomMembers,
  addRoomMember
} from '../controllers/roomMembers.controller.js';

import {
  inviteRoomMember,
  acceptRoomInvitation
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

export default router;