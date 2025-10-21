import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { sessionAuth } from '../middleware/sessionAuth.js';
import * as userController from '../controllers/userController.js';
import User from '../models/User.js';
import CommunityMember from '../models/communityMember.js';
import { uploadProfilePhoto } from '../middleware/upload.js';

const router = express.Router();

// Admin page route (uses session authentication) - must be before authMiddleware
router.get('/admin', sessionAuth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  // Check if user has joined any community (though admins are exempt)
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership;
  
  res.render('admin-users', {
    title: 'User Management - Emergency Social Network',
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

// Session-based admin routes (for web interface) - must be before JWT middleware
const sessionAdminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Profile page route (session-based)
router.get('/profile', sessionAuth, async (req, res) => {
  try {
    // Fetch complete user data from database with populated region and district
    const user = await User.findById(req.user.id)
      .populate('region', 'name')
      .populate('district', 'name');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    // Check if user has joined any community
    const communityMembership = await CommunityMember.findOne({ user: user._id });
    const hasJoinedCommunity = !!communityMembership;
    
    res.render('user-profile', {
      title: 'My Profile - Emergency Social Network',
      user: user,
      activePage: 'profile',
      hasJoinedCommunity: hasJoinedCommunity
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load profile' });
  }
});

// Profile update route (session-based)
router.put('/profile', sessionAuth, userController.updateProfile);

// Avatar upload routes (session-based)
router.post('/profile/avatar', sessionAuth, uploadProfilePhoto, userController.uploadAvatar);
router.delete('/profile/avatar', sessionAuth, userController.removeAvatar);

// Session-based admin routes (for web interface)
router.get('/', sessionAuth, sessionAdminOnly, userController.getAllUsers);
router.get('/stats', sessionAuth, sessionAdminOnly, userController.getUserStats);
router.get('/export', sessionAuth, sessionAdminOnly, userController.exportUsers);
router.post('/', sessionAuth, sessionAdminOnly, userController.createUser);
router.get('/:id', sessionAuth, sessionAdminOnly, userController.getUserById);
router.put('/:id', sessionAuth, sessionAdminOnly, userController.updateUserByAdmin);
router.put('/:id/status', sessionAuth, sessionAdminOnly, userController.updateUserStatus);
router.put('/:id/password', sessionAuth, sessionAdminOnly, userController.changeUserPassword);
router.delete('/:id', sessionAuth, sessionAdminOnly, userController.deleteUser);

// Protected routes (JWT authentication for API)
router.use(authMiddleware);

// Current user profile
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

// Directory of users
router.get('/', userController.getAllUsers);
router.get('/user/:id', userController.getUserById);

// Admin routes (require admin role)
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export default router;
