import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const { Schema } = mongoose;
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

// GeoJSON point for alert location
const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]
}, { _id: false });

const EmergencyAlertSchema = new Schema({
  // Alert identification
  alertId: { type: String, unique: true, required: true, default: () => nanoid() },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  
  // Alert classification
  alertType: { 
    type: String, 
    enum: ['system', 'weather', 'security', 'infrastructure', 'health', 'other'],
    required: true,
    index: true
  },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'critical'],
    required: true,
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Geographic scope
  scope: { 
    type: String, 
    enum: ['global', 'regional', 'community', 'district'],
    required: true,
    index: true
  },
  affectedRegions: [{ type: Schema.Types.ObjectId, ref: 'Region' }],
  affectedDistricts: [{ type: Schema.Types.ObjectId, ref: 'District' }],
  affectedCommunities: [{ type: Schema.Types.ObjectId, ref: 'Community' }],
  
  // Location and timing
  location: GeoPointSchema,
  locationDescription: { type: String },
  effectiveFrom: { type: Date, required: true },
  effectiveUntil: { type: Date },
  expiresAt: { type: Date },
  
  // Alert management
  status: { 
    type: String, 
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  
  // Delivery and acknowledgment
  deliveryMethod: { 
    type: [String], 
    enum: ['in_app', 'email', 'sms', 'push'],
    default: ['in_app']
  },
  acknowledgedBy: [{ 
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  metadata: { type: Schema.Types.Mixed },
  attachments: [{
    url: { type: String, required: true },
    filename: String,
    mimetype: String,
    size: Number
  }]
}, { timestamps: true });

// Indexes for efficient querying
EmergencyAlertSchema.index({ alertType: 1, severity: 1, status: 1 });
EmergencyAlertSchema.index({ scope: 1, status: 1 });
EmergencyAlertSchema.index({ effectiveFrom: 1, effectiveUntil: 1 });
EmergencyAlertSchema.index({ location: '2dsphere' });
EmergencyAlertSchema.index({ createdBy: 1, status: 1 });

// Virtual for active alerts
EmergencyAlertSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.effectiveFrom <= now && 
         (!this.effectiveUntil || this.effectiveUntil >= now);
});

// Method to check if alert affects a specific user
EmergencyAlertSchema.methods.affectsUser = function(user) {
  if (this.scope === 'global') return true;
  if (this.scope === 'regional' && user.region && this.affectedRegions.includes(user.region)) return true;
  if (this.scope === 'district' && user.district && this.affectedDistricts.includes(user.district)) return true;
  if (this.scope === 'community' && user.community && this.affectedCommunities.includes(user.community)) return true;
  return false;
};

export default mongoose.model('EmergencyAlert', EmergencyAlertSchema);
