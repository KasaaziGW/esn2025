import express from 'express';
import communityController from '../controllers/communityController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadCommunityBanner } from '../middleware/upload.js';

const router = express.Router();

/**
 * Routes:
 * GET    /communities           -> list (supports query filters)
 * POST   /communities           -> create
 * GET    /communities/:identifier -> get by id | slug | publicId
 * PUT    /communities/:identifier -> update (identifier can be id/slug/publicId)
 * DELETE /communities/:identifier -> delete
 * PATCH  /communities/:identifier/members -> modify members count
 */

// Public listing & creation
router.get('/', authMiddleware, communityController.listCommunities);
router.get('/user-communities', authMiddleware, communityController.getUserCommunities);
router.post('/', authMiddleware, uploadCommunityBanner, communityController.createCommunity);

// Single resource
router.get('/:identifier', authMiddleware, communityController.getCommunity);
router.put('/:identifier', authMiddleware, uploadCommunityBanner, communityController.updateCommunity);
router.delete('/:identifier', authMiddleware, communityController.deleteCommunity);

export default router;
