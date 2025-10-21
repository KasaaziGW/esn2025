import express from 'express';
import regionController from '../controllers/regionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public
 */
router.get('/', regionController.getAllRegions);        // GET /api/regions
router.get('/:key', regionController.getRegionByKey);   // GET /api/regions/:key
router.get('/:regionId/districts', regionController.getDistrictsByRegion); // GET /api/regions/:regionId/districts

/**
 * Admin-protected (authMiddleware must set req.user and role)
 */
router.post('/', authMiddleware, regionController.createRegion);    // POST /api/regions
router.patch('/:key', authMiddleware, regionController.updateRegion); // PATCH /api/regions/:key
router.delete('/:key', authMiddleware, regionController.deleteRegion); // DELETE /api/regions/:key

export default router;
