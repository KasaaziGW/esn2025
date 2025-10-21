import User from '../models/User.js';
import { catchAsync, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { sendOK, sendCreated } from '../utils/response.js';

/**
 * Add emergency contact
 * POST /api/emergency/contacts
 */
export const addEmergencyContact = catchAsync(async (req, res) => {
  const { name, phone, email, relationship, priority, isPrimary, canReceiveAlerts } = req.body;
  const user = req.user;

  // Validate required fields
  if (!name || !phone) {
    throw new ValidationError('Name and phone are required');
  }

  // Validate relationship
  const validRelationships = ['family', 'friend', 'neighbor', 'colleague', 'other'];
  if (relationship && !validRelationships.includes(relationship)) {
    throw new ValidationError('Invalid relationship type');
  }

  // If setting as primary, unset other primary contacts
  if (isPrimary) {
    await User.updateOne(
      { _id: user._id, 'emergencyContacts.isPrimary': true },
      { $set: { 'emergencyContacts.$.isPrimary': false } }
    );
  }

  const newContact = {
    name,
    phone,
    email,
    relationship: relationship || 'other',
    priority: priority || 1,
    isPrimary: isPrimary || false,
    canReceiveAlerts: canReceiveAlerts !== false
  };

  await User.findByIdAndUpdate(
    user._id,
    { $push: { emergencyContacts: newContact } }
  );

  sendCreated(res, 'Emergency contact added successfully', newContact);
});

/**
 * Get user's emergency contacts
 * GET /api/emergency/contacts
 */
export const getEmergencyContacts = catchAsync(async (req, res) => {
  const user = req.user;

  const userWithContacts = await User.findById(user._id)
    .select('emergencyContacts emergencySettings');

  sendOK(res, 'Emergency contacts retrieved successfully', {
    contacts: userWithContacts.emergencyContacts || [],
    settings: userWithContacts.emergencySettings || {}
  });
});

/**
 * Update emergency contact
 * PUT /api/emergency/contacts/:contactId
 */
export const updateEmergencyContact = catchAsync(async (req, res) => {
  const { contactId } = req.params;
  const { name, phone, email, relationship, priority, isPrimary, canReceiveAlerts } = req.body;
  const user = req.user;

  // Validate relationship if provided
  const validRelationships = ['family', 'friend', 'neighbor', 'colleague', 'other'];
  if (relationship && !validRelationships.includes(relationship)) {
    throw new ValidationError('Invalid relationship type');
  }

  // If setting as primary, unset other primary contacts
  if (isPrimary) {
    await User.updateOne(
      { _id: user._id, 'emergencyContacts.isPrimary': true },
      { $set: { 'emergencyContacts.$.isPrimary': false } }
    );
  }

  const updateFields = {};
  if (name !== undefined) updateFields['emergencyContacts.$.name'] = name;
  if (phone !== undefined) updateFields['emergencyContacts.$.phone'] = phone;
  if (email !== undefined) updateFields['emergencyContacts.$.email'] = email;
  if (relationship !== undefined) updateFields['emergencyContacts.$.relationship'] = relationship;
  if (priority !== undefined) updateFields['emergencyContacts.$.priority'] = priority;
  if (isPrimary !== undefined) updateFields['emergencyContacts.$.isPrimary'] = isPrimary;
  if (canReceiveAlerts !== undefined) updateFields['emergencyContacts.$.canReceiveAlerts'] = canReceiveAlerts;

  const result = await User.updateOne(
    { _id: user._id, 'emergencyContacts._id': contactId },
    { $set: updateFields }
  );

  if (result.matchedCount === 0) {
    throw new NotFoundError('Emergency contact not found');
  }

  sendOK(res, 'Emergency contact updated successfully');
});

/**
 * Delete emergency contact
 * DELETE /api/emergency/contacts/:contactId
 */
export const deleteEmergencyContact = catchAsync(async (req, res) => {
  const { contactId } = req.params;
  const user = req.user;

  const result = await User.updateOne(
    { _id: user._id },
    { $pull: { emergencyContacts: { _id: contactId } } }
  );

  if (result.matchedCount === 0) {
    throw new NotFoundError('Emergency contact not found');
  }

  sendOK(res, 'Emergency contact deleted successfully');
});

/**
 * Update emergency settings
 * PUT /api/emergency/settings
 */
export const updateEmergencySettings = catchAsync(async (req, res) => {
  const { 
    shareLocation, 
    autoShareLocationInEmergency, 
    alertPreferences 
  } = req.body;
  const user = req.user;

  const updateFields = {};
  
  if (shareLocation !== undefined) {
    updateFields['emergencySettings.shareLocation'] = shareLocation;
  }
  
  if (autoShareLocationInEmergency !== undefined) {
    updateFields['emergencySettings.autoShareLocationInEmergency'] = autoShareLocationInEmergency;
  }
  
  if (alertPreferences) {
    if (alertPreferences.emergencyAlerts !== undefined) {
      updateFields['emergencySettings.alertPreferences.emergencyAlerts'] = alertPreferences.emergencyAlerts;
    }
    if (alertPreferences.weatherAlerts !== undefined) {
      updateFields['emergencySettings.alertPreferences.weatherAlerts'] = alertPreferences.weatherAlerts;
    }
    if (alertPreferences.securityAlerts !== undefined) {
      updateFields['emergencySettings.alertPreferences.securityAlerts'] = alertPreferences.securityAlerts;
    }
    if (alertPreferences.healthAlerts !== undefined) {
      updateFields['emergencySettings.alertPreferences.healthAlerts'] = alertPreferences.healthAlerts;
    }
  }

  await User.findByIdAndUpdate(user._id, { $set: updateFields });

  sendOK(res, 'Emergency settings updated successfully');
});

/**
 * Get emergency settings
 * GET /api/emergency/settings
 */
export const getEmergencySettings = catchAsync(async (req, res) => {
  const user = req.user;

  const userWithSettings = await User.findById(user._id)
    .select('emergencySettings currentStatus location lastSeenAt');

  sendOK(res, 'Emergency settings retrieved successfully', {
    settings: userWithSettings.emergencySettings || {},
    currentStatus: userWithSettings.currentStatus,
    location: userWithSettings.location,
    lastSeenAt: userWithSettings.lastSeenAt
  });
});

/**
 * Update user emergency status
 * PATCH /api/emergency/status
 */
export const updateEmergencyStatus = catchAsync(async (req, res) => {
  const { currentStatus, location, locationDescription } = req.body;
  const user = req.user;

  // Validate status
  const validStatuses = ['safe', 'needs_help', 'injured', 'missing', 'lost', 'available_to_help', 'unknown'];
  if (currentStatus && !validStatuses.includes(currentStatus)) {
    throw new ValidationError('Invalid emergency status');
  }

  const updateFields = {};
  
  if (currentStatus !== undefined) {
    updateFields.currentStatus = currentStatus;
    updateFields.lastSeenAt = new Date();
  }
  
  if (location !== undefined) {
    updateFields.location = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    };
  }

  await User.findByIdAndUpdate(user._id, { $set: updateFields });

  // Emit status update to community
  if (user.community) {
    const io = require('../services/Socket.js').getIO();
    io.emit('user:status_updated', {
      userId: user._id,
      username: user.username,
      currentStatus: currentStatus || user.currentStatus,
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      } : user.location,
      community: user.community,
      updatedAt: new Date()
    });
  }

  sendOK(res, 'Emergency status updated successfully', {
    currentStatus: currentStatus || user.currentStatus,
    location: location ? {
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    } : user.location,
    lastSeenAt: new Date()
  });
});

export default {
  addEmergencyContact,
  getEmergencyContacts,
  updateEmergencyContact,
  deleteEmergencyContact,
  updateEmergencySettings,
  getEmergencySettings,
  updateEmergencyStatus
};
