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

export default router;
