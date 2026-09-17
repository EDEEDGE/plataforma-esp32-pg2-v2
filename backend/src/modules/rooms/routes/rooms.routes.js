import express from 'express';

import {
  createRoom,
  getMyRooms,
  getRoomById,
  updateRoom,
  getRoomMembers,
  addRoomMember
} from '../controllers/rooms.controller.js';

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


export default router;