import mongoose from 'mongoose';
import District from '../models/District.js';
import Region from '../models/Region.js';
import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';

/**
 * Try to find district by slug -> publicId -> _id
 */
async function findDistrictByKey(key) {
  if (!key) return null;

  let district = await District.findOne({ slug: key }).lean().exec();
  if (district) return district;

  district = await District.findOne({ publicId: key }).lean().exec();
  if (district) return district;

  if (mongoose.Types.ObjectId.isValid(key)) {
    district = await District.findById(key).lean().exec();
    if (district) return district;
  }
  return null;
}

/**
 * GET /districts
 * Optional query: ?region=<regionKey>
 */
export const getAllDistricts = errorHandler.catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.region) {
    // region can be name/slug/publicId/_id
    const regionKey = req.query.region;
    let region = await Region.findOne({ name: regionKey }).lean().exec();
    if (!region) region = await Region.findOne({ slug: regionKey }).lean().exec();
    if (!region) region = await Region.findOne({ publicId: regionKey }).lean().exec();
    if (!region && mongoose.Types.ObjectId.isValid(regionKey)) region = await Region.findById(regionKey).lean().exec();
    if (!region) throw new errorHandler.ValidationError('Invalid region filter');
    filter.region = region._id;
  }

  const districts = await District.find(filter).sort({ name: 1 }).populate('region', 'name slug publicId').lean().exec();
  response.sendOK(res, 'Districts retrieved successfully', { districts });
});

/**
 * GET /districts/:key
 */
export const getDistrictByKey = errorHandler.catchAsync(async (req, res) => {
  const { key } = req.params;
  const district = await findDistrictByKey(key);
  if (!district) throw new errorHandler.NotFoundError('District not found');

  // populate region
  const populated = await District.findById(district._id).populate('region', 'name slug publicId').exec();
  response.sendOK(res, 'District retrieved successfully', { district: populated });
});

/**
 * POST /districts
 * Admin only
 * Body: { name, region } where region is slug|publicId|_id
 */
export const createDistrict = errorHandler.catchAsync(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new errorHandler.AuthorizationError('Forbidden: admin only');

  const { name, region: regionKey } = req.body;
  if (!name || !regionKey) throw new errorHandler.ValidationError('name and region are required');

  // resolve region key
  let region = await Region.findOne({ slug: regionKey }).lean().exec();
  if (!region) region = await Region.findOne({ publicId: regionKey }).lean().exec();
  if (!region && mongoose.Types.ObjectId.isValid(regionKey)) region = await Region.findById(regionKey).lean().exec();
  if (!region) throw new errorHandler.ValidationError('Invalid region id');

  // Prevent duplicate district in same region
  const exists = await District.findOne({ name: name.trim(), region: region._id }).lean().exec();
  if (exists) throw new errorHandler.ConflictError('District already exists in this region');

  const district = new District({ name: name.trim(), region: region._id });
  await district.save();

  const populated = await District.findById(district._id).populate('region', 'name slug publicId').exec();
  response.sendCreated(res, 'District created successfully', { district: populated });
});

/**
 * POST /districts/:key/update
 * Admin only
 */
export const updateDistrict = errorHandler.catchAsync(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new errorHandler.AuthorizationError('Forbidden: admin only');

  const { key } = req.params;
  const { name, region: regionKey } = req.body;

  const district = await findDistrictByKey(key);
  if (!district) throw new errorHandler.NotFoundError('District not found');

  const doc = await District.findById(district._id);
  if (name && name.trim()) doc.name = name.trim();

  if (regionKey) {
    let region = await Region.findOne({ slug: regionKey }).lean().exec();
    if (!region) region = await Region.findOne({ publicId: regionKey }).lean().exec();
    if (!region && mongoose.Types.ObjectId.isValid(regionKey)) region = await Region.findById(regionKey).lean().exec();
    if (!region) throw new errorHandler.ValidationError('Invalid region id');
    doc.region = region._id;
  }

  await doc.save();
  const populated = await District.findById(doc._id).populate('region', 'name slug publicId').exec();
  response.sendOK(res, 'District updated successfully', { district: populated });
});

/**
 * POST /districts/:key/delete
 * Admin only
 */
export const deleteDistrict = errorHandler.catchAsync(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new errorHandler.AuthorizationError('Forbidden: admin only');

  const { key } = req.params;
  const district = await findDistrictByKey(key);
  if (!district) throw new errorHandler.NotFoundError('District not found');

  // You may want to check for communities or users in this district before deleting
  await District.findByIdAndDelete(district._id);
  response.sendOK(res, 'District deleted successfully');
});

export default {
  getAllDistricts,
  getDistrictByKey,
  createDistrict,
  updateDistrict,
  deleteDistrict
};
