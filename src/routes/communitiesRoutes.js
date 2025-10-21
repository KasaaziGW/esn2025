import express from 'express';
import { sessionAuth } from '../middleware/sessionAuth.js';
import CommunityMember from '../models/communityMember.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
  console.log('Generating token for user:', user);
  const payload = { id: user.id || user._id, role: user.role };
  console.log('Token payload:', payload);
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  console.log('Using JWT secret:', secret ? 'Secret is defined' : 'Secret is undefined');
  return jwt.sign(payload, secret, { expiresIn });
};

// Communities page route
router.get('/communities', sessionAuth, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching community membership:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to load community information.',
      user: req.user
    });
  }
});

// Admin communities management page route
router.get('/admin/communities', sessionAuth, async (req, res) => {
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
