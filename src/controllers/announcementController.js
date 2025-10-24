import Announcement from '../models/Announcement.js';
import Message from '../models/Message.js';
import socketService from '../services/Socket.js';
import path from 'path';
import fs from 'fs';
import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';

/**
 * Create a new announcement
 * POST /announcements
 * Only coordinators and admins can post
 * Supports attachments (array of URLs or uploaded files)
 * Emits 'announcement:new' event via Socket.io
 */
export const createAnnouncement = errorHandler.catchAsync(async (req, res) => {
  const { 
    title, 
    body, 
    community, 
    isEmergency, 
    emergencyType, 
    severity, 
    pinned 
  } = req.body;
  
  const attachments = req.files?.map(file => ({
    url: `/uploads/announcements/${file.filename}`,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  })) || [];
  const { role, _id } = req.user;

  if (!['coordinator', 'admin'].includes(role)) {
    throw new errorHandler.AuthorizationError('Not authorized to post announcements');
  }

  const communityId = role === 'admin' ? community || null : req.user.community;

  // Prepare announcement data
  const announcementData = {
    title,
    body,
    attachments,
    createdBy: _id,
    community: communityId,
    isEmergency: isEmergency === 'true' || isEmergency === true,
    severity: severity || 'medium',
    pinned: pinned === 'true' || pinned === true
  };

  // Add emergency-specific fields if it's an emergency
  if (announcementData.isEmergency && emergencyType) {
    announcementData.emergencyType = emergencyType;
  }

  // Model will handle slug generation
  const announcement = await Announcement.create(announcementData);

  // Emit real-time notification
  const io = socketService.getIO();
  io.emit('announcement:new', {
    slug: announcement.slug,
    title: announcement.title,
    community: announcement.community
  });

  response.sendCreated(res, 'Announcement created successfully', announcement);
});

/**
 * Get all announcements with search and pagination
 * GET /announcements/list
 * Admin sees all announcements, others only for their community
 * Populates createdBy info
 */
export const getAnnouncements = errorHandler.catchAsync(async (req, res) => {
  const user = req.user;
  const { 
    search, 
    page = 1, 
    limit = 10, 
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    emergency,
    status,
    pinned
  } = req.query;
  
  // Base query - admin sees all, others see only their community
  let query = {};
  if (user.role === 'admin') {
    // Admins can see all announcements
    query = {};
  } else if (user.community) {
    // Users with a community can only see their community's announcements
    query = { community: user.community };
  } else {
    // Users without a community should see no announcements
    query = { community: { $exists: false } }; // This will return no results
  }
  
  // Add search functionality
  if (search) {
    query = {
      ...query,
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ]
    };
  }
  
  // Add filter functionality
  if (emergency === 'true') {
    query.isEmergency = true;
  }
  
  if (status) {
    query.status = status;
  }
  
  if (pinned === 'true') {
    query.pinned = true;
  }
  
  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  // Get announcements with pagination
  const announcements = await Announcement.find(query)
    .populate({
      path: 'createdBy',
      select: 'username displayName role profile isActive',
      match: user.role === 'admin' ? {} : { isActive: true } // Admins see all, others only see active users
    })
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Filter out announcements from inactive users (for non-admins)
  const filteredAnnouncements = user.role === 'admin' ? announcements : 
    announcements.filter(announcement => announcement.createdBy);

  // For non-admins, we need to get the actual count of active announcements
  let totalItems;
  if (user.role === 'admin') {
    totalItems = await Announcement.countDocuments(query);
  } else {
    // Count only announcements from active users
    const allAnnouncements = await Announcement.find(query)
      .populate({
        path: 'createdBy',
        select: 'isActive',
        match: { isActive: true }
      });
    totalItems = allAnnouncements.filter(announcement => announcement.createdBy).length;
  }
  
  // Calculate pagination info
  const totalPages = Math.ceil(totalItems / limitNum);
  const hasNext = pageNum < totalPages;
  const hasPrev = pageNum > 1;
  
  response.sendOK(res, 'Announcements retrieved successfully', {
    announcements: filteredAnnouncements,
    pagination: {
      totalItems,
      totalPages,
      currentPage: pageNum,
      pageSize: limitNum,
      hasNext,
      hasPrev,
      nextPage: hasNext ? pageNum + 1 : null,
      prevPage: hasPrev ? pageNum - 1 : null,
      startItem: skip + 1,
      endItem: skip + filteredAnnouncements.length
    }
  });
});

/**
 * Get this week's emergency alerts
 * GET /announcements/emergency/week
 * Shows only emergency announcements from active users for this week
 */
export const getWeekEmergencyAlerts = errorHandler.catchAsync(async (req, res) => {
  try {
    const user = req.user;
    console.log('Getting this week\'s emergency alerts for user:', user._id, 'role:', user.role, 'community:', user.community);
    
    // Get start and end of this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    console.log('Week date range:', startOfWeek, 'to', endOfWeek);
    
    // Base query - admin sees all, others see only their community
    let query = {};
    if (user.role !== 'admin') {
      if (!user.community) {
        console.log('User has no community assigned');
        return response.sendOK(res, 'No community assigned', { 
          alerts: [],
          count: 0
        });
      }
      query.community = user.community;
    }
    
    // Add emergency and date filters
    query.isEmergency = true;
    query.createdAt = { $gte: startOfWeek, $lt: endOfWeek };
    
    console.log('Query:', query);
    
    // Get emergency alerts for this week
    const alerts = await Announcement.find(query)
      .populate({
        path: 'createdBy',
        select: 'username displayName role isActive',
        match: user.role === 'admin' ? {} : { isActive: true } // Admins see all, others only see active users
      })
      .select('title slug createdAt emergencyType severity status')
      .sort({ severity: -1, createdAt: -1 }); // Critical first, then by time

    console.log('Found alerts:', alerts.length);
    console.log('Raw alerts:', JSON.stringify(alerts, null, 2));

    // Filter out alerts from inactive users (for non-admins)
    const filteredAlerts = user.role === 'admin' ? alerts : 
      alerts.filter(alert => alert.createdBy);

    console.log('Filtered alerts:', filteredAlerts.length);

    response.sendOK(res, 'This week\'s emergency alerts retrieved successfully', { 
      alerts: filteredAlerts,
      count: filteredAlerts.length
    });
  } catch (error) {
    console.error('Error in getWeekEmergencyAlerts:', error);
    throw error;
  }
});

/**
 * Get today's emergency alerts
 * GET /announcements/emergency/today
 * Shows only emergency announcements from active users for today
 */
export const getTodayEmergencyAlerts = errorHandler.catchAsync(async (req, res) => {
  try {
    const user = req.user;
    console.log('Getting today\'s emergency alerts for user:', user._id, 'role:', user.role, 'community:', user.community);
    
    // Get start and end of today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    console.log('Date range:', startOfDay, 'to', endOfDay);
    
    // Base query - admin sees all, others see only their community
    let query = {};
    if (user.role !== 'admin') {
      if (!user.community) {
        console.log('User has no community assigned');
        return response.sendOK(res, 'No community assigned', { 
          alerts: [],
          count: 0
        });
      }
      query.community = user.community;
    }
    
    // Add emergency and date filters
    query.isEmergency = true;
    query.createdAt = { $gte: startOfDay, $lt: endOfDay };
    
    console.log('Query:', query);
    
    // Get emergency alerts for today
    const alerts = await Announcement.find(query)
      .populate({
        path: 'createdBy',
        select: 'username displayName role isActive',
        match: user.role === 'admin' ? {} : { isActive: true } // Admins see all, others only see active users
      })
      .select('title slug createdAt emergencyType severity status')
      .sort({ severity: -1, createdAt: -1 }); // Critical first, then by time

    console.log('Found alerts:', alerts.length);

    // Filter out alerts from inactive users (for non-admins)
    const filteredAlerts = user.role === 'admin' ? alerts : 
      alerts.filter(alert => alert.createdBy);

    console.log('Filtered alerts:', filteredAlerts.length);

    response.sendOK(res, 'Today\'s emergency alerts retrieved successfully', { 
      alerts: filteredAlerts,
      count: filteredAlerts.length
    });
  } catch (error) {
    console.error('Error in getTodayEmergencyAlerts:', error);
    throw error;
  }
});


/**
 * Get single announcement by ID
 * Populates createdBy info
 */
export const getAnnouncementById = errorHandler.catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const announcement = await Announcement.findById(id)
    .populate({
      path: 'createdBy',
      select: 'username displayName role profile isActive',
      match: user.role === 'admin' ? {} : { isActive: true }
    });

  if (!announcement) throw new errorHandler.NotFoundError('Announcement not found');

  // Check if announcement is from an inactive user (for non-admins)
  if (user.role !== 'admin' && !announcement.createdBy) {
    throw new errorHandler.NotFoundError('Announcement not found');
  }

  response.sendOK(res, 'Announcement retrieved successfully', announcement);
});




/**
 * Update announcement by ID
 * POST /announcements/id/:id/update
 */
export const updateAnnouncementById = errorHandler.catchAsync(async (req, res) => {
  const { id } = req.params;
  const { title, body, severity, status, isEmergency, pinned } = req.body;
  const { role, _id } = req.user;

  if (!['coordinator', 'admin'].includes(role)) {
    throw new errorHandler.AuthorizationError('Not authorized to update announcements');
  }

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new errorHandler.NotFoundError('Announcement not found');
  }

  // Check if user can edit this announcement
  if (role === 'coordinator' && announcement.createdBy.toString() !== _id) {
    throw new errorHandler.AuthorizationError('You can only edit your own announcements');
  }

  // Update the announcement
  const updatedAnnouncement = await Announcement.findByIdAndUpdate(
    id,
    {
      title,
      body,
      severity,
      status,
      isEmergency: isEmergency === 'true' || isEmergency === true,
      pinned: pinned === 'true' || pinned === true
    },
    { new: true, runValidators: true }
  ).populate('createdBy', 'username displayName role profile');

  response.sendOK(res, 'Announcement updated successfully', updatedAnnouncement);
});

/**
 * Delete announcement by ID
 * POST /announcements/id/:id/delete
 */
export const deleteAnnouncementById = errorHandler.catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, _id } = req.user;

  if (!['coordinator', 'admin'].includes(role)) {
    throw new errorHandler.AuthorizationError('Not authorized to delete announcements');
  }

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new errorHandler.NotFoundError('Announcement not found');
  }

  // Check if user can delete this announcement
  if (role === 'coordinator' && announcement.createdBy.toString() !== _id) {
    throw new errorHandler.AuthorizationError('You can only delete your own announcements');
  }

  await Announcement.findByIdAndDelete(id);

  response.sendOK(res, 'Announcement deleted successfully');
});

// Track announcement view
export const trackAnnouncementView = errorHandler.catchAsync(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new errorHandler.NotFoundError('Announcement not found');
  }

  // Check if user has already viewed this announcement
  if (!announcement.viewers.includes(_id)) {
    announcement.viewers.push(_id);
    announcement.viewCount += 1;
    await announcement.save();
  }

  response.sendOK(res, 'View tracked successfully', {
    viewCount: announcement.viewCount,
    forwardCount: announcement.forwardCount
  });
});

// Track announcement forward
export const trackAnnouncementForward = errorHandler.catchAsync(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new errorHandler.NotFoundError('Announcement not found');
  }

  // Check if user has already forwarded this announcement
  if (!announcement.forwardedBy.includes(_id)) {
    announcement.forwardedBy.push(_id);
    announcement.forwardCount += 1;
    await announcement.save();
  }

  response.sendOK(res, 'Forward tracked successfully', {
    viewCount: announcement.viewCount,
    forwardCount: announcement.forwardCount
  });
});

/**
 * Forward announcement to chat
 * POST /announcements/forward
 * Forwards an announcement to either public community chat or private chat
 */
export const forwardAnnouncement = errorHandler.catchAsync(async (req, res) => {
  const { announcementId, chatType, targetUserId } = req.body;
  const { _id: senderId, community: userCommunity } = req.user;

  if (!announcementId || !chatType) {
    throw new errorHandler.ValidationError('Announcement ID and chat type are required');
  }

  // Get the announcement
  const announcement = await Announcement.findById(announcementId).populate('createdBy', 'displayName username');
  
  if (!announcement) {
    throw new errorHandler.NotFoundError('Announcement not found');
  }

  // Check if user has permission to forward this announcement
  // Users can forward announcements from their community
  if (announcement.community.toString() !== userCommunity.toString()) {
    throw new errorHandler.AuthorizationError('You can only forward announcements from your community');
  }

  let chatId;
  let messageContent;

  if (chatType === 'public') {
    // Forward to public community chat
    chatId = userCommunity;
    messageContent = `📢 **Forwarded Announcement**\n\n**${announcement.title}**\n\n${announcement.body.substring(0, 200)}${announcement.body.length > 200 ? '...' : ''}\n\n*Originally posted by ${announcement.createdBy.displayName || announcement.createdBy.username}*\n\n[Read full announcement](http://localhost:5000/announcements)`;
  } else if (chatType === 'private') {
    // Forward to private chat
    if (!targetUserId) {
      throw new errorHandler.ValidationError('Target user ID is required for private chat');
    }
    
    // Find or create private chat between sender and target user
    const Chat = (await import('../models/Chat.js')).default;
    let privateChat = await Chat.findOne({
      type: 'private',
      participants: { $all: [senderId, targetUserId] }
    });

    if (!privateChat) {
      // Create new private chat
      privateChat = await Chat.create({
        type: 'private',
        participants: [senderId, targetUserId],
        createdBy: senderId
      });
    }

    chatId = privateChat._id;
    messageContent = `📢 **Forwarded Announcement**\n\n**${announcement.title}**\n\n${announcement.body.substring(0, 200)}${announcement.body.length > 200 ? '...' : ''}\n\n*Originally posted by ${announcement.createdBy.displayName || announcement.createdBy.username}*\n\n[Read full announcement](http://localhost:5000/announcements)`;
  } else {
    throw new errorHandler.ValidationError('Invalid chat type. Must be "public" or "private"');
  }

  // Create the forwarded message
  const forwardedMessage = await Message.create({
    chat: chatId,
    sender: senderId,
    content: messageContent,
    type: 'text',
    forwardedAnnouncement: announcementId,
    originalSender: announcement.createdBy._id
  });

  // Update announcement forward count
  if (!announcement.forwardedBy.includes(senderId)) {
    announcement.forwardedBy.push(senderId);
    announcement.forwardCount += 1;
    await announcement.save();
  }

  // Emit socket event to notify users
  const io = socketService.getIO();
  if (chatType === 'public') {
    io.to(`community-${userCommunity}`).emit('message:new', {
      message: forwardedMessage,
      chatId: chatId
    });
  } else {
    // Emit to both participants in private chat
    io.to(`user-${senderId}`).emit('message:new', {
      message: forwardedMessage,
      chatId: chatId
    });
    io.to(`user-${targetUserId}`).emit('message:new', {
      message: forwardedMessage,
      chatId: chatId
    });
  }

  response.sendOK(res, 'Announcement forwarded successfully', {
    messageId: forwardedMessage._id,
    chatId: chatId,
    chatType: chatType
  });
});

export default {
  createAnnouncement,
  getAnnouncements,
  getWeekEmergencyAlerts,
  getTodayEmergencyAlerts,
  getAnnouncementById,
  updateAnnouncementById,
  deleteAnnouncementById,
  trackAnnouncementView,
  trackAnnouncementForward,
  forwardAnnouncement
};
