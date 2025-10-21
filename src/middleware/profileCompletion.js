import { catchAsync } from './errorHandler.js';
import User from '../models/User.js';
import { ValidationError } from './errorHandler.js';

/**
 * Middleware to check if user has completed their profile
 * Redirects to profile completion if not complete
 */
export const requireProfileCompletion = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const user = await User.findById(userId).select('region district firstName lastName phone');
  if (!user) {
    throw new ValidationError('User not found');
  }

  const profileComplete = !!(user.region && user.district && user.firstName && user.lastName && user.phone);
  
  if (!profileComplete) {
    return res.status(403).json({
      success: false,
      message: 'Please complete your profile before accessing this feature.',
      redirectTo: '/users/profile',
      profileComplete: false,
      missingFields: {
        region: !user.region,
        district: !user.district,
        firstName: !user.firstName,
        lastName: !user.lastName,
        phone: !user.phone
      }
    });
  }

  req.userProfileComplete = true;
  next();
});

/**
 * Middleware to check profile completion but allow access with warning
 */
export const checkProfileCompletion = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const user = await User.findById(userId).select('region district firstName lastName phone');
  if (!user) {
    throw new ValidationError('User not found');
  }

  const profileComplete = !!(user.region && user.district && user.firstName && user.lastName && user.phone);
  
  req.userProfileComplete = profileComplete;
  req.userProfileData = {
    region: user.region,
    district: user.district,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone
  };
  
  next();
});

export default {
  requireProfileCompletion,
  checkProfileCompletion
};
