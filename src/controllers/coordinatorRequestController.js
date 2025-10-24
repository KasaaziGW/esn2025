import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import CoordinatorRequest from '../models/CoordinatorRequest.js';
import User from '../models/User.js';
import Community from '../models/Community.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'src/uploads/coordinator-requests/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new errorHandler.ValidationError('Only PDF, Word documents, and image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * Submit a coordinator request
 * POST /coordinator-requests
 */
const submitCoordinatorRequest = errorHandler.catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { position, organization, requestDetails } = req.body;
  
  console.log('=== SUBMIT COORDINATOR REQUEST ===');
  console.log('User ID:', userId);
  console.log('Position:', position);
  console.log('Organization:', organization);
  
  // Check if user is in a community
  const user = await User.findById(userId).populate('community');
  if (!user) {
    throw new errorHandler.NotFoundError('User not found');
  }
  
  if (!user.community) {
    throw new errorHandler.ValidationError('You must be a member of a community to request coordinator role');
  }
  
  // Check if user already has a pending or approved request
  const existingRequest = await CoordinatorRequest.findOne({
    user: userId,
    community: user.community._id,
    status: { $in: ['pending', 'approved'] }
  });
  
  if (existingRequest) {
    throw new errorHandler.ValidationError('You already have a coordinator request for this community');
  }
  
  // Handle file upload
  let attachmentData = null;
  if (req.file) {
    attachmentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };
  }
  
  // Create coordinator request
  const coordinatorRequest = await CoordinatorRequest.create({
    user: userId,
    community: user.community._id,
    position,
    organization,
    requestDetails,
    attachment: attachmentData,
    status: 'pending'
  });
  
  // Update user's coordinatorRequest field
  user.coordinatorRequest = coordinatorRequest._id;
  await user.save();
  
  console.log('Coordinator request created:', coordinatorRequest._id);
  
  response.sendCreated(res, 'Coordinator request submitted successfully', {
    request: {
      id: coordinatorRequest._id,
      position,
      organization,
      status: 'pending',
      requestedAt: coordinatorRequest.requestedAt
    }
  });
});

/**
 * Get coordinator requests (for admins)
 * GET /coordinator-requests
 */
const getCoordinatorRequests = errorHandler.catchAsync(async (req, res) => {
  const { status, community } = req.query;
  
  console.log('=== GET COORDINATOR REQUESTS ===');
  console.log('Status filter:', status);
  console.log('Community filter:', community);
  
  let filter = {};
  if (status) {
    filter.status = status;
  }
  if (community) {
    filter.community = community;
  }
  
  const requests = await CoordinatorRequest.find(filter)
    .populate('user', 'username displayName email phone avatarUrl')
    .populate({
      path: 'community',
      select: 'name region district',
      populate: [
        { path: 'region', select: 'name' },
        { path: 'district', select: 'name' }
      ]
    })
    .populate('reviewedBy', 'username displayName')
    .sort({ requestedAt: -1 });
  
  console.log('Found requests:', requests.length);
  
  response.sendOK(res, 'Coordinator requests retrieved successfully', {
    requests: requests.map(req => ({
      id: req._id,
      user: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        email: req.user.email,
        phone: req.user.phone,
        avatarUrl: req.user.avatarUrl
      },
      community: {
        id: req.community._id,
        name: req.community.name,
        region: req.community.region?.name || req.community.region,
        district: req.community.district?.name || req.community.district
      },
      position: req.position,
      organization: req.organization,
      requestDetails: req.requestDetails,
      attachment: req.attachment,
      status: req.status,
      reviewedBy: req.reviewedBy ? {
        id: req.reviewedBy._id,
        username: req.reviewedBy.username,
        displayName: req.reviewedBy.displayName
      } : null,
      adminComments: req.adminComments,
      requestedAt: req.requestedAt,
      reviewedAt: req.reviewedAt
    }))
  });
});

/**
 * Review coordinator request (approve/reject)
 * POST /coordinator-requests/:requestId/review
 */
const reviewCoordinatorRequest = errorHandler.catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const { action, adminComments } = req.body; // action: 'approve' or 'reject'
  const adminId = req.user.id;
  
  console.log('=== REVIEW COORDINATOR REQUEST ===');
  console.log('Request ID:', requestId);
  console.log('Action:', action);
  console.log('Admin ID:', adminId);
  
  if (!['approve', 'reject'].includes(action)) {
    throw new errorHandler.ValidationError('Action must be either "approve" or "reject"');
  }
  
  const request = await CoordinatorRequest.findById(requestId)
    .populate('user')
    .populate('community');
  
  if (!request) {
    throw new errorHandler.NotFoundError('Coordinator request not found');
  }
  
  if (request.status !== 'pending') {
    throw new errorHandler.ValidationError('This request has already been reviewed');
  }
  
  // Update request status
  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.adminComments = adminComments;
  
  await request.save();
  
  // If approved, update user role
  if (action === 'approve') {
    const user = await User.findById(request.user._id);
    user.role = 'coordinator';
    await user.save();
    
    console.log('User role updated to coordinator:', user.username);
  }
  
  console.log('Request reviewed:', action);
  
  response.sendOK(res, `Coordinator request ${action}d successfully`, {
    request: {
      id: request._id,
      status: request.status,
      reviewedAt: request.reviewedAt,
      adminComments: request.adminComments
    }
  });
});

/**
 * Get user's coordinator request status
 * GET /coordinator-requests/my-request
 */
const getMyCoordinatorRequest = errorHandler.catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  console.log('=== GET MY COORDINATOR REQUEST ===');
  console.log('User ID:', userId);
  
  const user = await User.findById(userId).populate('coordinatorRequest');
  
  if (!user) {
    throw new errorHandler.NotFoundError('User not found');
  }
  
  if (!user.coordinatorRequest) {
    return response.sendOK(res, 'No coordinator request found', {
      request: null
    });
  }
  
  const request = await CoordinatorRequest.findById(user.coordinatorRequest._id)
    .populate({
      path: 'community',
      select: 'name region district',
      populate: [
        { path: 'region', select: 'name' },
        { path: 'district', select: 'name' }
      ]
    })
    .populate('reviewedBy', 'username displayName');
  
  response.sendOK(res, 'Coordinator request retrieved successfully', {
    request: {
      id: request._id,
      community: {
        id: request.community._id,
        name: request.community.name,
        region: request.community.region?.name || request.community.region,
        district: request.community.district?.name || request.community.district
      },
      position: request.position,
      organization: request.organization,
      requestDetails: request.requestDetails,
      attachment: request.attachment,
      status: request.status,
      reviewedBy: request.reviewedBy ? {
        id: request.reviewedBy._id,
        username: request.reviewedBy.username,
        displayName: request.reviewedBy.displayName
      } : null,
      adminComments: request.adminComments,
      requestedAt: request.requestedAt,
      reviewedAt: request.reviewedAt
    }
  });
});

export default {
  upload,
  submitCoordinatorRequest,
  getCoordinatorRequests,
  reviewCoordinatorRequest,
  getMyCoordinatorRequest
};
