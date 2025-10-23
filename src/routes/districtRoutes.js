import express from 'express';
import districtController from '../controllers/districtController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public
 */
router.get('/', districtController.getAllDistricts);     // GET /districts?region=<regionKey>
router.get('/:key', districtController.getDistrictByKey); // GET /districts/:key

/**
 * Admin-protected
 */
router.post('/', authMiddleware, districtController.createDistrict);   // POST /districts
router.post('/:key/update', authMiddleware, districtController.updateDistrict); // POST /districts/:key/update
router.post('/:key/delete', authMiddleware, districtController.deleteDistrict); // POST /districts/:key/delete

export default router;
