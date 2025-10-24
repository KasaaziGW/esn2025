import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import sessionAuth from '../middleware/sessionAuth.js';
import noCache from '../middleware/noCache.js';

const router = express.Router();

// Dashboard page route (with no-cache to prevent back button access)
router.get('/', noCache.noCache, sessionAuth.sessionAuth, dashboardController.getDashboard);

// Get dashboard data
router.get('/data', sessionAuth.sessionAuth, dashboardController.getDashboardData);

export default router;
