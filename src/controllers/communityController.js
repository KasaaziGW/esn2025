import mongoose from 'mongoose';
import Community from '../models/Community.js';
import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';

/**
 * Helper to find a community by flexible identifier:
 * - If identifier is a valid ObjectId -> findById
 * - Otherwise try slug and publicId
 */
async function findCommunityByIdentifier(identifier) {
  try {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      const byId = await Community.findById(identifier);
      if (byId) return byId;
    }
    // fallback: slug or publicId
    return Community.findOne({
      $or: [{ slug: identifier }, { publicId: identifier }]
    });
  } catch (err) {
    throw err;
  }
}

/**
 * Create a new community
 * POST /communities
 */
export const createCommunity = errorHandler.catchAsync(async (req, res, next) => {
  const { name, description, region, district, isPublic = true, metadata } = req.body;
  if (!name || !region || !district) {
    throw new errorHandler.ValidationError('name, region and district are required');
  }

  const createdBy = req.user?.id || req.user?._id || undefined;

  // Handle banner upload
  let bannerUrl = null;
  if (req.file) {
    bannerUrl = `/uploads/communities/${req.file.filename}`;
  }

  const community = new Community({
    name: name.trim(),
    description,
    region,
    district,
    isPublic,
    metadata,
    bannerUrl,
    createdBy
  });

  await community.save();
  await community.populate([
    { path: 'region', select: 'name' },
    { path: 'district', select: 'name' },
    { path: 'createdBy', select: 'name email' }
  ]);

  response.sendCreated(res, 'Community created successfully', community);
});

/**
 * List communities with filters, search, pagination, sort
 * GET /communities
 */
export const listCommunities = errorHandler.catchAsync(async (req, res, next) => {
  const {
    q,
    region,
    district,
    isPublic,
    isActive,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = req.query;

  const filter = { isActive: true }; // Only show active communities by default
  if (typeof isPublic !== 'undefined') {
    if (isPublic === 'true') filter.isPublic = true;
    else if (isPublic === 'false') filter.isPublic = false;
  }
  if (typeof isActive !== 'undefined') {
    filter.isActive = isActive === 'true';
  }
  if (region) filter.region = region;
  if (district) filter.district = district;
  if (q) filter.$text = { $search: q };

  const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
  const total = await Community.countDocuments(filter);
  const items = await Community.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10))
    .populate([
      { path: 'region', select: 'name' },
      { path: 'district', select: 'name' },
      { path: 'createdBy', select: 'displayName email' }
    ]);

  response.sendOK(res, 'Communities retrieved successfully', {
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    items,
    communities: items // Add this for backward compatibility
  });
});

/**
 * Get communities for a specific user based on their address
 * GET /communities/user-communities
 */
export const getUserCommunities = errorHandler.catchAsync(async (req, res, next) => {
  const user = req.user;
  
  if (!user.region || !user.district) {
    return response.sendOK(res, 'Please complete your profile to see communities', {
      communities: [],
      profileComplete: false,
      message: 'Please set your region and district in your profile to see available communities.'
    });
  }

  const filter = {
    region: user.region,
    district: user.district,
    isActive: true,
    isPublic: true
  };

  const communities = await Community.find(filter)
    .populate([
      { path: 'region', select: 'name' },
      { path: 'district', select: 'name' },
      { path: 'createdBy', select: 'displayName email' },
      { path: 'members', select: 'username displayName avatarUrl' }
    ])
    .sort({ createdAt: -1 }); // Sort by creation date, newest first

  // Add user's current community status to each community
  const communitiesWithStatus = communities.map(community => ({
    ...community.toObject(),
    isMember: community.members.some(member => member._id.toString() === user.id),
    memberCount: community.members.length
  }));

  response.sendOK(res, 'User communities retrieved successfully', {
    communities: communitiesWithStatus,
    profileComplete: true,
    userAddress: {
      region: user.region,
      district: user.district
    }
  });
});

/**
 * Get one community by id/slug/publicId
 * GET /communities/:identifier
 */
export const getCommunity = errorHandler.catchAsync(async (req, res, next) => {
  const { identifier } = req.params;
  const community = await findCommunityByIdentifier(identifier);

  if (!community) throw new errorHandler.NotFoundError('Community not found');

  await community.populate([
    { path: 'region', select: 'name' },
    { path: 'district', select: 'name' },
    { path: 'createdBy', select: 'displayName email' }
  ]);

  response.sendOK(res, 'Community retrieved successfully', community);
});

/**
 * Update a community
 * POST /communities/:identifier/update
 */
export const updateCommunity = errorHandler.catchAsync(async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new errorHandler.AuthorizationError('Forbidden: admin only');
  }

  const { identifier } = req.params;
  const updates = req.body || {};

  const community = await findCommunityByIdentifier(identifier);
  if (!community) throw new errorHandler.NotFoundError('Community not found');

  // Handle banner upload
  if (req.file) {
    updates.bannerUrl = `/uploads/communities/${req.file.filename}`;
  }

  const allowed = ['name', 'description', 'region', 'district', 'isPublic', 'metadata', 'membersCount', 'bannerUrl'];
  allowed.forEach((field) => {
    if (typeof updates[field] !== 'undefined') community[field] = updates[field];
  });

  await community.save();
  await community.populate([
    { path: 'region', select: 'name' },
    { path: 'district', select: 'name' },
    { path: 'createdBy', select: 'name email' }
  ]);

  response.sendOK(res, 'Community updated successfully', community);
});

/**
 * Delete a community
 * POST /communities/:identifier/delete
 */
export const deleteCommunity = errorHandler.catchAsync(async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new errorHandler.AuthorizationError('Forbidden: admin only');
  }

  const { identifier } = req.params;
  const community = await findCommunityByIdentifier(identifier);
  if (!community) throw new errorHandler.NotFoundError('Community not found');

  await community.deleteOne();
  response.sendOK(res, 'Community deleted successfully');
});

export default {
  createCommunity,
  listCommunities,
  getUserCommunities,
  getCommunity,
  updateCommunity,
  deleteCommunity
};
