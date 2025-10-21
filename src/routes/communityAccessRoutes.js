import express from 'express';
import communityAccessController from '../controllers/communityAccessController.js';
import { sessionAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// All routes require authentication
router.use(sessionAuth);

// Get communities available to user based on their location
router.get('/available', communityAccessController.getAvailableCommunities);

// Get user communities (session-based version of user-communities)
router.get('/user-communities', communityAccessController.getUserCommunities);

// Join a community
router.post('/join/:communityId', communityAccessController.joinCommunity);

// Leave current community
router.post('/leave', communityAccessController.leaveCommunity);

// Get user's current community details
router.get('/my-community', communityAccessController.getMyCommunity);

// Get community members
router.get('/members', communityAccessController.getCommunityMembers);

// Get online members
router.get('/online-members', communityAccessController.getOnlineMembers);

// Check if user can access communities
router.get('/access-status', communityAccessController.checkCommunityAccess);

// Temporary endpoint to inspect database state
router.get('/inspect-db', communityAccessController.inspectDatabaseState);

export default router;
