import EmergencyAlert from '../models/EmergencyAlert.js';
import User from '../models/User.js';
import Community from '../models/Community.js';
import { getIO } from '../services/Socket.js';
import { catchAsync, NotFoundError, AuthorizationError, ValidationError } from '../middleware/errorHandler.js';
import { sendOK, sendCreated } from '../utils/response.js';

/**
 * Create system-wide emergency alert
 * POST /api/emergency/alerts
 */
export const createEmergencyAlert = catchAsync(async (req, res) => {
  const {
    title,
    message,
    alertType,
    severity,
    priority = 'medium',
    scope,
    affectedRegions = [],
    affectedDistricts = [],
    affectedCommunities = [],
    location,
    locationDescription,
    effectiveFrom,
    effectiveUntil,
    expiresAt,
    deliveryMethod = ['in_app']
  } = req.body;

  const user = req.user;

  // Authorization: Only admins can create system alerts
  if (user.role !== 'admin') {
    throw new AuthorizationError('Only admins can create emergency alerts');
  }

  // Validate required fields
  if (!title || !message || !alertType || !severity || !scope) {
    throw new ValidationError('Title, message, alert type, severity, and scope are required');
  }

  // Validate scope-specific fields
  if (scope === 'regional' && affectedRegions.length === 0) {
    throw new ValidationError('Affected regions required for regional scope');
  }
  if (scope === 'district' && affectedDistricts.length === 0) {
    throw new ValidationError('Affected districts required for district scope');
  }
  if (scope === 'community' && affectedCommunities.length === 0) {
    throw new ValidationError('Affected communities required for community scope');
  }

  const alert = await EmergencyAlert.create({
    title,
    message,
    alertType,
    severity,
    priority,
    scope,
    affectedRegions,
    affectedDistricts,
    affectedCommunities,
    location: location ? {
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    } : undefined,
    locationDescription,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    deliveryMethod,
    createdBy: user._id
  });

  // Emit real-time alert to affected users
  const io = getIO();
  io.emit('alert:new', {
    id: alert._id,
    alertId: alert.alertId,
    title: alert.title,
    message: alert.message,
    alertType: alert.alertType,
    severity: alert.severity,
    scope: alert.scope,
    effectiveFrom: alert.effectiveFrom
  });

  sendCreated(res, 'Emergency alert created successfully', alert);
});

/**
 * Get active emergency alerts for user
 * GET /api/emergency/alerts
 */
export const getActiveAlerts = catchAsync(async (req, res) => {
  const { 
    alertType, 
    severity, 
    scope,
    page = 1, 
    limit = 20,
    sort = '-createdAt'
  } = req.query;

  const user = req.user;
  const now = new Date();

  const filter = {
    status: 'active',
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: { $gte: now } }
    ]
  };

  if (alertType) filter.alertType = alertType;
  if (severity) filter.severity = severity;
  if (scope) filter.scope = scope;

  // Filter alerts that affect this user
  const alerts = await EmergencyAlert.find(filter)
    .sort(sort)
    .populate('createdBy', 'username displayName role')
    .populate('affectedRegions', 'name slug')
    .populate('affectedDistricts', 'name slug')
    .populate('affectedCommunities', 'name slug');

  // Filter alerts that actually affect this user
  const userAlerts = alerts.filter(alert => alert.affectsUser(user));

  const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
  const paginatedAlerts = userAlerts.slice(skip, skip + parseInt(limit, 10));

  sendOK(res, 'Active alerts retrieved successfully', {
    total: userAlerts.length,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    alerts: paginatedAlerts
  });
});

/**
 * Acknowledge emergency alert
 * POST /api/emergency/alerts/:alertId/acknowledge
 */
export const acknowledgeAlert = catchAsync(async (req, res) => {
  const { alertId } = req.params;
  const user = req.user;

  const alert = await EmergencyAlert.findById(alertId);
  if (!alert) throw new NotFoundError('Emergency alert not found');

  // Check if alert affects this user
  if (!alert.affectsUser(user)) {
    throw new AuthorizationError('This alert does not affect you');
  }

  // Check if already acknowledged
  const alreadyAcknowledged = alert.acknowledgedBy.some(
    ack => ack.user.toString() === user._id.toString()
  );

  if (!alreadyAcknowledged) {
    alert.acknowledgedBy.push({
      user: user._id,
      acknowledgedAt: new Date()
    });
    await alert.save();
  }

  sendOK(res, 'Alert acknowledged successfully', {
    alertId: alert.alertId,
    acknowledged: true,
    acknowledgedAt: new Date()
  });
});

/**
 * Cancel emergency alert
 * PATCH /api/emergency/alerts/:alertId/cancel
 */
export const cancelAlert = catchAsync(async (req, res) => {
  const { alertId } = req.params;
  const { cancellationReason } = req.body;
  const user = req.user;

  // Only admins can cancel alerts
  if (user.role !== 'admin') {
    throw new AuthorizationError('Only admins can cancel alerts');
  }

  const alert = await EmergencyAlert.findById(alertId);
  if (!alert) throw new NotFoundError('Emergency alert not found');

  if (alert.status === 'cancelled') {
    throw new ValidationError('Alert is already cancelled');
  }

  alert.status = 'cancelled';
  alert.cancelledBy = user._id;
  alert.cancelledAt = new Date();
  if (cancellationReason) alert.cancellationReason = cancellationReason;

  await alert.save();

  // Emit cancellation notification
  const io = getIO();
  io.emit('alert:cancelled', {
    id: alert._id,
    alertId: alert.alertId,
    title: alert.title,
    cancelledBy: user._id,
    cancelledAt: alert.cancelledAt,
    cancellationReason: alert.cancellationReason
  });

  sendOK(res, 'Alert cancelled successfully', alert);
});

/**
 * Get alert statistics
 * GET /api/emergency/alerts/stats
 */
export const getAlertStats = catchAsync(async (req, res) => {
  const { timeRange = '7d' } = req.query;
  const user = req.user;

  // Only admins can view alert statistics
  if (user.role !== 'admin') {
    throw new AuthorizationError('Only admins can view alert statistics');
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

  const stats = await EmergencyAlert.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byType: { $push: '$alertType' },
        bySeverity: { $push: '$severity' },
        byStatus: { $push: '$status' },
        byScope: { $push: '$scope' }
      }
    }
  ]);

  const result = stats[0] || { total: 0, byType: [], bySeverity: [], byStatus: [], byScope: [] };

  // Count by type
  const typeCounts = {};
  result.byType.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
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

  // Count by scope
  const scopeCounts = {};
  result.byScope.forEach(scope => {
    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
  });

  sendOK(res, 'Alert statistics retrieved successfully', {
    total: result.total,
    byType: typeCounts,
    bySeverity: severityCounts,
    byStatus: statusCounts,
    byScope: scopeCounts,
    timeRange
  });
});

export default {
  createEmergencyAlert,
  getActiveAlerts,
  acknowledgeAlert,
  cancelAlert,
  getAlertStats
};
