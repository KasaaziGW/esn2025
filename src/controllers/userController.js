import User from '../models/User.js';
import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import initAdmin from '../utils/initAdmin.js';
import path from 'path';
import fs from 'fs';
// import { emitUserCreated, emitUserUpdated, emitUserDeleted, emitUserStatusChanged, emitUserPasswordChanged, emitUserStatsUpdated } from '../services/Socket.js';

/**
 * Get current authenticated user profile
 * GET /users/me
 */
export const getMe = errorHandler.catchAsync(async (req, res) => {
  const user = req.user; // set by authMiddleware
  if (!user) throw new errorHandler.NotFoundError('User not found');

  response.sendOK(res, 'User profile retrieved successfully', user);
});

/**
 * Update current authenticated user profile (self-update)
 * POST /users/me
 */
export const updateMe = errorHandler.catchAsync(async (req, res) => {
  // Get user ID from session
  const userId = req.user.id;
  
  // Fetch the actual user document from database
  const user = await User.findById(userId);
  if (!user) {
    throw new errorHandler.NotFoundError('User not found');
  }

  // Fields user is allowed to update
  const allowedFields = [
    'displayName',
    'firstName',
    'lastName',
    'avatarUrl',
    'bio',
    'email',
    'phone',
    'currentStatus',
    'location',
    'region',
    'district',
    'tags'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Validate GeoJSON location
  if (updates.location) {
    const loc = updates.location;
    if (
      !loc.type || loc.type !== 'Point' ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length !== 2
    ) {
      throw new errorHandler.ValidationError('Invalid location format. Must be GeoJSON Point with coordinates [lng, lat]');
    }
  }

  // Validate region and district
  if (updates.region && updates.region.trim() === '') {
    throw new errorHandler.ValidationError('Region cannot be empty');
  }
  if (updates.district && updates.district.trim() === '') {
    throw new errorHandler.ValidationError('District cannot be empty');
  }

  Object.assign(user, updates);
  await user.save();

  // Check profile completeness — user must complete before joining community
  const profileComplete =
    user.region && user.district && user.firstName && user.lastName && user.phone;

  response.sendOK(res, 'Profile updated successfully', {
    user,
    profileComplete,
    nextStep: profileComplete
      ? 'You can now join a community.'
      : 'Please complete your profile before joining a community.'
  });
});

/**
 * Update user profile (session-based for web interface)
 * PUT /users/profile
 */
export const updateProfile = errorHandler.catchAsync(async (req, res) => {
  // Get user ID from session
  const userId = req.user.id;
  
  // Fetch the actual user document from database
  const user = await User.findById(userId);
  if (!user) {
    throw new errorHandler.NotFoundError('User not found');
  }

  // Fields user is allowed to update (excluding username, role, isActive)
  const allowedFields = [
    'displayName',
    'firstName',
    'lastName',
    'avatarUrl',
    'bio',
    'email',
    'phone',
    'currentStatus',
    'location',
    'region',
    'district',
    'tags',
    'emergencyContacts',
    'emergencySettings'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Validate email uniqueness if provided
  if (updates.email && updates.email !== user.email) {
    const existingUser = await User.findOne({ email: updates.email });
    if (existingUser) {
      throw new errorHandler.ValidationError('Email already exists');
    }
  }

  // Validate phone uniqueness if provided
  if (updates.phone && updates.phone !== user.phone) {
    const existingUser = await User.findOne({ phone: updates.phone });
    if (existingUser) {
      throw new errorHandler.ValidationError('Phone number already exists');
    }
  }

  // Validate GeoJSON location
  if (updates.location) {
    const loc = updates.location;
    if (
      !loc.type || loc.type !== 'Point' ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length !== 2
    ) {
      throw new errorHandler.ValidationError('Invalid location format. Must be GeoJSON Point with coordinates [lng, lat]');
    }
  }

  // Handle region and district conversion from string names to ObjectId references
  if (updates.region) {
    if (typeof updates.region === 'string') {
      // Find region by name (case-insensitive)
      const Region = (await import('../models/Region.js')).default;
      const region = await Region.findOne({ 
        name: { $regex: new RegExp(`^${updates.region}$`, 'i') } 
      });
      if (!region) {
        throw new errorHandler.ValidationError(`Region "${updates.region}" not found`);
      }
      updates.region = region._id;
    }
  }
  
  if (updates.district) {
    if (typeof updates.district === 'string') {
      // Find district by name (case-insensitive)
      const District = (await import('../models/District.js')).default;
      const district = await District.findOne({ 
        name: { $regex: new RegExp(`^${updates.district}$`, 'i') } 
      });
      if (!district) {
        throw new errorHandler.ValidationError(`District "${updates.district}" not found`);
      }
      updates.district = district._id;
    }
  }

  // Validate emergency contacts if provided
  if (updates.emergencyContacts) {
    if (!Array.isArray(updates.emergencyContacts)) {
      throw new errorHandler.ValidationError('Emergency contacts must be an array');
    }
    
    // Validate each emergency contact
    updates.emergencyContacts.forEach((contact, index) => {
      if (!contact.name || !contact.phone) {
        throw new errorHandler.ValidationError(`Emergency contact ${index + 1} must have name and phone`);
      }
      if (contact.priority && (contact.priority < 1 || contact.priority > 5)) {
        throw new errorHandler.ValidationError(`Emergency contact ${index + 1} priority must be between 1 and 5`);
      }
    });
  }

  // Check if region or district changed and user is in a community
  const regionChanged = updates.region && updates.region.toString() !== user.region?.toString();
  const districtChanged = updates.district && updates.district.toString() !== user.district?.toString();
  const addressChanged = regionChanged || districtChanged;
  
  let communityRemoved = false;
  let removedCommunityName = null;

  // If address changed and user is in a community, remove them from the community
  if (addressChanged && user.community) {
    const Community = (await import('../models/Community.js')).default;
    const CommunityMember = (await import('../models/communityMember.js')).default;
    
    const community = await Community.findById(user.community);
    if (community) {
      removedCommunityName = community.name;
      
      // Remove user from community members using CommunityMember model
      await CommunityMember.deleteOne({ community: user.community, user: user._id });
      
      // Decrement community membersCount
      community.membersCount = Math.max(0, (community.membersCount || 0) - 1);
      await community.save();
      
      // Remove community from user
      user.community = null;
      communityRemoved = true;
    }
  }

  Object.assign(user, updates);
  await user.save();

  // Check profile completeness
  const profileComplete =
    user.region && user.district && user.firstName && user.lastName && user.phone;

  const responseData = {
    user,
    profileComplete,
    nextStep: profileComplete
      ? 'Your profile is complete.'
      : 'Please complete your profile information.'
  };

  // Add community removal notification if applicable
  if (communityRemoved) {
    responseData.communityRemoved = true;
    responseData.message = `You have been automatically removed from "${removedCommunityName}" community because your address changed. You can now join communities in your new location.`;
  }

  response.sendOK(res, 'Profile updated successfully', responseData);
});

/**
 * Get all users (directory)
 * GET /users
 */
export const getAllUsers = errorHandler.catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    role = '', 
    status = '', 
    online = '',
    region = '', 
    district = '' 
  } = req.query;

  // Build filter object
  const filter = {};
  
  // Search filter (username, firstName, lastName, email)
  if (search && search !== 'undefined') {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Role filter
  if (role && role !== 'undefined') {
    filter.role = role;
  }
  
  // Status filter
  if (status && status !== 'undefined') {
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
  }
  
  // Online status filter
  if (online && online !== 'undefined') {
    if (online === 'online') {
      filter.isOnline = true;
      // Also filter for users active within last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      filter.lastSeenAt = { $gte: fiveMinutesAgo };
    } else if (online === 'recently-active') {
      filter.isOnline = true;
      // Users who are online but not active within last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      filter.lastSeenAt = { $gte: fifteenMinutesAgo, $lt: fiveMinutesAgo };
    } else if (online === 'offline') {
      filter.isOnline = false;
    }
  }
  
  // Region filter
  if (region && region !== 'undefined') {
    filter.region = region;
  }
  
  // District filter
  if (district && district !== 'undefined') {
    filter.district = district;
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Get users with filters and pagination
  const users = await User.find(filter)
    .select('-password -passwordResetToken -passwordResetExpires')
    .populate('region', 'name')
    .populate('district', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  // Get total count for pagination
  const total = await User.countDocuments(filter);
  
  // Calculate pagination info
  const totalPages = Math.ceil(total / parseInt(limit));
  
  response.sendOK(res, 'Users retrieved successfully', {
    users,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalUsers: total,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    }
  });
});

/**
 * Get user by ID
 * GET /users/:id
 */
export const getUserById = errorHandler.catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new errorHandler.NotFoundError('User not found');
  response.sendOK(res, 'User retrieved successfully', user);
});

/**
 * Admin: update any user's profile
 * POST /users/:id/update
 */
export const updateUserByAdmin = errorHandler.catchAsync(async (req, res) => {
  // Only admin can access this route (enforced via middleware)
  const user = await User.findById(req.params.id);
  if (!user) throw new errorHandler.NotFoundError('User not found');

  const allowedFields = [
    'displayName',
    'firstName',
    'lastName',
    'avatarUrl',
    'bio',
    'email',
    'phone',
    'currentStatus',
    'location',
    'role',
    'isActive',
    'verified',
    'isOnline',
    'contacts',
    'region',
    'district',
    'tags'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // At-least-One-Administrator Rule: Prevent changing the last admin's role
  if (updates.role && user.role === 'admin' && updates.role !== 'admin') {
    await initAdmin.validateAdminCount(req.params.id);
  }

  // Validate location if provided
  if (updates.location) {
    const loc = updates.location;
    if (
      !loc.type || loc.type !== 'Point' ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length !== 2
    ) {
      throw new errorHandler.ValidationError('Invalid location format. Must be GeoJSON Point with coordinates [lng, lat]');
    }
  }

  Object.assign(user, updates);
  await user.save();

  // Emit real-time event for user update
  // emitUserUpdated(user);

  response.sendOK(res, 'User profile updated by admin', user);
});

/**
 * Admin: Create new user
 * POST /users
 */
export const createUser = errorHandler.catchAsync(async (req, res) => {
  console.log('Create user request body:', req.body);
  const { username, email, phone, password, role, firstName, lastName, region, district } = req.body;

  // Validate required fields
  if (!username) {
    throw new errorHandler.ValidationError('Username is required');
  }
  if (!password) {
    throw new errorHandler.ValidationError('Password is required');
  }

  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new errorHandler.ValidationError('Username already exists');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new errorHandler.ValidationError('Email already exists');
    }
  }

  // Check if phone already exists (if provided)
  if (phone) {
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      throw new errorHandler.ValidationError('Phone number already exists');
    }
  }

  try {
    // Convert region and district from string names to ObjectId references
    let regionId = region;
    let districtId = district;
    
    if (region && typeof region === 'string') {
      // Find region by name (case-insensitive)
      const Region = (await import('../models/Region.js')).default;
      const regionDoc = await Region.findOne({ 
        name: { $regex: new RegExp(`^${region}$`, 'i') } 
      });
      if (!regionDoc) {
        throw new errorHandler.ValidationError(`Region "${region}" not found`);
      }
      regionId = regionDoc._id;
    }
    
    if (district && typeof district === 'string') {
      // Find district by name (case-insensitive)
      const District = (await import('../models/District.js')).default;
      const districtDoc = await District.findOne({ 
        name: { $regex: new RegExp(`^${district}$`, 'i') } 
      });
      if (!districtDoc) {
        throw new errorHandler.ValidationError(`District "${district}" not found`);
      }
      districtId = districtDoc._id;
    }

    const user = new User({
      username,
      email,
      phone,
      role: role || 'citizen',
      firstName,
      lastName,
      region: regionId,
      district: districtId,
      isActive: true,
      verified: true
    });

    await user.setPassword(password);
    await user.save();

    console.log('User created successfully:', user.username);

    // Emit real-time event for user creation
    // emitUserCreated(user);

    response.sendCreated(res, 'User created successfully', user);
  } catch (error) {
    console.error('Error creating user:', error);
    throw new errorHandler.ValidationError(`Failed to create user: ${error.message}`);
  }
});

/**
 * Admin: Update user status (activate/deactivate)
 * POST /users/:id/status
 */
export const updateUserStatus = errorHandler.catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new errorHandler.NotFoundError('User not found');

  const { isActive } = req.body;
  
  // At-least-One-Administrator Rule: Prevent deactivating the last admin
  if (user.role === 'admin' && !isActive) {
    await initAdmin.validateAdminCount(req.params.id);
  }
  
  user.isActive = isActive;
  await user.save();

  // Emit real-time event for user status change
  // emitUserStatusChanged(user);

  response.sendOK(res, `User ${isActive ? 'activated' : 'deactivated'} successfully`, user);
});

/**
 * Admin: Delete user
 * POST /users/:id/delete
 */
export const deleteUser = errorHandler.catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new errorHandler.NotFoundError('User not found');

  // At-least-One-Administrator Rule: Prevent deleting the last admin
  if (user.role === 'admin') {
    await initAdmin.validateAdminCount(req.params.id);
  }

  await User.findByIdAndDelete(req.params.id);
  
  // Emit real-time event for user deletion
  // emitUserDeleted(req.params.id);

  response.sendOK(res, 'User deleted successfully');
});

/**
 * Admin: Get user statistics
 * GET /users/stats
 */
export const getUserStats = errorHandler.catchAsync(async (req, res) => {
  const total = await User.countDocuments();
  const active = await User.countDocuments({ isActive: true });
  const online = await User.countDocuments({ isOnline: true });
  const coordinators = await User.countDocuments({ role: 'coordinator', isActive: true });
  const admins = await User.countDocuments({ role: 'admin', isActive: true });
  
  // Users registered today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newToday = await User.countDocuments({ 
    createdAt: { $gte: today } 
  });

  response.sendOK(res, 'User statistics retrieved successfully', {
    total,
    active,
    online,
    coordinators,
    admins,
    newToday
  });
});

/**
 * Admin: Export users data
 * GET /users/export
 */
export const exportUsers = errorHandler.catchAsync(async (req, res) => {
  const users = await User.find().select('-passwordHash -resetPasswordToken -resetPasswordExpires');
  
  // Convert to CSV format
  const csvHeader = 'Username,Email,Phone,Role,FirstName,LastName,Region,District,Status,CreatedAt\n';
  const csvData = users.map(user => {
    return [
      user.username,
      user.email || '',
      user.phone || '',
      user.role,
      user.firstName || '',
      user.lastName || '',
      user.region || '',
      user.district || '',
      user.isActive ? 'Active' : 'Inactive',
      user.createdAt.toISOString()
    ].join(',');
  }).join('\n');

  const csv = csvHeader + csvData;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
  res.send(csv);
});

/**
 * Admin: Change user password
 * POST /users/:id/password
 */
export const changeUserPassword = errorHandler.catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new errorHandler.NotFoundError('User not found');

  const { password } = req.body;
  if (!password) {
    throw new errorHandler.ValidationError('Password is required');
  }

  await user.setPassword(password);
  await user.save();

  // Emit real-time event for password change
  // emitUserPasswordChanged(req.params.id);

  response.sendOK(res, 'Password changed successfully');
});

/**
 * Upload user avatar
 * POST /users/profile/avatar
 */
export const uploadAvatar = errorHandler.catchAsync(async (req, res) => {
  // Get user ID from session
  const userId = req.user.id;
  
  // Fetch the actual user document from database
  const user = await User.findById(userId);
  if (!user) {
    throw new errorHandler.NotFoundError('User not found');
  }
  
  if (!req.file) {
    throw new errorHandler.ValidationError('No file uploaded');
  }
  
  // Delete old avatar if exists
  if (user.avatarUrl && user.avatarUrl !== '/assets/img/avatar.webp') {
    try {
      const oldAvatarPath = path.join(process.cwd(), 'src', 'uploads', 'profiles', path.basename(user.avatarUrl));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    } catch (error) {
      console.warn('Could not delete old avatar:', error.message);
    }
  }
  
  // Update user with new avatar URL
  const avatarUrl = `/uploads/profiles/${req.file.filename}`;
  user.avatarUrl = avatarUrl;
  await user.save();
  
  response.sendOK(res, 'Avatar uploaded successfully', {
    avatarUrl: avatarUrl,
    user: user
  });
});

/**
 * Remove user avatar
 * POST /users/profile/avatar/remove
 */
export const removeAvatar = errorHandler.catchAsync(async (req, res) => {
  // Get user ID from session
  const userId = req.user.id;
  
  // Fetch the actual user document from database
  const user = await User.findById(userId);
  if (!user) {
    throw new errorHandler.NotFoundError('User not found');
  }
  
  if (!user.avatarUrl || user.avatarUrl === '/assets/img/avatar.webp') {
    throw new errorHandler.ValidationError('No avatar to remove');
  }
  
  // Delete avatar file
  try {
    const avatarPath = path.join(process.cwd(), 'src', 'uploads', 'profiles', path.basename(user.avatarUrl));
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }
  } catch (error) {
    console.warn('Could not delete avatar file:', error.message);
  }
  
  // Reset avatar to default
  user.avatarUrl = '/assets/img/avatar.webp';
  await user.save();
  
  response.sendOK(res, 'Avatar removed successfully', {
    avatarUrl: '/assets/img/avatar.webp',
    user: user
  });
});

// Get emergency statuses for community members
const getEmergencyStatuses = async (req, res) => {
  try {
    const user = req.user;
    
    // Get user's community
    const CommunityMember = (await import('../models/communityMember.js')).default;
    const communityMember = await CommunityMember.findOne({ user: user._id }).populate('community');
    
    if (!communityMember || !communityMember.community) {
      return res.json({
        success: true,
        data: { statuses: [] }
      });
    }
    
    // Get all community members with emergency statuses
    const communityMembers = await CommunityMember.find({ 
      community: communityMember.community._id 
    }).populate({
      path: 'user',
      select: 'username displayName firstName lastName avatarUrl currentStatus statusMessage updatedAt',
      match: { 
        currentStatus: { 
          $in: ['needs_help', 'injured', 'missing', 'lost', 'available_to_help'] 
        } 
      }
    });
    
    // Filter out null users and format the response
    const statuses = communityMembers
      .filter(member => member.user)
      .map(member => ({
        user: member.user,
        emergencyStatus: member.user.currentStatus,
        statusMessage: member.user.statusMessage,
        updatedAt: member.user.updatedAt
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.json({
      success: true,
      data: { statuses }
    });
    
  } catch (error) {
    console.error('Error getting emergency statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency statuses',
      error: error.message
    });
  }
};

// Update emergency status
const updateEmergencyStatus = async (req, res) => {
  try {
    const { emergencyStatus, statusMessage } = req.body;
    const user = req.user;
    
    // Validate emergency status
    const validStatuses = ['needs_help', 'injured', 'missing', 'lost', 'available_to_help'];
    if (!validStatuses.includes(emergencyStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency status'
      });
    }
    
    // Update user's emergency status
    user.currentStatus = emergencyStatus;
    user.statusMessage = statusMessage;
    user.updatedAt = new Date();
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Emergency status updated successfully',
      data: {
        currentStatus: user.currentStatus,
        statusMessage: user.statusMessage
      }
    });
    
  } catch (error) {
    console.error('Error updating emergency status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency status',
      error: error.message
    });
  }
};

export default {
  getMe, 
  updateMe, 
  updateProfile,
  uploadAvatar,
  removeAvatar,
  getAllUsers, 
  getUserById, 
  updateUserByAdmin,
  createUser,
  updateUserStatus,
  deleteUser,
  getUserStats,
  exportUsers,
  changeUserPassword,
  getEmergencyStatuses,
  updateEmergencyStatus
}
