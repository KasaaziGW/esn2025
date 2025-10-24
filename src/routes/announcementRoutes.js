import express from 'express';
import announcementController from '../controllers/announcementController.js';
import sessionAuth from '../middleware/sessionAuth.js';
import adminAccess from '../middleware/adminAccess.js';
import upload from '../middleware/upload.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// API Routes for announcement functionality
// Get all announcements (user sees only their community if not admin)
router.get('/list', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, announcementController.getAnnouncements);

// Get today's emergency alerts (must come before /:slug route)
router.get('/emergency/today', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, announcementController.getTodayEmergencyAlerts);

// Get single announcement by ID (for actions)
router.get('/id/:id', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, announcementController.getAnnouncementById);

// Create announcement (coordinator or admin) with attachments
router.post('/', sessionAuth.sessionAuth, upload.uploadAnnouncementFiles, announcementController.createAnnouncement);

// Update announcement by ID (author coordinator or admin)
router.post('/id/:id/update', sessionAuth.sessionAuth, announcementController.updateAnnouncementById);

// Delete announcement by ID
router.post('/id/:id/delete', sessionAuth.sessionAuth, announcementController.deleteAnnouncementById);

// Track announcement view
router.post('/id/:id/view', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, announcementController.trackAnnouncementView);

// Track announcement forward
router.post('/id/:id/forward', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, announcementController.trackAnnouncementForward);

// Citizen announcements view page
router.get('/view', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, async (req, res) => {
  // Check if user has joined any community or is admin
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership || req.user.role === 'admin';

  res.render('announcements', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

// Main announcements page (redirect to view)
router.get('/', sessionAuth.sessionAuth, adminAccess.requireCommunityMembershipOrAdmin, async (req, res) => {
  // Check if user has joined any community or is admin
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership || req.user.role === 'admin';

  res.render('announcements', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

// Coordinator announcements page
router.get('/manage', sessionAuth.sessionAuth, async (req, res) => {
  // Check if user is coordinator
  if (req.user.role !== 'coordinator') {
    return res.status(403).render('error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'Access denied. Coordinator privileges required.'
      }
    });
  }
  
  // Check if user has joined any community (though coordinators are exempt)
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership;
  
  res.render('coordinator-announcements', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

export default router;
