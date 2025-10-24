import express from 'express';
import communityController from '../controllers/communityController.js';
import sessionAuth from '../middleware/sessionAuth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public listing & creation
router.get('/', sessionAuth.sessionAuth, communityController.listCommunities);
router.get('/user-communities', sessionAuth.sessionAuth, communityController.getUserCommunities);
router.post('/', sessionAuth.sessionAuth, upload.uploadCommunityBanner, communityController.createCommunity);

// Single resource
router.get('/:identifier', sessionAuth.sessionAuth, communityController.getCommunity);
router.post('/:identifier/update', sessionAuth.sessionAuth, upload.uploadCommunityBanner, communityController.updateCommunity);
router.post('/:identifier/delete', sessionAuth.sessionAuth, communityController.deleteCommunity);

export default router;
