import Community from '../models/Community.js';
import CommunityMember from '../models/communityMember.js';
import User from '../models/User.js';
import { catchAsync, NotFoundError, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';
import { sendOK, sendCreated } from '../utils/response.js';

/**
 * Join a community
 * POST /community-members/:communityId/join
 */
export const joinCommunity = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  const community = await Community.findById(communityId).populate('region district');
  if (!community) throw new NotFoundError('Community not found');

  const user = await User.findById(userId).populate('region district');

  // Check if user has completed their profile
  if (!user.region || !user.district) {
    throw new ValidationError('Please complete your profile by setting your region and district before joining a community');
  }

  // Check if user is already in another community (citizen or coordinator)
  if (['citizen', 'coordinator'].includes(user.role) && user.community) {
    throw new ValidationError('You must leave your current community before joining another');
  }

  // Check if community is in the same region and district as user
  if (user.region._id.toString() !== community.region._id.toString() || 
      user.district._id.toString() !== community.district._id.toString()) {
    throw new ValidationError('You can only join communities in your current region and district. Please update your profile if you want to join communities in a different location.');
  }

  // Check if user is already a member
  const existingMembership = await CommunityMember.findOne({ community: communityId, user: userId });
  if (existingMembership) {
    throw new ValidationError('You are already a member of this community');
  }

  // Create membership
  await CommunityMember.create({ community: communityId, user: userId });

  // Update user's current community
  user.community = communityId;
  await user.save();

  // Increment community membersCount
  community.membersCount = (community.membersCount || 0) + 1;
  await community.save();

  sendOK(res, 'Joined community successfully', { 
    membersCount: community.membersCount,
    community: {
      name: community.name,
      region: community.region.name,
      district: community.district.name
    }
  });
});

/**
 * Leave a community
 * POST /community-members/:communityId/leave
 */
export const leaveCommunity = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  const community = await Community.findById(communityId);
  if (!community) throw new NotFoundError('Community not found');

  const membership = await CommunityMember.findOne({ community: communityId, user: userId });
  if (!membership) throw new ValidationError('You are not a member of this community');

  await membership.deleteOne();

  // Update user's community field
  const user = await User.findById(userId);
  if (user.community?.toString() === communityId) {
    user.community = null;
    await user.save();
  }

  // Decrement membersCount
  community.membersCount = Math.max(0, (community.membersCount || 0) - 1);
  await community.save();

  sendOK(res, 'Left community successfully', { membersCount: community.membersCount });
});

/**
 * List all members of a community
 * GET /community-members/:communityId
 * Admin can view all communities; members can view their own
 */
export const listMembers = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const user = req.user;

  // Check permissions
  if (user.role !== 'admin' && user.community?.toString() !== communityId) {
    throw new AuthorizationError('Access denied');
  }

  const members = await CommunityMember.find({ community: communityId })
    .populate({ path: 'user', select: 'username role profile' })
    .sort({ joinedAt: 1 });

  sendOK(res, 'Community members retrieved successfully', { total: members.length, members });
});

/**
 * Assign coordinator role (Admin only)
 * PATCH /community-members/:communityId/:userId/assign-coordinator
 */
export const assignCoordinator = catchAsync(async (req, res, next) => {
  const { communityId, userId } = req.params;
  const admin = req.user;

  if (admin.role !== 'admin') {
    throw new AuthorizationError('Access denied');
  }

  const membership = await CommunityMember.findOne({ community: communityId, user: userId });
  if (!membership) throw new NotFoundError('User is not a member of this community');

  membership.role = 'coordinator';
  await membership.save();

  sendOK(res, 'Coordinator role assigned successfully', { member: membership });
});

export default {
  joinCommunity,
  leaveCommunity,
  listMembers,
  assignCoordinator
};
