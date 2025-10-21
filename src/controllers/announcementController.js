import Announcement from '../models/Announcement.js';
import Message from '../models/Message.js';
import { getIO } from '../services/Socket.js';
import path from 'path';
import fs from 'fs';
import { catchAsync, AuthorizationError, NotFoundError } from '../middleware/errorHandler.js';
import { sendCreated, sendOK, sendNotFound } from '../utils/response.js';

/**
 * Create a new announcement
 * Only coordinators and admins can post
 * Supports attachments (array of URLs or uploaded files)
 * Emits 'announcement:new' event via Socket.io
 */
export const createAnnouncement = catchAsync(async (req, res) => {
  const { title, body, community } = req.body;
  const attachments = req.files?.map(file => ({
    url: `/uploads/announcements/${file.filename}`,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  })) || [];
  const { role, _id } = req.user;

  if (!['coordinator', 'admin'].includes(role)) {
    throw new AuthorizationError('Not authorized to post announcements');
  }

  const communityId = role === 'admin' ? community || null : req.user.community;

  // Model will handle slug generation
  const announcement = await Announcement.create({
    title,
    body,
    attachments,
    createdBy: _id,
    community: communityId
  });

  // Emit real-time notification
  const io = getIO();
  io.emit('announcement:new', {
    slug: announcement.slug,
    title: announcement.title,
    community: announcement.community
  });

  sendCreated(res, 'Announcement created successfully', announcement);
});

/**
 * Get all announcements with search and pagination
 * Admin sees all announcements, others only for their community
 * Populates createdBy info
 */
export const getAnnouncements = catchAsync(async (req, res) => {
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
  let query = user.role === 'admin' ? {} : { community: user.community };
  
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
  
  sendOK(res, 'Announcements retrieved successfully', {
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
 * Get today's emergency alerts
 * GET /api/announcements/emergency/today
 * Shows only emergency announcements from active users for today
 */
export const getTodayEmergencyAlerts = catchAsync(async (req, res) => {
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
        return sendOK(res, 'No community assigned', { 
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

    sendOK(res, 'Today\'s emergency alerts retrieved successfully', { 
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
export const getAnnouncementById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const announcement = await Announcement.findById(id)
    .populate({
      path: 'createdBy',
      select: 'username displayName role profile isActive',
      match: user.role === 'admin' ? {} : { isActive: true }
    });

  if (!announcement) throw new NotFoundError('Announcement not found');

  // Check if announcement is from an inactive user (for non-admins)
  if (user.role !== 'admin' && !announcement.createdBy) {
    throw new NotFoundError('Announcement not found');
  }

  sendOK(res, 'Announcement retrieved successfully', announcement);
});




// Update announcement by ID
export const updateAnnouncementById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { title, body, severity, status, isEmergency, pinned } = req.body;
  const { role, _id } = req.user;

  if (!['coordinator', 'admin'].includes(role)) {
    throw new AuthorizationError('Not authorized to update announcements');
  }

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new NotFoundError('Announcement not found');
  }

  // Check if user can edit this announcement
  if (role === 'coordinator' && announcement.createdBy.toString() !== _id) {
    throw new AuthorizationError('You can only edit your own announcements');
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

  sendOK(res, 'Announcement updated successfully', updatedAnnouncement);
});

// Delete announcement by ID
export const deleteAnnouncementById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, _id } = req.user;

  if (!['coordinator', 'admin'].includes(role)) {
    throw new AuthorizationError('Not authorized to delete announcements');
  }

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new NotFoundError('Announcement not found');
  }

  // Check if user can delete this announcement
  if (role === 'coordinator' && announcement.createdBy.toString() !== _id) {
    throw new AuthorizationError('You can only delete your own announcements');
  }

  await Announcement.findByIdAndDelete(id);

  sendOK(res, 'Announcement deleted successfully');
});

// Track announcement view
export const trackAnnouncementView = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new NotFoundError('Announcement not found');
  }

  // Check if user has already viewed this announcement
  if (!announcement.viewers.includes(_id)) {
    announcement.viewers.push(_id);
    announcement.viewCount += 1;
    await announcement.save();
  }

  sendOK(res, 'View tracked successfully', {
    viewCount: announcement.viewCount,
    forwardCount: announcement.forwardCount
  });
});

// Track announcement forward
export const trackAnnouncementForward = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { _id } = req.user;

  const announcement = await Announcement.findById(id);

  if (!announcement) {
    throw new NotFoundError('Announcement not found');
  }

  // Check if user has already forwarded this announcement
  if (!announcement.forwardedBy.includes(_id)) {
    announcement.forwardedBy.push(_id);
    announcement.forwardCount += 1;
    await announcement.save();
  }

  sendOK(res, 'Forward tracked successfully', {
    viewCount: announcement.viewCount,
    forwardCount: announcement.forwardCount
  });
});

export default {
  createAnnouncement,
  getAnnouncements,
  getTodayEmergencyAlerts,
  getAnnouncementById,
  updateAnnouncementById,
  deleteAnnouncementById,
  trackAnnouncementView,
  trackAnnouncementForward
};
