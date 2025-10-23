import mongoose from 'mongoose';
import Region from '../models/Region.js';
import District from '../models/District.js';
import { catchAsync, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { sendOK, sendCreated } from '../utils/response.js';

/**
 * Try to find a region by slug -> publicId -> _id
 */
async function findRegionByKey(key) {
  if (!key) return null;

  // try slug
  let region = await Region.findOne({ slug: key }).lean().exec();
  if (region) return region;

  // try publicId
  region = await Region.findOne({ publicId: key }).lean().exec();
  if (region) return region;

  // try _id
  if (mongoose.Types.ObjectId.isValid(key)) {
    region = await Region.findById(key).lean().exec();
    if (region) return region;
  }
  return null;
}

/**
 * GET /regions
 */
export const getAllRegions = catchAsync(async (req, res) => {
  const regions = await Region.find().sort({ name: 1 }).lean().exec();
  sendOK(res, 'Regions retrieved successfully', { regions });
});

/**
 * GET /regions/:key
 * optional ?includeDistricts=true
 */
export const getRegionByKey = catchAsync(async (req, res) => {
  const { key } = req.params;
  const includeDistricts = req.query.includeDistricts === 'true';

  const region = await findRegionByKey(key);
  if (!region) throw new NotFoundError('Region not found');

  const payload = { region };
  if (includeDistricts) {
    const districts = await District.find({ region: region._id }).sort({ name: 1 }).lean().exec();
    payload.districts = districts;
  }

  sendOK(res, 'Region retrieved successfully', payload);
});

/**
 * GET /regions/:regionId/districts
 */
export const getDistrictsByRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    // regionId can be slug/publicId/_id
    const region = await findRegionByKey(regionId);
    if (!region) return res.status(404).json({ message: 'Region not found' });

    const districts = await District.find({ region: region._id }).sort({ name: 1 }).lean().exec();
    return res.json({ districts });
  } catch (err) {
    console.error('getDistrictsByRegion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /regions
 * Admin only
 * Body: { name, description }
 */
export const createRegion = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });

    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Region name is required' });

    // create
    const region = new Region({ name: name.trim(), description });
    await region.save();
    return res.status(201).json({ message: 'Region created', region });
  } catch (err) {
    console.error('createRegion error:', err);
    if (err && err.code === 11000) return res.status(409).json({ message: 'Region already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /regions/:key/update
 * Admin only
 * Body: { name?, description? }
 */
export const updateRegion = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });

    const { key } = req.params;
    const { name, description } = req.body;

    const region = await findRegionByKey(key);
    if (!region) return res.status(404).json({ message: 'Region not found' });

    const doc = await Region.findById(region._id);
    if (name && name.trim()) doc.name = name.trim();
    if (description !== undefined) doc.description = description;

    await doc.save();
    return res.json({ message: 'Region updated', region: doc });
  } catch (err) {
    console.error('updateRegion error:', err);
    if (err && err.code === 11000) return res.status(409).json({ message: 'Region name conflict' });
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /regions/:key/delete
 * Admin only
 */
export const deleteRegion = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: admin only' });

    const { key } = req.params;
    const region = await findRegionByKey(key);
    if (!region) return res.status(404).json({ message: 'Region not found' });

    // prevent delete if districts exist
    const count = await District.countDocuments({ region: region._id });
    if (count > 0) {
      return res.status(400).json({ message: 'Cannot delete region with districts. Remove districts first.' });
    }

    await Region.findByIdAndDelete(region._id);
    return res.json({ message: 'Region deleted' });
  } catch (err) {
    console.error('deleteRegion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export default {
  getAllRegions,
  getRegionByKey,
  getDistrictsByRegion,
  createRegion,
  updateRegion,
  deleteRegion
};
