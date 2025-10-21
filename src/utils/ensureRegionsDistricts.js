import Region from '../models/Region.js';
import District from '../models/District.js';

/**
 * Comprehensive regions and districts data for Uganda
 * This ensures all regions and districts are available in the database
 */
const REGIONS_AND_DISTRICTS_DATA = [
  {
    name: 'Central',
    description: 'Central Region of Uganda - Includes Kampala and nearby districts',
    districts: [
      'Kampala', 'Wakiso', 'Mukono', 'Kayunga', 'Buikwe', 'Buvuma', 'Kalangala', 
      'Luweero', 'Nakaseke', 'Nakasongola', 'Masaka', 'Mpigi', 'Mityana', 'Kiboga', 
      'Kyankwanzi', 'Butambala', 'Gomba', 'Kalungu', 'Lwengo', 'Sembabule', 
      'Bukomansimbi', 'Buvuma', 'Kalangala', 'Kayunga', 'Kiboga', 'Kyankwanzi', 
      'Luweero', 'Masaka', 'Mityana', 'Mpigi', 'Mukono', 'Nakaseke', 'Nakasongola', 
      'Sembabule', 'Wakiso'
    ]
  },
  {
    name: 'Eastern',
    description: 'Eastern Region of Uganda - Covers Busoga, Bugisu, Bukedi, and Teso sub-regions',
    districts: [
      'Jinja', 'Kamuli', 'Iganga', 'Bugiri', 'Mayuge', 'Namayingo', 'Kaliro', 
      'Buyende', 'Luuka', 'Namutumba', 'Bugweri', 'Amuria', 'Budaka', 'Bududa', 
      'Bulambuli', 'Busia', 'Butaleja', 'Bukedea', 'Kumi', 'Katakwi', 'Kibuku', 
      'Manafwa', 'Mbale', 'Pallisa', 'Serere', 'Sironko', 'Soroti', 'Tororo', 
      'Amuria', 'Budaka', 'Bududa', 'Bulambuli', 'Busia', 'Butaleja', 'Bukedea', 
      'Iganga', 'Jinja', 'Kamuli', 'Kaliro', 'Katakwi', 'Kibuku', 'Kumi', 'Luuka', 
      'Manafwa', 'Mayuge', 'Mbale', 'Namayingo', 'Ngora', 'Pallisa', 'Serere', 
      'Sironko', 'Soroti', 'Tororo'
    ]
  },
  {
    name: 'Northern',
    description: 'Northern Region of Uganda - Covers Acholi, Lango, and West Nile sub-regions',
    districts: [
      'Gulu', 'Kitgum', 'Pader', 'Agago', 'Lamwo', 'Amuru', 'Nwoya', 'Omoro', 
      'Oyam', 'Kole', 'Apac', 'Kwania', 'Dokolo', 'Lira', 'Alebtong', 'Amolatar', 
      'Otuke', 'Adjumani', 'Arua', 'Koboko', 'Moyo', 'Yumbe', 'Zombo', 'Madi-Okollo', 
      'Maracha', 'Nebbi', 'Obongi', 'Pakwach', 'Terego', 'Adjumani', 'Agago', 
      'Alebtong', 'Amolatar', 'Amuru', 'Apac', 'Dokolo', 'Gulu', 'Kole', 'Kitgum', 
      'Koboko', 'Kwania', 'Lamwo', 'Lira', 'Madi-Okollo', 'Maracha', 'Moyo', 
      'Nebbi', 'Nwoya', 'Obongi', 'Omoro', 'Otuke', 'Oyam', 'Pader', 'Pakwach', 
      'Terego', 'Yumbe', 'Zombo'
    ]
  },
  {
    name: 'Western',
    description: 'Western Region of Uganda - Covers Ankole, Toro, Bunyoro, and Kigezi sub-regions',
    districts: [
      'Mbarara', 'Bushenyi', 'Ibanda', 'Isingiro', 'Kiruhura', 'Ntungamo', 
      'Rukungiri', 'Kanungu', 'Kisoro', 'Kabale', 'Buhweju', 'Mitooma', 'Rubirizi', 
      'Sheema', 'Buliisa', 'Bundibugyo', 'Bunyangabu', 'Hoima', 'Kagadi', 'Kamwenge', 
      'Kibaale', 'Kikuube', 'Kyegegwa', 'Kyenjojo', 'Masindi', 'Ntoroko', 'Buliisa', 
      'Bundibugyo', 'Bunyangabu', 'Bushenyi', 'Hoima', 'Ibanda', 'Isingiro', 
      'Kabale', 'Kagadi', 'Kamwenge', 'Kanungu', 'Kibaale', 'Kiruhura', 'Kisoro', 
      'Kikuube', 'Kyegegwa', 'Kyenjojo', 'Masindi', 'Mbarara', 'Ntungamo', 'Ntoroko', 
      'Rubirizi', 'Rukungiri', 'Sheema'
    ]
  }
];

/**
 * Check if regions and districts already exist in the database
 */
export const checkExistingData = async () => {
  try {
    const regionCount = await Region.countDocuments();
    const districtCount = await District.countDocuments();
    
    return {
      hasRegions: regionCount > 0,
      hasDistricts: districtCount > 0,
      regionCount,
      districtCount
    };
  } catch (error) {
    console.error('Error checking existing data:', error);
    throw error;
  }
};

/**
 * Create a single region with its districts
 */
const createRegionWithDistricts = async (regionData) => {
  try {
    console.log(`Creating region: ${regionData.name}`);
    
    // Create the region
    const region = new Region({
      name: regionData.name,
      description: regionData.description
    });
    await region.save();
    
    console.log(`Region ${regionData.name} created with ID: ${region._id}`);
    
    // Create districts for this region
    const createdDistricts = [];
    for (const districtName of regionData.districts) {
      // Remove duplicates and create unique districts
      if (!createdDistricts.includes(districtName)) {
        console.log(`  Creating district: ${districtName}`);
        
        const district = new District({
          name: districtName,
          region: region._id
        });
        await district.save();
        createdDistricts.push(districtName);
      }
    }
    
    console.log(`Created ${createdDistricts.length} districts for ${regionData.name}`);
    return { region, districts: createdDistricts };
    
  } catch (error) {
    console.error(`Error creating region ${regionData.name}:`, error);
    throw error;
  }
};

/**
 * Seed all regions and districts if they don't exist
 */
export const seedRegionsAndDistricts = async () => {
  try {
    // Check existing data
    const existingData = await checkExistingData();
    
    if (existingData.hasRegions && existingData.hasDistricts) {
      return {
        success: true,
        message: 'Data already exists',
        regionCount: existingData.regionCount,
        districtCount: existingData.districtCount
      };
    }
    
    // If we have some data but not complete, we might need to clean up
    if (existingData.hasRegions || existingData.hasDistricts) {
      // Check if we have all required regions
      const requiredRegionNames = REGIONS_AND_DISTRICTS_DATA.map(r => r.name.toLowerCase());
      const existingRegions = await Region.find({});
      const existingRegionNames = existingRegions.map(r => r.name.toLowerCase());
      
      const missingRegions = requiredRegionNames.filter(name => !existingRegionNames.includes(name));
      
      if (missingRegions.length > 0) {
        // For now, we'll proceed with seeding all data to ensure completeness
      }
    }
    
    // Create all regions and districts
    const results = [];
    for (const regionData of REGIONS_AND_DISTRICTS_DATA) {
      const result = await createRegionWithDistricts(regionData);
      results.push(result);
    }
    
    // Get final counts
    const finalRegionCount = await Region.countDocuments();
    const finalDistrictCount = await District.countDocuments();
    
    return {
      success: true,
      message: 'Seeding completed successfully',
      regionCount: finalRegionCount,
      districtCount: finalDistrictCount,
      results
    };
    
  } catch (error) {
    console.error('Error seeding regions and districts:', error);
    throw error;
  }
};

/**
 * Ensure Central region and Kampala district exist
 * This is specifically needed for admin initialization
 */
export const ensureCentralRegionAndKampala = async () => {
  try {
    // Check if Central region exists
    let centralRegion = await Region.findOne({ 
      name: { $regex: /^central$/i } 
    });
    
    if (!centralRegion) {
      centralRegion = new Region({
        name: 'Central',
        description: 'Central Region of Uganda - Includes Kampala and nearby districts'
      });
      await centralRegion.save();
    }
    
    // Check if Kampala district exists
    let kampalaDistrict = await District.findOne({ 
      name: { $regex: /^kampala$/i },
      region: centralRegion._id
    });
    
    if (!kampalaDistrict) {
      kampalaDistrict = new District({
        name: 'Kampala',
        region: centralRegion._id
      });
      await kampalaDistrict.save();
    }
    
    return { centralRegion, kampalaDistrict };
    
  } catch (error) {
    console.error('Error ensuring Central region and Kampala district:', error);
    throw error;
  }
};

/**
 * Main function to ensure all regions and districts are available
 * This should be called before admin initialization
 */
export const ensureRegionsAndDistricts = async () => {
  try {
    // First, ensure we have the basic data structure
    await seedRegionsAndDistricts();
    
    // Then, specifically ensure Central region and Kampala district for admin
    const { centralRegion, kampalaDistrict } = await ensureCentralRegionAndKampala();
    
    return {
      success: true,
      centralRegion,
      kampalaDistrict,
      message: 'Regions and districts are ready for use'
    };
    
  } catch (error) {
    console.error('Critical error ensuring regions and districts:', error);
    throw error;
  }
};

export default ensureRegionsAndDistricts;
