import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';

/**
 * Check for notifications
 * GET /notifications/check
 */
const checkNotifications = errorHandler.catchAsync(async (req, res) => {
  // For now, return empty notifications
  // This can be expanded later to include actual notification logic
  const notifications = [];
  
  response.sendOK(res, 'Notifications checked successfully', {
    notifications,
    unreadCount: 0
  });
});

export default {
  checkNotifications
};
