import { catchAsync } from '../middleware/errorHandler.js';
import { sendOK } from '../utils/response.js';

/**
 * Check for notifications
 * GET /notifications/check
 */
export const checkNotifications = catchAsync(async (req, res) => {
  // For now, return empty notifications
  // This can be expanded later to include actual notification logic
  const notifications = [];
  
  sendOK(res, 'Notifications checked successfully', {
    notifications,
    unreadCount: 0
  });
});

export default {
  checkNotifications
};
