import User from '../models/User.js';
import Region from '../models/Region.js';
import District from '../models/District.js';
import connectDB from '../config/db.js';
import { ensureRegionsAndDistricts } from './ensureRegionsDistricts.js';

/**
 * Find existing Central region and Kampala district
 * This function looks for existing regions and districts in the database
 */
const findCentralRegionAndKampalaDistrict = async () => {
  try {
    // Find Central region (case-insensitive search)
    const centralRegion = await Region.findOne({ 
      name: { $regex: /^central$/i } 
    });
    
    if (!centralRegion) {
      const anyRegion = await Region.findOne();
      if (!anyRegion) {
        throw new Error('No regions found in database. Please ensure at least one region exists.');
      }
      return { centralRegion: anyRegion, kampalaDistrict: null };
    }
    
    // Find Kampala district (case-insensitive search)
    const kampalaDistrict = await District.findOne({ 
      name: { $regex: /^kampala$/i },
      region: centralRegion._id
    });
    
    if (!kampalaDistrict) {
      const anyDistrict = await District.findOne({ region: centralRegion._id });
      if (!anyDistrict) {
        const anyDistrictAnywhere = await District.findOne();
        if (!anyDistrictAnywhere) {
          throw new Error('No districts found in database. Please ensure at least one district exists.');
        }
        return { centralRegion, kampalaDistrict: anyDistrictAnywhere };
      }
      return { centralRegion, kampalaDistrict: anyDistrict };
    }
    
    return { centralRegion, kampalaDistrict };
    
  } catch (error) {
    console.error('Error finding Central region and Kampala district:', error);
    throw error;
  }
};

/**
 * Initialize the default administrator user
 * This ensures the system always has the specific ESNAdmin user as specified in the rules
 */
const initializeDefaultAdmin = async () => {
  try {
    // Find existing Central region and Kampala district
    const { centralRegion, kampalaDistrict } = await findCentralRegionAndKampalaDistrict();
    
    // Check if ESNAdmin specifically exists
    const esnAdmin = await User.findOne({ username: 'ESNAdmin' });

    if (!esnAdmin) {
      // Create the default administrator as specified in the rules
      const defaultAdmin = new User({
        username: 'ESNAdmin',
        email: 'admin@emergencysocialnetwork.com',
        phone: '+256-000-000-000', // Default phone for admin
        role: 'admin',
        firstName: 'Emergency',
        lastName: 'Administrator',
        displayName: 'ESN Administrator',
        region: centralRegion._id, // Use ObjectId reference
        district: kampalaDistrict ? kampalaDistrict._id : null, // Use ObjectId reference or null
        isActive: true,
        verified: true,
        bio: 'Default system administrator for Emergency Social Network'
      });

      // Set the default password as specified in the rules
      await defaultAdmin.setPassword('admin');
      await defaultAdmin.save();
      
      return defaultAdmin;
    } else {
      return esnAdmin;
    }
  } catch (error) {
    console.error('Error initializing ESNAdmin user:', error);
    throw error;
  }
};


/**
 * Validate administrator count and prevent deletion of last admin
 */
const validateAdminCount = async (userIdToDelete = null) => {
  try {
    let adminCount = await User.countDocuments({ 
      role: 'admin', 
      isActive: true 
    });

    // If we're checking deletion of a specific user
    if (userIdToDelete) {
      const userToDelete = await User.findById(userIdToDelete);
      if (userToDelete && userToDelete.role === 'admin') {
        adminCount -= 1; // This admin would be deleted
      }
    }

    if (adminCount <= 0) {
      throw new Error('Cannot perform this action: At least one administrator must remain active in the system');
    }

    return true;
  } catch (error) {
    console.error('Admin count validation failed:', error);
    throw error;
  }
};

/**
 * Get administrator statistics
 */
const getAdminStats = async () => {
  try {
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    const onlineAdmins = await User.countDocuments({ role: 'admin', isActive: true, isOnline: true });
    
    return {
      totalAdmins,
      activeAdmins,
      onlineAdmins,
      hasMinimumAdmins: activeAdmins >= 1
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
};

/**
 * Initialize the system with default administrator
 * This should be called on application startup
 */
const initializeSystem = async () => {
  try {
    console.log('Initializing Emergency Social Network system...');
    
    // First, ensure regions and districts exist (required for admin initialization)
    console.log('Step 1: Ensuring regions and districts are available...');
    await ensureRegionsAndDistricts();
    
    // Second, ensure ESNAdmin user exists (as per Initial-Administrator Rule)
    console.log('Step 2: Initializing default administrator...');
    await initializeDefaultAdmin();
    
    // Get and display admin statistics
    const adminStats = await getAdminStats();
    console.log('Administrator Statistics:');
    console.log(`Total Admins: ${adminStats.totalAdmins}`);
    console.log(`Active Admins: ${adminStats.activeAdmins}`);
    console.log(`Online Admins: ${adminStats.onlineAdmins}`);
    console.log(`Minimum Admins: ${adminStats.hasMinimumAdmins ? 'Yes' : 'No'}`);
    
    // Verify ESNAdmin specifically exists
    const esnAdmin = await User.findOne({ username: 'ESNAdmin' });
    if (esnAdmin) {
      console.log('ESNAdmin user verified and ready');
    } else {
      console.log('WARNING: ESNAdmin user not found after initialization!');
    }
    
    console.log('System initialization completed successfully!');
    
    return adminStats;
  } catch (error) {
    console.error('System initialization failed:', error);
    throw error;
  }
};

export default {
  findCentralRegionAndKampalaDistrict,
  initializeDefaultAdmin,
  validateAdminCount,
  getAdminStats,
  initializeSystem
};
