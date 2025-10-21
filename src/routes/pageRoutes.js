import express from 'express';
import { clearBrowserData } from '../middleware/noCache.js';
import { sessionAuth } from '../middleware/sessionAuth.js';
import { requireCommunityMembership } from '../middleware/communityMembership.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// Landing page route
router.get('/', (req, res) => {
  res.render('landing');
});

// Login page route
router.get('/login', (req, res) => {
  res.render('login');
});

// Register page route
router.get('/register', (req, res) => {
  res.render('signup');
});

// Admin coordinator requests page
router.get('/admin/coordinator-requests', sessionAuth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).render('error', {
      error: {
        status: 403,
        message: 'Access denied. Admin privileges required.'
      }
    });
  }
  
  // Check if user has joined any community (though admins are exempt)
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership;
  
  res.render('admin-coordinator-requests', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

// Coordinator announcements page
router.get('/coordinator/announcements', sessionAuth, async (req, res) => {
  // Check if user is coordinator
  if (req.user.role !== 'coordinator') {
    return res.status(403).render('error', {
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





// Logout page route (handles logout and redirects)
router.get('/logout', clearBrowserData, (req, res) => {
  // If user is logged in, destroy session
  if (req.session && req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      // Redirect to login page
      res.redirect('/login');
    });
  } else {
    // Already logged out, redirect to login
    res.redirect('/login');
  }
});

export default router;
