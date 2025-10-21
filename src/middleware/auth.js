// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Express middleware: verifies Authorization header and attaches req.user
 * Usage: app.use('/api', authMiddleware, ...)
 */
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user's last seen (Socket.io handles online status)
    await User.findByIdAndUpdate(decoded.id, {
      lastSeenAt: new Date()
    });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * verifyJWT(token)
 * Helper to validate a JWT and return the userId (synchronous-ish).
 * Throws on invalid token.
 *
 * Accepts tokens either as:
 *  - 'Bearer <token>' OR
 *  - '<token>'
 *
 * Use this in Socket.io auth middleware: call verifyJWT(handshake.auth.token)
 * It returns the userId (string) if token is valid, otherwise throws.
 */
export const verifyJWT = (rawToken) => {
  if (!rawToken) throw new Error('No token provided');
  // strip "Bearer " if present
  const token = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) throw new Error('Invalid token payload');
    return decoded.id; // caller can fetch the user if needed
  } catch (err) {
    // rethrow so calling code (socket.io) can handle auth failure
    throw err;
  }
};

/**
 * Admin authentication middleware
 * Checks if user is authenticated and has admin role
 */
export const adminAuth = async (req, res, next) => {
  // First check if user is authenticated (from sessionAuth middleware)
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  
  next();
};

export default { authMiddleware, verifyJWT, adminAuth };