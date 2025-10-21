import Announcement from '../models/Announcement.js';
import EmergencyAlert from '../models/EmergencyAlert.js';
import User from '../models/User.js';
import Community from '../models/Community.js';
import { getIO } from '../services/Socket.js';
import { catchAsync, NotFoundError, AuthorizationError, ValidationError } from '../middleware/errorHandler.js';
import { sendOK, sendCreated } from '../utils/response.js';

/**
 * Create emergency announcement/incident report
 * POST /api/emergency/announcements
 */
export const createEmergencyAnnouncement = catchAsync(async (req, res) => {
  const { 
    title, 
    body, 
    emergencyType, 
    severity = 'medium',
    location,
    locationDescription,
    requiresResponse = false,
    responseDeadline,
    affectedUsers = []
  } = req.body;
  
  const { role, _id, community } = req.user;
  const attachments = req.files?.map(file => `/uploads/announcements/${file.filename}`) || [];

  // Authorization: Any authenticated user can report emergencies
  if (!['citizen', 'coordinator', 'admin'].includes(role)) {
    throw new AuthorizationError('Not authorized to report emergencies');
  }

  // Validate required fields
  if (!title || !emergencyType) {
    throw new ValidationError('Title and emergency type are required');
  }

  const communityId = role === 'admin' ? req.body.community || community : community;
  if (!communityId) {
    throw new ValidationError('Community is required for emergency reports');
  }

  // Create emergency announcement
  const announcement = await Announcement.create({
    community: communityId,
    title,
    body,
    attachments,
    createdBy: _id,
    isEmergency: true,
    emergencyType,
    severity,
    location: location ? {
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    } : undefined,
    locationDescription,
    requiresResponse,
    responseDeadline: responseDeadline ? new Date(responseDeadline) : undefined,
    affectedUsers
  });

  // Emit real-time emergency alert
  const io = getIO();
  io.emit('emergency:new', {
    id: announcement._id,
    slug: announcement.slug,
    title: announcement.title,
    emergencyType: announcement.emergencyType,
    severity: announcement.severity,
    community: announcement.community,
    location: announcement.location,
    requiresResponse: announcement.requiresResponse
  });

  // If critical severity, also emit to all users in the region
  if (severity === 'critical') {
    const community = await Community.findById(communityId).populate('district region');
    io.emit('emergency:critical', {
      id: announcement._id,
      title: announcement.title,
      emergencyType: announcement.emergencyType,
      location: announcement.location,
      region: community.region,
      district: community.district
    });
  }

  sendCreated(res, 'Emergency report created successfully', announcement);
});

/**
 * Get emergency announcements with filters
 * GET /api/emergency/announcements
 */
export const getEmergencyAnnouncements = catchAsync(async (req, res) => {
  const {
    emergencyType,
    severity,
    status = 'active',
    community,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = req.query;

  const filter = { isEmergency: true };
  
  if (emergencyType) filter.emergencyType = emergencyType;
  if (severity) filter.severity = severity;
  if (status) filter.status = status;
  if (community) filter.community = community;

  // If not admin, only show community emergencies
  if (req.user.role !== 'admin' && !community) {
    filter.community = req.user.community;
  }

  const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
  const total = await Announcement.countDocuments(filter);
  
  const announcements = await Announcement.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10))
    .populate('createdBy', 'username displayName role')
    .populate('assignedTo', 'username displayName role')
    .populate('affectedUsers', 'username displayName currentStatus')
    .populate('community', 'name district region');

  sendOK(res, 'Emergency announcements retrieved successfully', {
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    announcements
  });
});

/**
 * Update emergency announcement status
 * PATCH /api/emergency/announcements/:slug/status
 */
export const updateEmergencyStatus = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const { status, resolutionNotes } = req.body;
  const user = req.user;

  const announcement = await Announcement.findOne({ slug, isEmergency: true });
  if (!announcement) throw new NotFoundError('Emergency announcement not found');

  // Authorization: Only coordinators, admins, or assigned users can update
  if (!['coordinator', 'admin'].includes(user.role) && 
      !announcement.assignedTo?.equals(user._id)) {
    throw new AuthorizationError('Not authorized to update this emergency');
  }

  announcement.status = status;
  if (status === 'resolved') {
    announcement.resolvedBy = user._id;
    announcement.resolvedAt = new Date();
    if (resolutionNotes) announcement.resolutionNotes = resolutionNotes;
  }

  await announcement.save();

  // Emit status update
  const io = getIO();
  io.emit('emergency:status_updated', {
    id: announcement._id,
    slug: announcement.slug,
    status: announcement.status,
    resolvedBy: announcement.resolvedBy,
    resolvedAt: announcement.resolvedAt
  });

  sendOK(res, 'Emergency status updated successfully', announcement);
});

/**
 * Assign emergency to coordinator/admin
 * PATCH /api/emergency/announcements/:slug/assign
 */
export const assignEmergency = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const { assignedTo } = req.body;
  const user = req.user;

  // Only admins and coordinators can assign
  if (!['admin', 'coordinator'].includes(user.role)) {
    throw new AuthorizationError('Not authorized to assign emergencies');
  }

  const announcement = await Announcement.findOne({ slug, isEmergency: true });
  if (!announcement) throw new NotFoundError('Emergency announcement not found');

  // Verify assigned user exists and has appropriate role
  const assignedUser = await User.findById(assignedTo);
  if (!assignedUser || !['admin', 'coordinator'].includes(assignedUser.role)) {
    throw new ValidationError('Assigned user must be an admin or coordinator');
  }

  announcement.assignedTo = assignedTo;
  await announcement.save();

  // Emit assignment notification
  const io = getIO();
  io.emit('emergency:assigned', {
    id: announcement._id,
    slug: announcement.slug,
    assignedTo: assignedTo,
    assignedBy: user._id
  });

  sendOK(res, 'Emergency assigned successfully', announcement);
});

/**
 * Get emergency statistics
 * GET /api/emergency/stats
 */
export const getEmergencyStats = catchAsync(async (req, res) => {
  const { community, timeRange = '7d' } = req.query;
  
  const filter = { isEmergency: true };
  if (community) filter.community = community;
  if (req.user.role !== 'admin' && !community) {
    filter.community = req.user.community;
  }

  // Calculate date range
  const now = new Date();
  let startDate;
  switch (timeRange) {
    case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  filter.createdAt = { $gte: startDate };

  const stats = await Announcement.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byType: {
          $push: {
            type: '$emergencyType',
            severity: '$severity',
            status: '$status'
          }
        },
        bySeverity: {
          $push: '$severity'
        },
        byStatus: {
          $push: '$status'
        }
      }
    }
  ]);

  const result = stats[0] || { total: 0, byType: [], bySeverity: [], byStatus: [] };

  // Count by type
  const typeCounts = {};
  result.byType.forEach(item => {
    const key = item.type;
    if (!typeCounts[key]) typeCounts[key] = { total: 0, bySeverity: {} };
    typeCounts[key].total++;
    if (!typeCounts[key].bySeverity[item.severity]) {
      typeCounts[key].bySeverity[item.severity] = 0;
    }
    typeCounts[key].bySeverity[item.severity]++;
  });

  // Count by severity
  const severityCounts = {};
  result.bySeverity.forEach(severity => {
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
  });

  // Count by status
  const statusCounts = {};
  result.byStatus.forEach(status => {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  sendOK(res, 'Emergency statistics retrieved successfully', {
    total: result.total,
    byType: typeCounts,
    bySeverity: severityCounts,
    byStatus: statusCounts,
    timeRange
  });
});

export default {
  createEmergencyAnnouncement,
  getEmergencyAnnouncements,
  updateEmergencyStatus,
  assignEmergency,
  getEmergencyStats
};
