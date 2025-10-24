import express from 'express';
import authController from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import authValidator from '../validators/authValidator.js';
import sessionAuth from '../middleware/sessionAuth.js';

const router = express.Router();

// Authentication API routes
router.post('/register', validate.validate(authValidator.registerSchema), authController.register);
router.post('/login', validate.validate(authValidator.loginSchema), authController.login);
router.get('/verify', sessionAuth.sessionAuth, authController.verifySession);

export default router;
