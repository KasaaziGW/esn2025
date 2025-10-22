import express from 'express';
import { sessionAuth } from '../middleware/sessionAuth.js';
import { requireCommunityMembershipOrAdmin } from '../middleware/adminAccess.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// Public/Community chat page
router.get('/', sessionAuth, requireCommunityMembershipOrAdmin, async (req, res) => {
  // Check if user has joined any community or is an administrator
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership || req.user.role === 'admin';
  
  // For administrators, get a community to display
  let userWithCommunity = req.user;
  if (req.user.role === 'admin') {
    // First check if admin has selected a community in session
    if (req.session.activeCommunity) {
      userWithCommunity = {
        ...req.user,
        community: req.session.activeCommunity
      };
    } else if (!req.user.community) {
      // Fallback to first community if no selection made
      const Community = (await import('../models/Community.js')).default;
      const firstCommunity = await Community.findOne().sort({ createdAt: 1 });
      if (firstCommunity) {
        userWithCommunity = {
          ...req.user,
          community: firstCommunity
        };
      }
    }
  }
  
  res.render('community-chat', {
    user: userWithCommunity,
    hasJoinedCommunity: hasJoinedCommunity,
    activePage: 'public-chat'
  });
});

export default router;
