import express from 'express';
import { sessionAuth } from '../middleware/sessionAuth.js';
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

// Get community chat
router.get('/community/:communityId', sessionAuth, chatController.getCommunityChat);

// Create community chat
router.post('/community', sessionAuth, chatController.createCommunityChat);

// Private chat page
router.get('/', sessionAuth, async (req, res) => {
  // Check if user has joined any community or is an administrator
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership || req.user.role === 'admin';
  
  // If not admin and no community membership, require community membership
  if (!hasJoinedCommunity) {
    return res.redirect('/communities?message=Please join a community first to access this feature.');
  }
  
  res.render('private-chat', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity,
    activePage: 'chat'
  });
});

// Public/Community chat page
router.get('/', sessionAuth, async (req, res) => {
  // Check if user has joined any community or is an administrator
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership || req.user.role === 'admin';
  
  // If not admin and no community membership, require community membership
  if (!hasJoinedCommunity) {
    return res.redirect('/communities?message=Please join a community first to access Public Chat.');
  }
  
  // For administrators, get a community to display
  let userWithCommunity = req.user;
  if (req.user.role === 'admin' && !req.user.community) {
    const Community = (await import('../models/Community.js')).default;
    const firstCommunity = await Community.findOne().sort({ createdAt: 1 });
    if (firstCommunity) {
      userWithCommunity = {
        ...req.user.toObject(),
        community: firstCommunity
      };
    }
  }
  
  res.render('community-chat', {
    user: userWithCommunity,
    hasJoinedCommunity: hasJoinedCommunity,
    activePage: 'public-chat'
  });
});

export default router;
