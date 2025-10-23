import express from 'express';
import { sessionAuth } from '../middleware/sessionAuth.js';
import { requireAdmin } from '../middleware/adminAccess.js';
import Community from '../models/Community.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// Admin communities management page
router.get('/', sessionAuth, requireAdmin, async (req, res) => {
  try {
    // Get all communities with member count
    const communities = await Community.find()
      .populate('region', 'name')
      .populate('district', 'name')
      .sort({ name: 1 });

    // Get member count for each community
    const communitiesWithMemberCount = await Promise.all(communities.map(async (community) => {
      const memberCount = await CommunityMember.countDocuments({ community: community._id });
      return {
        ...community.toObject(),
        memberCount: memberCount
      };
    }));

    res.render('admin-communities', {
      user: req.user,
      activePage: 'admin-communities',
      hasJoinedCommunity: true, // Admin always has access to all features
      token: req.session.token || null, // Add token for API requests
      communities: communitiesWithMemberCount // Pass communities data to template
    });
  } catch (error) {
    console.error('Error loading admin communities page:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Error loading communities management page'
      }
    });
  }
});

// Admin community selector page
router.get('/selector', sessionAuth, requireAdmin, async (req, res) => {
  try {
    // Get all communities with member count
    const communities = await Community.find()
      .populate('region', 'name')
      .populate('district', 'name')
      .sort({ name: 1 });

    // Get member count for each community
    const communitiesWithMemberCount = await Promise.all(communities.map(async (community) => {
      const memberCount = await CommunityMember.countDocuments({ community: community._id });
      return {
        ...community.toObject(),
        memberCount: memberCount
      };
    }));

    res.render('admin-community-selector', {
      user: req.user,
      communities: communitiesWithMemberCount,
      activePage: 'admin-community-selector',
      selectedCommunityId: req.session.activeCommunityId || null,
      hasJoinedCommunity: true, // Admin always has access to all features
      token: req.session.token || null // Add token for API requests
    });
  } catch (error) {
    console.error('Error loading admin community selector:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Error loading community selector'
      }
    });
  }
});

// Set active community for admin
router.post('/selector/set-active', sessionAuth, requireAdmin, async (req, res) => {
  try {
    const { communityId } = req.body;
    
    if (!communityId) {
      return res.status(400).json({ message: 'Community ID is required' });
    }

    // Verify community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Store active community in session
    req.session.activeCommunityId = communityId;
    req.session.activeCommunity = community;

    res.json({ 
      success: true, 
      message: 'Active community set successfully',
      community: {
        id: community._id,
        name: community.name,
        region: community.region?.name,
        district: community.district?.name
      }
    });
  } catch (error) {
    console.error('Error setting active community:', error);
    res.status(500).json({ message: 'Error setting active community' });
  }
});

// Get current active community
router.get('/active', sessionAuth, requireAdmin, async (req, res) => {
  try {
    const activeCommunityId = req.session.activeCommunityId;
    
    if (!activeCommunityId) {
      return res.json({ activeCommunity: null });
    }

    const community = await Community.findById(activeCommunityId)
      .populate('region', 'name')
      .populate('district', 'name');

    if (!community) {
      // Clear invalid session data
      delete req.session.activeCommunityId;
      delete req.session.activeCommunity;
      return res.json({ activeCommunity: null });
    }

    res.json({ 
      activeCommunity: {
        id: community._id,
        name: community.name,
        region: community.region?.name,
        district: community.district?.name
      }
    });
  } catch (error) {
    console.error('Error getting active community:', error);
    res.status(500).json({ message: 'Error getting active community' });
  }
});

// API endpoint to get all communities for admin
router.get('/api/communities', sessionAuth, requireAdmin, async (req, res) => {
  try {
    // Get all communities with member count
    const communities = await Community.find()
      .populate('region', 'name')
      .populate('district', 'name')
      .sort({ name: 1 });

    // Get member count for each community
    const communitiesWithMemberCount = await Promise.all(communities.map(async (community) => {
      const memberCount = await CommunityMember.countDocuments({ community: community._id });
      return {
        ...community.toObject(),
        memberCount: memberCount
      };
    }));

    res.json({
      status: 'success',
      data: {
        items: communitiesWithMemberCount
      }
    });
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching communities'
    });
  }
});


export default router;
