import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { uploadAnnouncementFiles } from '../middleware/upload.js';
import emergencyController from '../controllers/emergencyController.js';
import emergencyAlertController from '../controllers/emergencyAlertController.js';
import emergencyContactController from '../controllers/emergencyContactController.js';

const router = express.Router();

// All emergency routes require authentication
router.use(authMiddleware);

/**
 * Emergency Announcements/Incident Reports
 */
// Create emergency announcement (any authenticated user)
router.post('/announcements', uploadAnnouncementFiles, emergencyController.createEmergencyAnnouncement);

// Get emergency announcements with filters
router.get('/announcements', emergencyController.getEmergencyAnnouncements);

// Update emergency status (coordinators/admins/assigned users)
router.patch('/announcements/:slug/status', emergencyController.updateEmergencyStatus);

// Assign emergency to coordinator/admin (coordinators/admins only)
router.patch('/announcements/:slug/assign', emergencyController.assignEmergency);

// Get emergency statistics (coordinators/admins only)
router.get('/stats', emergencyController.getEmergencyStats);

/**
 * Emergency Alerts (System-wide)
 */
// Create emergency alert (admins only)
router.post('/alerts', emergencyAlertController.createEmergencyAlert);

// Get active alerts for user
router.get('/alerts', emergencyAlertController.getActiveAlerts);

// Acknowledge alert
router.post('/alerts/:alertId/acknowledge', emergencyAlertController.acknowledgeAlert);

// Cancel alert (admins only)
router.patch('/alerts/:alertId/cancel', emergencyAlertController.cancelAlert);

// Get alert statistics (admins only)
router.get('/alerts/stats', emergencyAlertController.getAlertStats);

/**
 * Emergency Contact Management
 */
// Add emergency contact
router.post('/contacts', emergencyContactController.addEmergencyContact);

// Get user's emergency contacts
router.get('/contacts', emergencyContactController.getEmergencyContacts);

// Update emergency contact
router.put('/contacts/:contactId', emergencyContactController.updateEmergencyContact);

// Delete emergency contact
router.delete('/contacts/:contactId', emergencyContactController.deleteEmergencyContact);

/**
 * Emergency Settings & Status
 */
// Update emergency settings
router.put('/settings', emergencyContactController.updateEmergencySettings);

// Get emergency settings
router.get('/settings', emergencyContactController.getEmergencySettings);

// Update user emergency status
router.patch('/status', emergencyContactController.updateEmergencyStatus);

export default router;