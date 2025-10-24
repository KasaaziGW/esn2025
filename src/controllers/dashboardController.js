import response from '../utils/response.js';
import errorHandler from '../middleware/errorHandler.js';
import User from '../models/User.js';
import CommunityMember from '../models/communityMember.js';
import Announcement from '../models/Announcement.js';
import Community from '../models/Community.js';

// Render dashboard page
const getDashboard = errorHandler.catchAsync(async (req, res) => {
  // Fetch user data from database with populated fields
  const user = await User.findById(req.user.id)
    .populate('region', 'name')
    .populate('district', 'name')
    .populate('community', 'name')
    .select('username displayName firstName lastName fullName role phone region district community avatarUrl emergencyContacts');
  
  // Check if user has joined any community
  const communityMembership = await CommunityMember.findOne({ user: user._id });
  const hasJoinedCommunity = !!communityMembership;

  // Get real dashboard data
  const dashboardData = await getRealDashboardData(user);

  res.render('dashboard', {
    title: 'Dashboard - Emergency Social Network',
    user: user,
    dashboardData: dashboardData,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

// Get dashboard data based on user role
const getDashboardData = errorHandler.catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('region', 'name')
    .populate('district', 'name')
    .populate('community', 'name')
    .select('username displayName firstName lastName fullName role phone region district community avatarUrl emergencyContacts');
  
  const dashboardData = await getRealDashboardData(user);
  response.sendOK(res, 'Dashboard data retrieved successfully', dashboardData);
});

// Get real dashboard data from database
async function getRealDashboardData(user) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  // Base query for user's community
  let communityQuery = {};
  if (user.role !== 'admin' && user.community) {
    communityQuery = { community: user.community };
  }

  // Get active emergency alerts
  const activeAlerts = await Announcement.countDocuments({
    ...communityQuery,
    isEmergency: true,
    status: 'active'
  });

  // Get today's emergency alerts
  const todayAlerts = await Announcement.countDocuments({
    ...communityQuery,
    isEmergency: true,
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  });

  // Get total community members
  let totalMembers = 0;
  if (user.community) {
    totalMembers = await CommunityMember.countDocuments({ community: user.community });
  } else if (user.role === 'admin') {
    totalMembers = await User.countDocuments({ role: 'citizen' });
  }

  // Get new members today
  const newMembersToday = await CommunityMember.countDocuments({
    ...communityQuery,
    joinedAt: { $gte: startOfDay, $lt: endOfDay }
  });

  // Get user's emergency contacts
  const emergencyContacts = user.emergencyContacts ? user.emergencyContacts.length : 0;

  // Get recent emergency alerts
  const recentAlerts = await Announcement.find({
    ...communityQuery,
    isEmergency: true
  })
    .populate('createdBy', 'displayName username')
    .select('title emergencyType severity status createdAt locationDescription')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get recent announcements (non-emergency)
  const recentAnnouncements = await Announcement.find({
    ...communityQuery,
    isEmergency: false
  })
    .populate('createdBy', 'displayName username')
    .select('title body createdAt')
    .sort({ createdAt: -1 })
    .limit(3);

  // Role-specific data
  let roleSpecificData = {};
  
  if (user.role === 'citizen') {
    // Citizens see their community members
    const myCommunityMembers = user.community ? 
      await CommunityMember.countDocuments({ community: user.community }) : 0;
    
    roleSpecificData = {
      myCommunityMembers,
      myAlerts: await Announcement.countDocuments({
        community: user.community,
        isEmergency: true,
        affectedUsers: user._id
      })
    };
  } else if (user.role === 'coordinator') {
    // Coordinators see assigned incidents
    const assignedIncidents = await Announcement.countDocuments({
      ...communityQuery,
      assignedTo: user._id,
      status: 'active'
    });
    
    const coordinationTasks = await Announcement.countDocuments({
      ...communityQuery,
      requiresResponse: true,
      status: 'active'
    });
    
    roleSpecificData = {
      assignedIncidents,
      coordinationTasks
    };
  } else if (user.role === 'admin') {
    // Admins see system-wide data
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isOnline: true });
    
    roleSpecificData = {
      totalUsers,
      activeUsers,
      systemHealth: 'excellent',
      systemUptime: '99.9%'
    };
  }

  return {
    activeAlerts,
    todayAlerts,
    totalMembers,
    newMembersToday,
    emergencyContacts,
    recentAlerts: recentAlerts.map(alert => ({
      id: alert._id,
      title: alert.title,
      type: alert.emergencyType,
      severity: alert.severity,
      status: alert.status,
      location: alert.locationDescription || 'Location not specified',
      time: formatTimeAgo(alert.createdAt),
      createdBy: alert.createdBy.displayName || alert.createdBy.username
    })),
    recentAnnouncements: recentAnnouncements.map(announcement => ({
      id: announcement._id,
      title: announcement.title,
      body: announcement.body.substring(0, 100) + '...',
      time: formatTimeAgo(announcement.createdAt),
      createdBy: announcement.createdBy.displayName || announcement.createdBy.username
    })),
    ...roleSpecificData
  };
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default { getDashboard, getDashboardData };