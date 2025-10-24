// src/middleware/sessionAuth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Session-based authentication middleware
 * Checks for user in session instead of JWT in headers
 */
const sessionAuth = async (req, res, next) => {
  try {
    // Check if user is already in session
    if (req.session && req.session.user) {
      // Verify user still exists and is active
      const { default: User } = await import('../models/User.js');
      const user = await User.findById(req.session.user.id);
      
      if (!user) {
        // User no longer exists, destroy session
        await destroySession(req);
        if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
          return res.status(401).json({ message: 'User not found' });
        } else {
          return res.redirect('/login');
        }
      }

      // Check if account is active
      if (!user.isActive) {
        // Account is inactive, destroy session
        await destroySession(req);
        
        if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
          return res.status(403).json({ 
            message: 'Your account has been deactivated. Please contact an administrator.',
            redirectTo: '/login'
          });
        } else {
          req.flash('error', 'Your account has been deactivated. Please contact an administrator.');
          return res.redirect('/login');
        }
      }

      // Map session user to expected format with _id
      req.user = {
        ...req.session.user,
        _id: req.session.user.id,
        id: req.session.user.id  // Also keep id for backward compatibility
      };
      return next();
    }

    // If no user in session, check if this is an API route or page route
    if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
      return res.status(401).json({ message: 'No active session' });
    } else {
      // For page routes, redirect to login
      return res.redirect('/login');
    }
  } catch (err) {
    if (req.path.startsWith('/') && !req.path.startsWith('/admin/') && !req.path.startsWith('/login') && !req.path.startsWith('/register') && !req.path.startsWith('/logout')) {
      return res.status(401).json({ message: 'Invalid session' });
    } else {
      return res.redirect('/login');
    }
  }
};

/**
 * Login and create session
 */
const createSession = async (req, user) => {
  // Store user in session
  req.session.user = {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isOnline: user.isOnline,
    email: user.email,
    phone: user.phone,
    region: user.region,
    district: user.district,
    community: user.community
  };

  // Save session
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Logout and destroy session
 */
const destroySession = (req) => {
  return new Promise((resolve, reject) => {
    // Clear session data
    if (req.session) {
      req.session.user = null;
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Destroy the session completely
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            reject(destroyErr);
          } else {
            // Clear any remaining session data
            req.session = null;
            resolve();
          }
        });
      });
    } else {
      resolve();
    }
  });
};

export default {
  sessionAuth,
  createSession,
  destroySession
};
