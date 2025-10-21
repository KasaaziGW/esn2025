import express from 'express';
import districtController from '../controllers/districtController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public
 */
router.get('/', districtController.getAllDistricts);     // GET /api/districts?region=<regionKey>
router.get('/:key', districtController.getDistrictByKey); // GET /api/districts/:key

/**
 * Admin-protected
 */
router.post('/', authMiddleware, districtController.createDistrict);   // POST /api/districts
router.patch('/:key', authMiddleware, districtController.updateDistrict); // PATCH /api/districts/:key
router.delete('/:key', authMiddleware, districtController.deleteDistrict); // DELETE /api/districts/:key

export default router;
