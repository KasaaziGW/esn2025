import express from 'express';
import { sessionAuth } from '../middleware/sessionAuth.js';
import { requireCommunityMembershipOrAdmin, requireAdmin } from '../middleware/adminAccess.js';
import chatController from '../controllers/chatController.js';
import { uploadSingleChatFile } from '../middleware/upload.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// API Routes for chat functionality
// Get chat messages
router.get('/:chatId/messages', sessionAuth, chatController.getChatMessages);

// Send message with file upload support
router.post('/:chatId/messages', sessionAuth, (req, res, next) => { 
  uploadSingleChatFile(req, res, function (err) {
    if (err) {
      // Multer error or fileFilter rejection
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    // proceed to controller
    next();
  });
}, chatController.sendMessage);

// Get private chats for current user
router.get('/private', sessionAuth, chatController.getPrivateChats);

// Create new private chat
router.post('/private', sessionAuth, chatController.createPrivateChat);

// Get private chat with specific user
router.get('/private/with/:userId', sessionAuth, chatController.getPrivateChatWithUser);

// Admin routes for multi-community chat (must come before other routes to avoid conflicts)
router.get('/admin/communities', sessionAuth, requireAdmin, chatController.getAllCommunityChats);
router.get('/community/:communityId/messages', sessionAuth, requireAdmin, chatController.getCommunityChatMessages);

// Get community chat
router.get('/community/:communityId', sessionAuth, chatController.getCommunityChat);

// Create community chat
router.post('/community', sessionAuth, chatController.createCommunityChat);

// Private chat page
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
  
  res.render('private-chat', {
    user: userWithCommunity,
    hasJoinedCommunity: hasJoinedCommunity,
    activePage: 'chat'
  });
});


export default router;
