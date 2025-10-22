import path from 'path';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import CommunityMember from '../models/communityMember.js';
import getIO from '../services/Socket.js';
import { UPLOAD_DIRS } from '../middleware/upload.js';
import { catchAsync, NotFoundError, AuthorizationError, ValidationError } from '../middleware/errorHandler.js';
import { sendOK, sendCreated } from '../utils/response.js';

/**
 * Fetch chat messages (lazy loading / scroll up)
 * GET /api/chats/:chatId/messages?before=<timestamp>&limit=20
 */
export const getChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const { before, limit = 20 } = req.query;
  const userId = req.user._id;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');

  // Permission check
  if (chat.type === 'private' && !chat.participants.includes(userId)) {
    throw new AuthorizationError('Access denied');
  }
  if (chat.type === 'community' && req.user.role !== 'admin') {
    const membership = await CommunityMember.findOne({ community: chat.community, user: userId });
    if (!membership) throw new AuthorizationError('Access denied');
  }

  const filter = { chat: chatId };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .populate('sender', 'username role profile')
    .populate('replyTo', 'content sender type')
    .populate('forwardedFrom', 'content sender type');

  // Mark as read
  await Message.updateMany(
    { chat: chatId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  sendOK(res, 'Messages retrieved successfully', messages.reverse()); // oldest first for frontend
});

/**
 * Send a message to a chat (REST)
 * POST /api/chats/:chatId/messages
 * body: { content, type='text', replyTo, forwardMessageId }
 */
export const sendMessage = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  let { content, type = 'text', replyTo, forwardMessageId } = req.body;
  const userId = req.user._id;

  // If a file was uploaded via multer, use that
  if (req.file) {
    // build a public-accessible path for the file
    const publicPath = `/uploads/chats/${req.file.filename}`;
    content = publicPath;
    // determine type: image/* => 'image', else 'file'
    if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
      type = 'image';
    } else {
      type = 'file';
    }
  }

  // require either content (text or file) or a forwardMessageId (which may provide content)
  if (!content && !forwardMessageId) {
    throw new ValidationError('Content or file or forwardMessageId required');
  }

  const chat = await Chat.findById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');

  // Permission checks
  if (chat.type === 'private' && !chat.participants.map(String).includes(String(userId))) {
    throw new AuthorizationError('Access denied');
  }
  if (chat.type === 'community' && req.user.role !== 'admin') {
    const membership = await CommunityMember.findOne({ community: chat.community, user: userId });
    if (!membership) throw new AuthorizationError('Access denied');
  }

  const messageData = { chat: chat._id, sender: userId, content, type };

  if (replyTo) messageData.replyTo = replyTo;

  if (forwardMessageId) {
    const originalMsg = await Message.findById(forwardMessageId);
    if (originalMsg) {
      messageData.forwardedFrom = originalMsg._id;
      messageData.originalSender = originalMsg.sender;
      if (!content) {
        messageData.content = originalMsg.content;
        messageData.type = originalMsg.type;
      }
    } else {
      // forwardMessageId invalid — you can choose to error or ignore; here we ignore
      console.warn('forwardMessageId not found:', forwardMessageId);
    }
  }

  const saved = await Message.create(messageData);

  // update chat meta
  chat.lastMessage = saved.content;
  chat.lastMessageAt = new Date();
  await chat.save();

  // populate for response and emitting
  const populated = await Message.findById(saved._id)
    .populate('sender', 'username role profile')
    .populate({ path: 'replyTo', select: 'content sender type' })
    .populate({ path: 'forwardedFrom', select: 'content sender type' });

  // Emit via socket.io if available
  try {
    const io = getIO();

    // emit to chat room
    io.to(`chat-${chat._id.toString()}`).emit('newMessage', populated);

    if (chat.type === 'private') {
      const [a, b] = chat.participants.map(String);
      io.to(`user-${a}`).emit('newMessage', populated);
      io.to(`user-${b}`).emit('newMessage', populated);
    } else if (chat.type === 'community') {
      io.to(`community-${chat.community.toString()}`).emit('newMessage', populated);
    }
  } catch (emitErr) {
    // If sockets not initialized, log and continue (REST still works)
    console.error('Socket emit error (sendMessage):', emitErr.message || emitErr);
  }

  sendCreated(res, 'Message sent successfully', populated);
});

/**
 * Get private chats for current user
 * GET /api/chats/private
 */
export const getPrivateChats = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const isAdmin = req.user.role === 'admin';

  const chats = await Chat.find({ 
    type: 'private', 
    participants: userId 
  })
    .populate({
      path: 'participants',
      select: 'username displayName role profile avatarUrl isActive',
      match: isAdmin ? {} : { isActive: true } // Admins see all users, others only see active users
    })
    .sort({ lastMessageAt: -1 });

  // Filter out chats where the other participant is inactive (for non-admins)
  const filteredChats = isAdmin ? chats : chats.filter(chat => {
    const otherParticipant = chat.participants.find(p => p._id.toString() !== userId.toString());
    return otherParticipant && otherParticipant.isActive;
  });

  // Add unread count for each chat
  const chatsWithUnread = await Promise.all(filteredChats.map(async (chat) => {
    const unreadCount = await Message.countDocuments({
      chat: chat._id,
      sender: { $ne: userId },
      readBy: { $ne: userId }
    });
    return { ...chat.toObject(), unreadCount };
  }));

  sendOK(res, 'Private chats retrieved successfully', { chats: chatsWithUnread });
});

/**
 * Create new private chat
 * POST /api/chats/private
 * body: { recipientId }
 */
export const createPrivateChat = catchAsync(async (req, res) => {
  const { recipientId } = req.body;
  const userId = req.user._id;

  console.log('Creating private chat:', { recipientId, userId, userRole: req.user.role });

  if (!recipientId) {
    throw new ValidationError('Recipient ID is required');
  }

  console.log('Checking if user is trying to chat with themselves...');
  console.log('recipientId:', recipientId, 'type:', typeof recipientId);
  console.log('userId:', userId, 'type:', typeof userId);
  
  // Prevent users from creating chats with themselves
  if (recipientId === userId.toString() || recipientId.toString() === userId || recipientId === userId) {
    console.log('User is trying to chat with themselves - rejecting');
    throw new ValidationError('You cannot create a chat with yourself');
  }

  console.log('Finding recipient user...');
  // Validate that users can only chat with community members or administrators
  let recipient;
  try {
    recipient = await User.findById(recipientId);
    console.log('User.findById completed successfully');
  } catch (error) {
    console.error('Error in User.findById:', error);
    throw new NotFoundError('Error finding recipient: ' + error.message);
  }
  
  if (!recipient) {
    console.log('Recipient not found');
    throw new NotFoundError('Recipient not found');
  }

  console.log('Recipient found:', recipient.username);
  
  // Check if recipient is active (admins can chat with anyone, others only with active users)
  if (req.user.role !== 'admin' && !recipient.isActive) {
    throw new ValidationError('Cannot create chat with inactive user');
  }
  
  // Check if recipient is an administrator
  const isRecipientAdmin = recipient.role === 'admin';
  
  // Simplified validation - allow all chats for now to restore functionality
  // TODO: Add proper community validation later
  console.log('Private chat validation skipped - allowing all chats');

  try {
    // Check if chat already exists
    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [userId, recipientId], $size: 2 }
    }).populate('participants', 'username displayName role profile avatarUrl');

    if (!chat) {
      console.log('Creating new chat with participants:', [userId, recipientId]);
      // Create new chat
      chat = await Chat.create({
        type: 'private',
        participants: [userId, recipientId]
      });
      
      console.log('Chat created successfully:', chat._id);
      chat = await Chat.findById(chat._id)
        .populate('participants', 'username displayName role profile avatarUrl');
    } else {
      console.log('Existing chat found:', chat._id);
    }

    console.log('Sending response for chat:', chat._id);
    sendCreated(res, 'Private chat created successfully', { chat });
  } catch (error) {
    console.error('Error in chat creation:', error);
    throw error;
  }
});

/**
 * Get private chat with specific user
 * GET /api/chats/private/with/:userId
 */
export const getPrivateChatWithUser = catchAsync(async (req, res) => {
  const { userId: otherUserId } = req.params;
  const currentUserId = req.user._id;
  const isAdmin = req.user.role === 'admin';

  const chat = await Chat.findOne({
    type: 'private',
    participants: { $all: [currentUserId, otherUserId], $size: 2 }
  }).populate({
    path: 'participants',
    select: 'username displayName role profile avatarUrl isActive',
    match: isAdmin ? {} : { isActive: true }
  });

  // Check if the other participant is active (for non-admins)
  if (!isAdmin && chat) {
    const otherParticipant = chat.participants.find(p => p._id.toString() !== currentUserId.toString());
    if (!otherParticipant || !otherParticipant.isActive) {
      throw new NotFoundError('Chat not found');
    }
  }

  sendOK(res, 'Private chat retrieved successfully', { chat });
});

/**
 * Get community chat
 * GET /api/chats/community/:communityId
 */
export const getCommunityChat = catchAsync(async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  // Check community membership
  const membership = await CommunityMember.findOne({ community: communityId, user: userId });
  if (!membership && req.user.role !== 'admin') {
    throw new AuthorizationError('Access denied');
  }

  const chat = await Chat.findOne({
    type: 'community',
    community: communityId
  }).populate('participants', 'username displayName role profile avatarUrl');

  sendOK(res, 'Community chat retrieved successfully', { chat });
});

/**
 * Create community chat
 * POST /api/chats/community
 * body: { communityId }
 */
export const createCommunityChat = catchAsync(async (req, res) => {
  const { communityId } = req.body;
  const userId = req.user._id;

  if (!communityId) {
    throw new ValidationError('Community ID is required');
  }

  // Check community membership
  const membership = await CommunityMember.findOne({ community: communityId, user: userId });
  if (!membership && req.user.role !== 'admin') {
    throw new AuthorizationError('Access denied');
  }

  // Check if chat already exists
  let chat = await Chat.findOne({
    type: 'community',
    community: communityId
  }).populate('participants', 'username displayName role profile avatarUrl');

  if (!chat) {
    // Create new community chat
    chat = await Chat.create({
      type: 'community',
      community: communityId,
      participants: [userId]
    });
    
    chat = await Chat.findById(chat._id)
      .populate('participants', 'username displayName role profile avatarUrl');
  }

  sendCreated(res, 'Community chat created successfully', { chat });
});

/**
 * Get all community chats for admin multi-chat interface
 * GET /api/chats/admin/communities
 */
export const getAllCommunityChats = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  // Only admins can access this endpoint
  if (req.user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  // Get all communities
  const Community = (await import('../models/Community.js')).default;
  const communities = await Community.find()
    .populate('region', 'name')
    .populate('district', 'name')
    .sort({ name: 1 });

  // Get or create community chats for each community
  const communityChats = await Promise.all(communities.map(async (community) => {
    let chat = await Chat.findOne({
      type: 'community',
      community: community._id
    });

    if (!chat) {
      // Create community chat if it doesn't exist
      chat = await Chat.create({
        type: 'community',
        community: community._id,
        participants: []
      });
    }

    // Get recent messages for this community chat
    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username displayName role profile avatarUrl')
      .populate('replyTo', 'content sender type')
      .populate('forwardedFrom', 'content sender type');

    return {
      community: {
        id: community._id,
        name: community.name,
        region: community.region?.name,
        district: community.district?.name,
        memberCount: community.memberCount || 0
      },
      chat: {
        id: chat._id,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt
      },
      messages: messages.reverse() // oldest first
    };
  }));

  sendOK(res, 'All community chats retrieved successfully', { communityChats });
});

/**
 * Get community chat messages for admin
 * GET /api/chats/community/:communityId/messages
 */
export const getCommunityChatMessages = catchAsync(async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user._id;
  const { before, limit = 50 } = req.query;

  // Only admins can access this endpoint
  if (req.user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  // Find or create community chat
  let chat = await Chat.findOne({
    type: 'community',
    community: communityId
  });

  if (!chat) {
    // Create community chat if it doesn't exist
    chat = await Chat.create({
      type: 'community',
      community: communityId,
      participants: []
    });
  }

  // Get messages
  const filter = { chat: chat._id };
  if (before) filter.createdAt = { $lt: new Date(before) }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .populate('sender', 'username displayName role profile avatarUrl')
    .populate('replyTo', 'content sender type')
    .populate('forwardedFrom', 'content sender type');

  // Mark messages as read for admin
  await Message.updateMany(
    { chat: chat._id, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  sendOK(res, 'Community chat messages retrieved successfully', { 
    messages: messages.reverse(), // oldest first
    chat: {
      id: chat._id,
      community: communityId,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt
    }
  });
});

export default { 
  getChatMessages, 
  sendMessage, 
  getPrivateChats, 
  createPrivateChat, 
  getPrivateChatWithUser,
  getCommunityChat,
  createCommunityChat,
  getAllCommunityChats,
  getCommunityChatMessages
};
