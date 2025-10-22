import { catchAsync } from '../middleware/errorHandler.js';
import { sendOK, sendCreated, sendNoContent } from '../utils/response.js';
import Community from '../models/Community.js';
import User from '../models/User.js';
import Region from '../models/Region.js';
import District from '../models/District.js';
import CommunityMember from '../models/communityMember.js';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler.js';

// Centralized function to check if user is in any community
async function getUserCommunityStatus(userId) {
  console.log('=== CHECKING USER COMMUNITY STATUS ===');
  console.log('User ID:', userId);
  
  if (!userId) {
    console.error('ERROR: userId is not defined');
    throw new Error('User ID is required');
  }
  
  try {
    // Get user with community populated
    const user = await User.findById(userId).populate('community', 'name');
    console.log('User from database:', user);
    console.log('User community:', user?.community);
    
    if (!user) {
      console.error('ERROR: User not found with ID:', userId);
      throw new Error('User not found');
    }
  
  // Check CommunityMember records
  const communityMemberships = await CommunityMember.find({ user: userId }).populate('community', 'name');
  console.log('Community memberships:', communityMemberships);
  console.log('Community memberships length:', communityMemberships.length);
  
  // Determine if user is in any community
  const hasUserCommunity = user?.community !== null && user?.community !== undefined;
  const hasCommunityMemberships = communityMemberships.length > 0;
  
  console.log('User community status check:', {
    hasUserCommunity,
    hasCommunityMemberships,
    userCommunityValue: user?.community,
    membershipsCount: communityMemberships.length
  });
  
  // If there's a mismatch, fix it
  if (hasCommunityMemberships && !hasUserCommunity) {
    console.log('FIXING: User has memberships but no community field');
    user.community = communityMemberships[0].community._id;
    await user.save();
    console.log('Fixed user.community to:', user.community);
  } else if (!hasCommunityMemberships && hasUserCommunity) {
    console.log('FIXING: User has community field but no memberships');
    user.community = null;
    await user.save();
    console.log('Fixed user.community to null');
  }
  
  const isInCommunity = hasUserCommunity || hasCommunityMemberships;
  console.log('Final status - is in community:', isInCommunity);
  
    return {
      isInCommunity,
      user,
      communityMemberships,
      currentCommunity: user?.community
    };
  } catch (error) {
    console.error('Error in getUserCommunityStatus:', error);
    throw error;
  }
}

// Get communities available to user based on their region/district
export const getAvailableCommunities = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  // Get user's current region and district
  const user = await User.findById(userId).select('region district community');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if user has completed profile (has region and district)
  if (!user.region || !user.district) {
    return sendOK(res, 'Profile incomplete - please update your location', {
      communities: [],
      message: 'Please complete your profile by setting your region and district to see available communities.',
      profileComplete: false
    });
  }

  // Find communities in user's region and district
  const communities = await Community.find({
    region: user.region,
    district: user.district,
    isActive: true
  })
  .populate('region', 'name')
  .populate('district', 'name')
  .sort({ name: 1 })
  .lean();

  // Add user's current community status to each community
  const communitiesWithStatus = communities.map(community => ({
    ...community,
    isMember: user.community && user.community.toString() === community._id.toString(),
    memberCount: community.membersCount || 0
  }));

  sendOK(res, 'Available communities retrieved successfully', {
    communities: communitiesWithStatus,
    userCommunity: user.community,
    profileComplete: true
  });
});

// Join a community
export const joinCommunity = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { communityId } = req.params;

  // Get user's current region and district
  const user = await User.findById(userId).select('region district community');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if user has completed profile
  if (!user.region || !user.district) {
    throw new ValidationError('Please complete your profile by setting your region and district before joining communities.');
  }

  // Get the community
  const community = await Community.findById(communityId)
    .populate('region', 'name')
    .populate('district', 'name');
  
  if (!community) {
    throw new NotFoundError('Community not found');
  }

  // Check if community is in user's region and district
  if (community.region._id.toString() !== user.region.toString() || 
      community.district._id.toString() !== user.district.toString()) {
    throw new AuthorizationError('You can only join communities in your current region and district. Please update your profile to change your location.');
  }

  // Check if user is already in a community using centralized function
  console.log('About to call getUserCommunityStatus with userId:', userId);
  const communityStatus = await getUserCommunityStatus(userId);
  console.log('Community status result:', communityStatus);
  console.log('Is in community:', communityStatus.isInCommunity);
  console.log('Current community:', communityStatus.currentCommunity);
  
  if (communityStatus.isInCommunity) {
    console.log('BLOCKING JOIN: User is already in community:', communityStatus.currentCommunity);
    throw new ValidationError('You are already a member of a community. Please leave your current community before joining another one.');
  }

  // Check if community is active
  if (!community.isActive) {
    throw new ValidationError('This community is not currently active.');
  }

  // Check if user is already a member
  const CommunityMember = (await import('../models/communityMember.js')).default;
  const existingMembership = await CommunityMember.findOne({ community: communityId, user: userId });
  if (existingMembership) {
    throw new ValidationError('You are already a member of this community');
  }

  // Create CommunityMember record
  await CommunityMember.create({ community: communityId, user: userId });

  // Update user's community
  user.community = communityId;
  await user.save();

  // Increment community membersCount
  community.membersCount = (community.membersCount || 0) + 1;
  await community.save();

  // Update session with new community information
  if (req.session && req.session.user) {
    req.session.user.community = communityId;
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  sendOK(res, 'Successfully joined community', {
    community: {
      id: community._id,
      name: community.name,
      description: community.description,
      region: community.region.name,
      district: community.district.name
    }
  });
});

// Leave a community
export const leaveCommunity = catchAsync(async (req, res) => {
  const userId = req.user.id;
  console.log('=== LEAVE COMMUNITY ===');
  console.log('User ID:', userId);

  // Use centralized community status check
  console.log('About to call getUserCommunityStatus with userId:', userId);
  const communityStatus = await getUserCommunityStatus(userId);
  console.log('Community status result:', communityStatus);
  console.log('Is in community:', communityStatus.isInCommunity);
  console.log('Current community:', communityStatus.currentCommunity);

  if (!communityStatus.isInCommunity) {
    console.log('BLOCKING LEAVE: User is not in any community');
    console.log('Community status details:', {
      isInCommunity: communityStatus.isInCommunity,
      currentCommunity: communityStatus.currentCommunity,
      user: communityStatus.user?.community,
      memberships: communityStatus.communityMemberships?.length
    });
    throw new ValidationError('You are not currently a member of any community.');
  }

  // Get the community
  const community = await Community.findById(communityStatus.currentCommunity._id);
  if (!community) {
    throw new NotFoundError('Community not found');
  }

  // Remove CommunityMember record
  const CommunityMember = (await import('../models/communityMember.js')).default;
  await CommunityMember.deleteOne({ community: communityStatus.currentCommunity._id, user: userId });

  // Remove community from user
  const user = await User.findById(userId);
  user.community = null;
  await user.save();

  // Decrement community membersCount
  community.membersCount = Math.max(0, (community.membersCount || 0) - 1);
  await community.save();

  // Update session to remove community information
  if (req.session && req.session.user) {
    req.session.user.community = null;
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  sendOK(res, 'Successfully left community', {
    community: {
      id: community._id,
      name: community.name
    }
  });
});

// Get user's current community details
export const getMyCommunity = catchAsync(async (req, res) => {
  console.log('=== GET MY COMMUNITY ===');
  console.log('User ID:', req.user.id);
  console.log('User role:', req.user.role);
  console.log('Session user:', req.session?.user);
  console.log('Session user community:', req.session?.user?.community);
  console.log('Session activeCommunity:', req.session?.activeCommunity);
  
  const userId = req.user.id;

  // If user is an administrator, check for selected community in session first
  if (req.user.role === 'admin') {
    console.log('User is administrator, checking for selected community in session');
    
    // First check if admin has selected a community in session
    if (req.session.activeCommunity) {
      console.log('Admin has selected community in session:', req.session.activeCommunity);
      return sendOK(res, 'Community details retrieved successfully', {
        community: {
          id: req.session.activeCommunity._id,
          name: req.session.activeCommunity.name,
          description: req.session.activeCommunity.description,
          region: req.session.activeCommunity.region?.name || 'N/A',
          district: req.session.activeCommunity.district?.name || 'N/A',
          memberCount: req.session.activeCommunity.membersCount || 0
        }
      });
    }
    
    // Fallback to first available community if no selection made
    console.log('No selected community in session, getting first available community');
    const firstCommunity = await Community.findOne()
      .populate([
        { path: 'region', select: 'name' },
        { path: 'district', select: 'name' }
      ])
      .sort({ createdAt: 1 });
    
    if (firstCommunity) {
      return sendOK(res, 'Community details retrieved successfully', {
        community: {
          id: firstCommunity._id,
          name: firstCommunity.name,
          description: firstCommunity.description,
          region: firstCommunity.region?.name || 'N/A',
          district: firstCommunity.district?.name || 'N/A',
          memberCount: firstCommunity.membersCount || 0
        }
      });
    }
  }

  // Use centralized community status check for regular users
  console.log('About to call getUserCommunityStatus with userId:', userId);
  try {
    const communityStatus = await getUserCommunityStatus(userId);
    console.log('Community status result:', communityStatus);
    
    if (!communityStatus.isInCommunity) {
      console.log('User not in any community');
      return sendOK(res, 'User not in any community', {
        community: null,
        message: 'You are not currently a member of any community.'
      });
    }
  } catch (error) {
    console.error('Error in getUserCommunityStatus:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check community status',
      error: error.message
    });
  }

  // Get fresh user data with populated community
  const user = await User.findById(userId)
    .populate({
      path: 'community',
      populate: [
        { path: 'region', select: 'name' },
        { path: 'district', select: 'name' }
      ]
    })
    .select('community region district');

  sendOK(res, 'Community details retrieved successfully', {
    community: {
      id: user.community._id,
      name: user.community.name,
      description: user.community.description,
      region: user.community.region.name,
      district: user.community.district.name,
      memberCount: user.community.membersCount
    }
  });
});

// Check if user can access communities (profile completion check)
export const checkCommunityAccess = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('region district community');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const profileComplete = !!(user.region && user.district);
  const hasCommunity = !!user.community;

  sendOK(res, 'Community access status retrieved', {
    profileComplete,
    hasCommunity,
    canJoinCommunities: profileComplete,
    message: profileComplete 
      ? (hasCommunity ? 'You are already in a community.' : 'You can join communities in your area.')
      : 'Please complete your profile by setting your region and district to access communities.'
  });
});

// Get user communities (session-based version)
export const getUserCommunities = catchAsync(async (req, res) => {
  console.log('=== GET USER COMMUNITIES ===');
  console.log('User from session:', req.user);
  console.log('User ID:', req.user?.id);
  console.log('Request user type:', typeof req.user);
  console.log('Request user keys:', req.user ? Object.keys(req.user) : 'req.user is null/undefined');
  
  if (!req.user || !req.user.id) {
    console.error('ERROR: req.user or req.user.id is not defined');
    throw new Error('User not authenticated');
  }
  
  const userId = req.user.id;
  console.log('Using userId:', userId);
  
  // Get fresh user data from database with populated region and district
  const user = await User.findById(userId)
    .populate('region', 'name')
    .populate('district', 'name')
    .populate('community', 'name');
    
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  console.log('User from database:', user);
  console.log('User region:', user.region);
  console.log('User district:', user.district);
  console.log('User community:', user.community);
  
  if (!user.region || !user.district) {
    console.log('User profile incomplete - no region or district');
    return sendOK(res, 'Please complete your profile to see communities', {
      communities: [],
      profileComplete: false,
      message: 'Please set your region and district in your profile to see available communities.'
    });
  }

  const filter = {
    region: user.region._id,
    district: user.district._id,
    isActive: true,
    isPublic: true
  };

  console.log('Filter for communities:', filter);
  
  const communities = await Community.find(filter)
    .populate([
      { path: 'region', select: 'name' },
      { path: 'district', select: 'name' },
      { path: 'createdBy', select: 'displayName email' }
    ])
    .sort({ name: 1 });

  console.log('Found communities:', communities.length);
  console.log('Communities:', communities.map(c => ({ name: c.name, id: c._id, membersCount: c.membersCount })));

  // Use centralized community status check
  console.log('About to call getUserCommunityStatus with userId:', userId);
  const communityStatus = await getUserCommunityStatus(userId);
  const userCommunity = communityStatus.currentCommunity;
  console.log('User community from centralized check:', userCommunity);
  console.log('User community ID:', userCommunity?._id);
  
  // Add user's current community status to each community
  const communitiesWithStatus = communities.map(community => {
    const isMember = userCommunity && userCommunity._id.toString() === community._id.toString();
    console.log(`Community ${community.name}: isMember = ${isMember} (userCommunity: ${userCommunity?._id}, community: ${community._id})`);
    
    return {
      ...community.toObject(),
      isMember: isMember,
      memberCount: community.membersCount || 0
    };
  });
  
  console.log('Communities with status:', communitiesWithStatus.map(c => ({ name: c.name, isMember: c.isMember, memberCount: c.memberCount })));

  sendOK(res, 'User communities retrieved successfully', {
    communities: communitiesWithStatus,
    profileComplete: true,
    userAddress: {
      region: user.region,
      district: user.district
    }
  });
});

// Temporary endpoint to inspect database state
export const inspectDatabaseState = catchAsync(async (req, res) => {
  const userId = req.user.id;
  console.log('=== INSPECTING DATABASE STATE ===');
  console.log('User ID:', userId);
  
  // Get user data
  const user = await User.findById(userId);
  console.log('User from database:', {
    id: user?._id,
    username: user?.username,
    community: user?.community,
    communityType: typeof user?.community
  });
  
  // Get CommunityMember records
  const CommunityMember = (await import('../models/communityMember.js')).default;
  const communityMemberships = await CommunityMember.find({ user: userId }).populate('community', 'name');
  console.log('CommunityMember records:', communityMemberships.map(cm => ({
    id: cm._id,
    community: cm.community?._id,
    communityName: cm.community?.name,
    user: cm.user,
    role: cm.role,
    joinedAt: cm.joinedAt
  })));
  
  // Get all communities
  const allCommunities = await Community.find({}).select('name _id membersCount');
  console.log('All communities:', allCommunities.map(c => ({
    id: c._id,
    name: c.name,
    membersCount: c.membersCount
  })));
  
  res.json({
    status: 'success',
    data: {
      user: {
        id: user?._id,
        username: user?.username,
        community: user?.community,
        communityType: typeof user?.community
      },
      communityMemberships: communityMemberships.map(cm => ({
        id: cm._id,
        community: cm.community?._id,
        communityName: cm.community?.name,
        user: cm.user,
        role: cm.role,
        joinedAt: cm.joinedAt
      })),
      allCommunities: allCommunities.map(c => ({
        id: c._id,
        name: c.name,
        membersCount: c.membersCount
      }))
    }
  });
});

// Get community members
export const getCommunityMembers = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  // Get user's community
  const user = await User.findById(userId).populate('community');
  
  let members = [];
  
  // If user is an administrator, they can see all users
  if (user.role === 'admin') {
    // Check if admin has selected a specific community in session
    if (req.session.activeCommunity) {
      console.log('Admin viewing members of selected community:', req.session.activeCommunity.name);
      
      // Get members of the selected community
      const CommunityMember = (await import('../models/communityMember.js')).default;
      const communityMembers = await CommunityMember.find({ 
        community: req.session.activeCommunity._id,
        user: { $ne: userId }
      })
        .populate({
          path: 'user',
          select: 'username displayName role profile avatarUrl isOnline lastSeenAt isActive'
        })
        .sort({ joinedAt: -1 });

      // Filter out members where user is null (inactive users)
      const activeCommunityMembers = communityMembers.filter(member => member.user);

      members = activeCommunityMembers.map(member => ({
        _id: member.user._id,
        username: member.user.username,
        displayName: member.user.displayName,
        role: member.user.role,
        avatarUrl: member.user.profile?.avatarUrl,
        isOnline: member.user.isOnline || false,
        lastSeenAt: member.user.lastSeenAt,
        isActive: member.user.isActive,
        joinedAt: member.joinedAt
      }));
    } else {
      // Fallback: show all users if no community selected
      const allUsers = await User.find({ _id: { $ne: userId } })
        .select('username displayName role profile avatarUrl isOnline lastSeenAt isActive')
        .sort({ username: 1 });
      
      members = allUsers.map(user => ({
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.profile?.avatarUrl,
        isOnline: user.isOnline || false,
        lastSeenAt: user.lastSeenAt,
        isActive: user.isActive,
        joinedAt: null
      }));
    }
  } else {
    // Regular users can only see community members and administrators
    if (!user || !user.community) {
      throw new NotFoundError('User not in any community');
    }

    // Get all community members (excluding current user) - only active users for non-admins
    const communityMembers = await CommunityMember.find({ 
      community: user.community._id,
      user: { $ne: userId }
    })
      .populate({
        path: 'user',
        select: 'username displayName role profile avatarUrl isOnline lastSeenAt isActive',
        match: { isActive: true }
      })
      .sort({ joinedAt: -1 });

    // Filter out members where user is null (inactive users)
    const activeCommunityMembers = communityMembers.filter(member => member.user);

    const communityMembersList = activeCommunityMembers.map(member => ({
      _id: member.user._id,
      username: member.user.username,
      displayName: member.user.displayName,
      role: member.user.role,
      avatarUrl: member.user.profile?.avatarUrl,
      isOnline: member.user.isOnline || false,
      lastSeenAt: member.user.lastSeenAt,
      isActive: member.user.isActive,
      joinedAt: member.joinedAt
    }));

    // Add administrators to the list (they can chat with anyone)
    // But exclude any administrators who are already community members
    const communityMemberIds = communityMembersList.map(member => member._id.toString());
    
    const administrators = await User.find({ 
      role: 'admin',
      isActive: true, // Only active admins for non-admin users
      _id: { $nin: communityMemberIds } // Exclude admins who are already community members
    })
      .select('username displayName role profile avatarUrl isOnline lastSeenAt isActive')
      .sort({ username: 1 });

    const adminMembers = administrators.map(admin => ({
      _id: admin._id,
      username: admin.username,
      displayName: admin.displayName,
      role: admin.role,
      avatarUrl: admin.profile?.avatarUrl,
      isOnline: admin.isOnline || false,
      lastSeenAt: admin.lastSeenAt,
      isActive: admin.isActive,
      joinedAt: null // Admins don't have joinedAt since they're not community members
    }));

    // Combine community members and administrators
    members = [...communityMembersList, ...adminMembers];
  }

  sendOK(res, 'Community members retrieved successfully', { members });
});

// Get online members
export const getOnlineMembers = catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  // Get user's community
  const user = await User.findById(userId).populate('community');
  
  let members = [];
  
  // If user is an administrator, check for selected community in session
  if (user.role === 'admin') {
    if (req.session.activeCommunity) {
      console.log('Admin viewing online members of selected community:', req.session.activeCommunity.name);
      
      // Get online members of the selected community
      const CommunityMember = (await import('../models/communityMember.js')).default;
      const communityMembers = await CommunityMember.find({ 
        community: req.session.activeCommunity._id,
        user: { $ne: userId }
      })
        .populate({
          path: 'user',
          select: 'username displayName role profile avatarUrl isOnline lastSeenAt isActive',
          match: { isOnline: true, isActive: true }
        })
        .sort({ joinedAt: -1 });

      // Filter out members where user is null (inactive users)
      const activeCommunityMembers = communityMembers.filter(member => member.user);

      members = activeCommunityMembers.map(member => ({
        _id: member.user._id,
        username: member.user.username,
        displayName: member.user.displayName,
        role: member.user.role,
        avatarUrl: member.user.profile?.avatarUrl,
        isOnline: true,
        lastSeenAt: member.user.lastSeenAt
      }));
    } else {
      // Fallback: show all online users if no community selected
      const allOnlineUsers = await User.find({ 
        _id: { $ne: userId },
        isOnline: true,
        isActive: true
      }).select('username displayName role profile avatarUrl lastSeenAt');
      
      members = allOnlineUsers.map(user => ({
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.profile?.avatarUrl,
        isOnline: true,
        lastSeenAt: user.lastSeenAt
      }));
    }
  } else {
    // Regular users can only see online members of their community
    if (!user || !user.community) {
      throw new NotFoundError('User not in any community');
    }

    // Get online community members
    const onlineMembers = await User.find({
      community: user.community._id,
      isOnline: true
    }).select('username displayName role profile avatarUrl lastSeenAt');

    members = onlineMembers.map(member => ({
      _id: member._id,
      username: member.username,
      displayName: member.displayName,
      role: member.role,
      avatarUrl: member.profile?.avatarUrl,
      isOnline: true,
      lastSeenAt: member.lastSeenAt
    }));
  }

  sendOK(res, 'Online members retrieved successfully', { members });
});

export default {
  getAvailableCommunities,
  getUserCommunities,
  joinCommunity,
  leaveCommunity,
  getMyCommunity,
  getCommunityMembers,
  getOnlineMembers,
  checkCommunityAccess,
  inspectDatabaseState
};
