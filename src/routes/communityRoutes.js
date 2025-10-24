import express from 'express';
import communityController from '../controllers/communityController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public listing & creation
router.get('/', auth.authMiddleware, communityController.listCommunities);
router.get('/user-communities', auth.authMiddleware, communityController.getUserCommunities);
router.post('/', auth.authMiddleware, upload.uploadCommunityBanner, communityController.createCommunity);

// Single resource
router.get('/:identifier', auth.authMiddleware, communityController.getCommunity);
router.post('/:identifier/update', auth.authMiddleware, upload.uploadCommunityBanner, communityController.updateCommunity);
router.post('/:identifier/delete', auth.authMiddleware, communityController.deleteCommunity);

export default router;
