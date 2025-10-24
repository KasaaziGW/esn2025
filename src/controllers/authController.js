import jwt from 'jsonwebtoken';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import User from '../models/User.js';
import errorHandler from '../middleware/errorHandler.js';
import response from '../utils/response.js';
import countryCodes from '../utils/countryCodes.js';
import sessionAuth from '../middleware/sessionAuth.js';

/**
 * Helper: sign JWT (returns token)
 * Keep token short-lived in production (and consider refresh tokens).
 */
const signToken = (user, customExpiry = null) => {
  const payload = { id: user._id, role: user.role };
  const secret = process.env.JWT_SECRET;
  const expiresIn = customExpiry || process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Helper: normalize phone using libphonenumber-js
 * Returns E.164 string (e.g., +256701234567) or null if invalid.
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  
  // First try to parse as-is
  try {
    const parsed = parsePhoneNumberFromString(String(rawPhone));
    if (parsed && parsed.isValid()) {
      return parsed.number; // E.164
    }
  } catch (err) {
    // Continue to fallback
  }
  
  // If parsing fails, try with common country codes
  const phoneStr = String(rawPhone).replace(/\D/g, ''); // Remove non-digits
  if (phoneStr.length >= 7 && phoneStr.length <= 15) {
    // Get sorted country codes (longest first for better matching)
    const sortedCountryCodes = countryCodes.getSortedCountryCodes();
    
    for (const countryCode of sortedCountryCodes) {
      try {
        const parsed = parsePhoneNumberFromString(countryCode + phoneStr);
        if (parsed && parsed.isValid()) {
          return parsed.number; // E.164
        }
      } catch (err) {
        // Continue to next country code
      }
    }
    
    // If all else fails but it's a reasonable length, accept it as-is
    return '+' + phoneStr;
  }
  
  return null;
}

/**
 * Register (self-signup)
 * Required inputs:
 *   - username (required)
 *   - password (required)
 *   - at least one of email or phone (enforced by validator middleware)
 * Optional:
 *   - displayName, firstName, lastName
 */
export const register = errorHandler.catchAsync(async (req, res, next) => {
  const {
    username,
    password,
    email: rawEmail,
    phone: rawPhone,
    displayName,
    firstName,
    lastName
  } = req.body;

  // Normalize inputs
  const email = rawEmail ? String(rawEmail).toLowerCase() : undefined;
  const phone = rawPhone ? normalizePhone(rawPhone) : undefined;

  // Ensure at least one identifier present
  if (!email && !phone) {
    throw new errorHandler.ValidationError('Either email or phone is required.');
  }

  // Basic uniqueness checks
  if (await User.findOne({ username })) {
    throw new errorHandler.ConflictError('Username already taken.');
  }
  if (email && await User.findOne({ email })) {
    throw new errorHandler.ConflictError('Email already in use.');
  }
  if (phone && await User.findOne({ phone })) {
    throw new errorHandler.ConflictError('Phone already in use.');
  }

  // Create user
  const user = new User({
    username,
    email: email || undefined,
    phone: phone || undefined,
    displayName,
    firstName,
    lastName
  });

  // Hash & set password via model helper
  await user.setPassword(password);

  // Save user
  await user.save();

  // Sign token
  const token = signToken(user);

  response.sendCreated(res, 'Registration successful. Please update your profile with region and district to join a community.', {
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      email: user.email,
      phone: user.phone,
      community: user.community
    },
    token
  });
});

/**
 * Login
 * Body:
 *  - identifier (username | email | phone)
 *  - password
 */
export const login = errorHandler.catchAsync(async (req, res, next) => {
  const { identifier, username, email, phone, password, rememberMe } = req.body;
  
  if (!password) {
    throw new errorHandler.ValidationError('Password is required.');
  }

  // Determine the identifier to use
  let normalizedIdentifier;
  if (identifier) {
    // For identifier, try both exact match and lowercase match
    normalizedIdentifier = identifier;
  } else if (username) {
    normalizedIdentifier = username.toLowerCase();
  } else if (email) {
    normalizedIdentifier = email.toLowerCase();
  } else if (phone) {
    normalizedIdentifier = normalizePhone(phone) || phone;
  } else {
    throw new errorHandler.ValidationError('Username, email, phone, or identifier is required.');
  }

  // Normalize identifier: try phone normalization if it's not already normalized
  if (!email && !username && !identifier) {
    const maybePhone = normalizePhone(normalizedIdentifier);
    if (maybePhone) normalizedIdentifier = maybePhone;
  }

  // Find user by username/email/phone
  const user = await User.findByIdentifier(normalizedIdentifier);
  if (!user) {
    throw new errorHandler.AuthenticationError('Invalid credentials.');
  }

  // Check if account is locked
  if (typeof user.isLocked === 'function' && user.isLocked()) {
    throw new errorHandler.AuthenticationError('Account locked due to too many failed login attempts. Try later.');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new errorHandler.AuthenticationError('Your account has been deactivated. Please contact an administrator for assistance.');
  }

  // Validate password
  const valid = await user.comparePassword(password);
  if (!valid) {
    // Increment login attempts and optionally set lockUntil when threshold reached
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    // Example lockout policy: lock account for 1 hour after 5 failed attempts
    const MAX_ATTEMPTS = 5;
    if (user.loginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = Date.now() + 1000 * 60 * 60; // 1 hour
    }
    await user.save();
    throw new errorHandler.AuthenticationError('Invalid username or password.');
  }

  // Successful login: reset attempts, mark online, update lastSeenAt
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.isOnline = true;
  user.lastSeenAt = new Date();
  await user.save();
  console.log(`Login: User ${user._id} (${user.username}) is now online`);

  // Create secure session
  await sessionAuth.createSession(req, user);

  response.sendOK(res, 'Login successful', {
    redirectTo: '/dashboard', // Default redirect after login
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isOnline: user.isOnline,
      email: user.email,
      phone: user.phone
    }
  });
});

/**
 * Logout
 * - Expects auth middleware that sets req.user (decoded JWT).
 * - For stateless JWTs the client should simply delete the token; we mark user offline here.
 */
export const logout = errorHandler.catchAsync(async (req, res, next) => {
  // Handle case where user is already logged out (idempotent operation)
  if (!req.session || !req.session.user) {
    // Set headers to prevent caching and back button access
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"'
    });
    
    return response.sendOK(res, 'Already logged out', {
      redirectTo: '/login'
    });
  }

  const user = await User.findById(req.session.user.id);
  if (user) {
    console.log(`Logout: User ${user._id} (${user.username}) is now offline`);
    user.isOnline = false;
    user.lastSeenAt = new Date();
    await user.save();
    
    // Emit offline status to admin room via Socket.io
    try {
      const { getIO } = await import('../services/Socket.js');
      const io = getIO();
      io.to('admin-room').emit('userOnlineStatusChanged', {
        userId: user._id.toString(),
        isOnline: false,
        lastSeenAt: new Date(),
        username: user.username
      });
      console.log(`Logout: Emitted offline status for user ${user._id}`);
    } catch (error) {
      console.warn('Failed to emit offline status via Socket.io:', error);
    }
  } else {
    console.log(`Logout: User ${req.session.user.id} not found in database`);
  }

  // Destroy session
  await sessionAuth.destroySession(req);
  
  // Set headers to prevent caching and back button access
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"'
  });
  
  response.sendOK(res, 'Logged out successfully', {
    redirectTo: '/login'
  });
});

/**
 * Verify Session
 * Returns user info if session is valid
 */
export const verifySession = errorHandler.catchAsync(async (req, res, next) => {
  if (!req.session || !req.session.user) {
    throw new errorHandler.AuthenticationError('No active session.');
  }

  // Verify user still exists and is active
  const user = await User.findById(req.session.user.id).select('-password');
  if (!user) {
    // User no longer exists, destroy session
    await sessionAuth.destroySession(req);
    throw new errorHandler.AuthenticationError('User not found.');
  }

  response.sendOK(res, 'Session is valid', {
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isOnline: user.isOnline,
      email: user.email,
      phone: user.phone
    }
  });
});

export default {
  register,
  login,
  logout,
  verifySession
};
