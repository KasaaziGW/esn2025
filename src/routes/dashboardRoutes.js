import express from 'express';
import { getDashboardData, getDashboard } from '../controllers/dashboardController.js';
import { sessionAuth } from '../middleware/sessionAuth.js';
import { noCache } from '../middleware/noCache.js';

const router = express.Router();

// Dashboard page route (with no-cache to prevent back button access)
router.get('/', noCache, sessionAuth, getDashboard);

// Get dashboard data
router.get('/data', sessionAuth, getDashboardData);

export default router;
