import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Schema } = mongoose;

/* GeoJSON point for location (optional) */
const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]
}, { _id: false });

const CoordinatorRequestSchema = new Schema({
  community: { type: Schema.Types.ObjectId, ref: 'Community' },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date }
}, { _id: false });

const MembershipHistorySchema = new Schema({
  community: { type: Schema.Types.ObjectId, ref: 'Community' },
  joinedAt: { type: Date },
  leftAt: { type: Date }
}, { _id: false });

const UserSchema = new Schema({
  // Identity & authentication
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: function() { return this.isNew; } },

  // Profile
  displayName: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  avatarUrl: { type: String },
  bio: { type: String, maxlength: 1000 },

  // Location & community selection
  region: { type: Schema.Types.ObjectId, ref: 'Region' },
  district: { type: Schema.Types.ObjectId, ref: 'District' },
  community: { type: Schema.Types.ObjectId, ref: 'Community', default: null }, // selected after registration

  // Role & account state
  role: { type: String, enum: ['citizen', 'coordinator', 'admin'], default: 'citizen' },
  coordinatorRequest: { type: CoordinatorRequestSchema, default: null }, // request to be coordinator
  membershipHistory: { type: [MembershipHistorySchema], default: [] },

  isActive: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },

  // Emergency-specific
  currentStatus: {
    type: String,
    enum: [
      'safe',
      'needs_help',
      'injured',
      'missing',
      'lost',
      'available_to_help',
      'unknown'
    ],
    default: 'safe'
  },
  statusMessage: { type: String }, // Optional message with the status update
  lastSeenAt: { type: Date },
  location: GeoPointSchema, // optional user-shared location

  // Social / connections
  contacts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  
  // Emergency contact management
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    relationship: { type: String, enum: ['family', 'friend', 'neighbor', 'colleague', 'other'] },
    priority: { type: Number, default: 1 }, // 1 = highest priority
    isPrimary: { type: Boolean, default: false },
    canReceiveAlerts: { type: Boolean, default: true }
  }],
  emergencySettings: {
    shareLocation: { type: Boolean, default: false },
    autoShareLocationInEmergency: { type: Boolean, default: true },
    alertPreferences: {
      emergencyAlerts: { type: Boolean, default: true },
      weatherAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      healthAlerts: { type: Boolean, default: true }
    }
  },

  // Security & recovery
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/* Indexes */
UserSchema.index({ displayName: 'text', firstName: 'text', lastName: 'text', bio: 'text' });

/* Virtuals */
UserSchema.virtual('fullName').get(function() {
  if (this.firstName || this.lastName) return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  return this.displayName || this.username;
});

/* Pre-save hook */
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Only validate passwordHash for new users or when password is being changed
  if (this.isNew && !this.passwordHash) {
    return next(new Error('passwordHash is required for new users'));
  }
  next();
});

/* Instance methods */
UserSchema.methods.setPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
  return this.passwordHash;
};

UserSchema.methods.comparePassword = async function(plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

UserSchema.methods.generatePasswordReset = function() {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
  return token;
};

UserSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/* Static helpers */
UserSchema.statics.findByIdentifier = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier },
      { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }, // Case-insensitive username
      { email: identifier },
      { email: { $regex: new RegExp(`^${identifier}$`, 'i') } }, // Case-insensitive email
      { phone: identifier }
    ]
  });
};

/* toJSON transform */
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    return ret;
  }
});

export default mongoose.model('User', UserSchema);
