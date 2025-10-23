import express from 'express';
import regionController from '../controllers/regionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public
 */
router.get('/', regionController.getAllRegions);        // GET /regions
router.get('/:key', regionController.getRegionByKey);   // GET /regions/:key
router.get('/:regionId/districts', regionController.getDistrictsByRegion); // GET /regions/:regionId/districts

/**
 * Admin-protected (authMiddleware must set req.user and role)
 */
router.post('/', authMiddleware, regionController.createRegion);    // POST /regions
router.post('/:key/update', authMiddleware, regionController.updateRegion); // POST /regions/:key/update
router.post('/:key/delete', authMiddleware, regionController.deleteRegion); // POST /regions/:key/delete

export default router;
