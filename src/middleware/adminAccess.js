import CommunityMember from '../models/communityMember.js';
import response from '../utils/response.js';

/**
 * Middleware to check if user has joined a community OR is an admin
 * Admins can access all features without community membership
 */
const requireCommunityMembershipOrAdmin = async (req, res, next) => {
  try {
    // Check if user is already in session
    if (!req.session || !req.session.user) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return res.status(401).json({ message: 'No active session' });
      } else {
        return res.redirect('/login');
      }
    }

    // Admins can access everything without community membership
    if (req.user.role === 'admin') {
      // For admins, we'll set a special flag to indicate they have "universal access"
      req.hasUniversalAccess = true;
      req.isAdmin = true;
      next();
      return;
    }

    // For non-admins, check if user has joined any community
    const communityMembership = await CommunityMember.findOne({ user: req.user._id });
    
    if (!communityMembership) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return response.sendError(res, 'Community membership required. Please join a community first.', 403);
      } else {
        // For page routes, redirect to communities page
        return res.redirect('/communities?message=Please join a community first to access this feature.');
      }
    }

    // Add community membership info to request
    req.communityMembership = communityMembership;
    req.hasUniversalAccess = false;
    req.isAdmin = false;
    next();
  } catch (error) {
    console.error('Community membership or admin middleware error:', error);
    if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
      return response.sendError(res, 'Error checking community membership', 500);
    } else {
      return res.redirect('/dashboard');
    }
  }
};

/**
 * Middleware specifically for admin-only features
 * Ensures only admins can access certain routes
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return res.status(401).json({ message: 'No active session' });
      } else {
        return res.redirect('/login');
      }
    }

    if (req.user.role !== 'admin') {
      if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
        return response.sendError(res, 'Admin privileges required', 403);
      } else {
        return res.status(403).render('error', {
          title: 'Access Denied',
          error: {
            status: 403,
            message: 'Access denied. Admin privileges required.'
          }
        });
      }
    }

    req.isAdmin = true;
    req.hasUniversalAccess = true;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
      return response.sendError(res, 'Error checking admin privileges', 500);
    } else {
      return res.redirect('/dashboard');
    }
  }
};

export default {
  requireCommunityMembershipOrAdmin,
  requireAdmin
};
