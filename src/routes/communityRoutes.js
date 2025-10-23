import express from 'express';
import communityController from '../controllers/communityController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadCommunityBanner } from '../middleware/upload.js';

const router = express.Router();

// Public listing & creation
router.get('/', authMiddleware, communityController.listCommunities);
router.get('/user-communities', authMiddleware, communityController.getUserCommunities);
router.post('/', authMiddleware, uploadCommunityBanner, communityController.createCommunity);

// Single resource
router.get('/:identifier', authMiddleware, communityController.getCommunity);
router.post('/:identifier/update', authMiddleware, uploadCommunityBanner, communityController.updateCommunity);
router.post('/:identifier/delete', authMiddleware, communityController.deleteCommunity);

export default router;
