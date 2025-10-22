import express from 'express';
import { 
  submitCoordinatorRequest, 
  getCoordinatorRequests, 
  reviewCoordinatorRequest, 
  getMyCoordinatorRequest,
  upload
} from '../controllers/coordinatorRequestController.js';
import { sessionAuth } from '../middleware/sessionAuth.js';
import { adminAuth } from '../middleware/auth.js';
import CommunityMember from '../models/communityMember.js';

const router = express.Router();

// Submit coordinator request (citizens only)
router.post('/', 
  sessionAuth, 
  upload.single('attachment'), 
  submitCoordinatorRequest
);

// Get my coordinator request status
router.get('/my-request', sessionAuth, getMyCoordinatorRequest);

// Get all coordinator requests (admins only)
router.get('/', sessionAuth, adminAuth, getCoordinatorRequests);

// Review coordinator request (admins only)
router.put('/:requestId/review', sessionAuth, adminAuth, reviewCoordinatorRequest);

// Admin coordinator requests page
router.get('/admin', sessionAuth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'Access denied. Admin privileges required.'
      }
    });
  }
  
  // Check if user has joined any community (though admins are exempt)
  const communityMembership = await CommunityMember.findOne({ user: req.user._id });
  const hasJoinedCommunity = !!communityMembership;
  
  res.render('admin-coordinator-requests', {
    user: req.user,
    hasJoinedCommunity: hasJoinedCommunity
  });
});

export default router;
