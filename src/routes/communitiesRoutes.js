import express from 'express';
import sessionAuth from '../middleware/sessionAuth.js';
import CommunityMember from '../models/communityMember.js';
import Community from '../models/Community.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
  //console.log('Generating token for user:', user);
  const payload = { id: user.id || user._id, role: user.role };
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  //console.log('Using JWT secret:', secret ? 'Secret is defined' : 'Secret is undefined');
  return jwt.sign(payload, secret, { expiresIn });
};

// Communities page route and API endpoint
router.get('/communities', sessionAuth.sessionAuth, async (req, res) => {
  try {
    // Check if this is an API request (looking for JSON response)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      // API request - return communities data
      const communities = await Community.find()
        .populate('region', 'name')
        .populate('district', 'name')
        .sort({ createdAt: -1 }); // Sort by creation date, newest first

      // Get member count for each community
      const communitiesWithMemberCount = await Promise.all(communities.map(async (community) => {
        const memberCount = await CommunityMember.countDocuments({ community: community._id });
        return {
          ...community.toObject(),
          memberCount: memberCount
        };
      }));

      res.json({
        status: 'success',
        data: {
          items: communitiesWithMemberCount
        }
      });
    } else {
      // Page request - render the communities page
      // Check if user has joined any community
      const communityMembership = await CommunityMember.findOne({ user: req.user._id });
      const hasJoinedCommunity = !!communityMembership;
      
      const token = generateToken(req.user);
      res.render('communities', {
        user: req.user,
        token: token,
        activePage: 'communities',
        hasJoinedCommunity: hasJoinedCommunity
      });
    }
  } catch (error) {
    console.error('Error in communities route:', error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({
        status: 'error',
        message: 'Error fetching communities'
      });
    } else {
      res.status(500).render('error', {
        title: 'Server Error',
        message: 'Failed to load community information.',
        user: req.user
      });
    }
  }
});

// Admin communities management page route
router.get('/', sessionAuth.sessionAuth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page.',
      user: req.user
    });
  }
  
  console.log('User object:', req.user);
  
  try {
    // Check if user has joined any community (though admins are exempt)
    const communityMembership = await CommunityMember.findOne({ user: req.user._id });
    const hasJoinedCommunity = !!communityMembership;
    
    const token = generateToken(req.user);
    console.log('Generated token:', token);
    
    res.render('admin-communities', {
      user: req.user,
      token: token,
      activePage: 'admin-communities',
      hasJoinedCommunity: hasJoinedCommunity
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to generate authentication token.',
      user: req.user
    });
  }
});

export default router;
