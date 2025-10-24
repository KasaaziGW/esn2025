import CommunityMember from '../models/communityMember.js';
import { sendError } from '../utils/response.js';

/**
 * Middleware to check if user has joined a community
 * Used for routes that require community membership
 */
const requireCommunityMembership = async (req, res, next) => {
  try {
    // Check if user is already in session
    if (!req.session || !req.session.user) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return res.status(401).json({ message: 'No active session' });
      } else {
        return res.redirect('/login');
      }
    }

    // Check if user has joined any community
    const communityMembership = await CommunityMember.findOne({ user: req.user._id });
    
    if (!communityMembership) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return sendError(res, 'Community membership required. Please join a community first.', 403);
      } else {
        // For page routes, redirect to communities page
        return res.redirect('/communities?message=Please join a community first to access this feature.');
      }
    }

    // Add community membership info to request
    req.communityMembership = communityMembership;
    next();
  } catch (error) {
    console.error('Community membership middleware error:', error);
    if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
      return sendError(res, 'Error checking community membership', 500);
    } else {
      return res.redirect('/dashboard');
    }
  }
};

/**
 * Middleware to check if user has completed their profile
 * Used for routes that require profile completion
 */
const requireProfileCompletion = async (req, res, next) => {
  try {
    // Check if user is already in session
    if (!req.session || !req.session.user) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return res.status(401).json({ message: 'No active session' });
      } else {
        return res.redirect('/login');
      }
    }

    // Import User model here to avoid circular dependency
    const User = (await import('../models/User.js')).default;
    
    // Fetch user data to check profile completion
    const user = await User.findById(req.session.user.id)
      .populate('region', 'name')
      .populate('district', 'name')
      .select('username displayName firstName lastName fullName role phone region district');

    if (!user) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return sendError(res, 'User not found', 404);
      } else {
        return res.redirect('/login');
      }
    }

    // Check if profile is complete
    const hasName = user.fullName || (user.firstName && user.lastName);
    const isProfileComplete = user.region && user.district && hasName && user.phone && 
                              user.region !== '' && user.district !== '' && 
                              user.phone !== '' &&
                              user.region !== null && user.district !== null &&
                              user.phone !== null;

    if (!isProfileComplete) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return sendError(res, 'Profile completion required. Please complete your profile first.', 403);
      } else {
        // For page routes, redirect to profile page
        return res.redirect('/users/profile?message=Please complete your profile first.');
      }
    }

    next();
  } catch (error) {
    console.error('Profile completion middleware error:', error);
    if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
      return sendError(res, 'Error checking profile completion', 500);
    } else {
      return res.redirect('/dashboard');
    }
  }
};

export default {
  requireCommunityMembership,
  requireProfileCompletion
};
