import express from 'express';
import sessionAuth from '../middleware/sessionAuth.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// Emergency alerts page route
router.get('/', sessionAuth.sessionAuth, async (req, res) => {
  // Check if user has joined any community
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership;
  
  res.render('alerts', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity,
    activePage: 'alerts'
  });
});

export default router;
