import express from 'express';
import sessionAuth from '../middleware/sessionAuth.js';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Session-based notification routes
router.get('/check', sessionAuth.sessionAuth, notificationController.checkNotifications);

export default router;
