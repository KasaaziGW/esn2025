import express from 'express';
import { register, login, verifySession } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { sessionAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// Authentication API routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/verify', sessionAuth, verifySession);

export default router;
