import express from 'express';
import communityController from '../controllers/communityMemberController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Authenticated users
router.post('/:communityId/join', auth.authMiddleware, communityController.joinCommunity);
router.post('/:communityId/leave', auth.authMiddleware, communityController.leaveCommunity);
router.get('/:communityId', auth.authMiddleware, communityController.listMembers);

// Admin-only route
router.post('/:communityId/:userId/assign-coordinator', auth.authMiddleware, communityController.assignCoordinator);

export default router;
