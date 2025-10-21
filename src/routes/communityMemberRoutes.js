import express from 'express';
import communityController from '../controllers/communityMemberController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Authenticated users
router.post('/:communityId/join', authMiddleware, communityController.joinCommunity);
router.post('/:communityId/leave', authMiddleware, communityController.leaveCommunity);
router.get('/:communityId', authMiddleware, communityController.listMembers);

// Admin-only route
router.patch('/:communityId/:userId/assign-coordinator', authMiddleware, communityController.assignCoordinator);

export default router;
