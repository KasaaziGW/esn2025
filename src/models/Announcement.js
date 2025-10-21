import mongoose from 'mongoose';
import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const { Schema } = mongoose;
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  filename: String,
  mimetype: String,
  size: Number
}, { _id: false });

// GeoJSON point for emergency location
const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]
}, { _id: false });

const AnnouncementSchema = new Schema({
  community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  title: { type: String, trim: true, required: true },
  body: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [AttachmentSchema],
  pinned: { type: Boolean, default: false },
  slug: { type: String, unique: true, index: true, sparse: true },
  meta: { type: Schema.Types.Mixed },
  
  // Emergency-specific fields
  isEmergency: { type: Boolean, default: false, index: true },
  emergencyType: { 
    type: String, 
    enum: ['medical', 'fire', 'security', 'natural_disaster', 'infrastructure', 'other'],
    required: function() { return this.isEmergency; }
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  location: GeoPointSchema, // Emergency location
  locationDescription: { type: String }, // Human-readable location
  requiresResponse: { type: Boolean, default: false },
  responseDeadline: { type: Date },
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active',
    index: true
  },
  affectedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users directly affected
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }, // Coordinator/admin assigned to handle
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Who resolved it
  resolvedAt: { type: Date },
  resolutionNotes: { type: String },
  
  // View and forward tracking
  viewCount: { type: Number, default: 0 },
  forwardCount: { type: Number, default: 0 },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Track who viewed
  forwardedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Track who forwarded
}, { timestamps: true });

// Add indexes for emergency fields
AnnouncementSchema.index({ isEmergency: 1, severity: 1, status: 1 });
AnnouncementSchema.index({ location: '2dsphere' });
AnnouncementSchema.index({ emergencyType: 1, status: 1 });
AnnouncementSchema.index({ assignedTo: 1, status: 1 });

// Helper to create unique slug
async function generateUniqueSlug(Model, baseSlug, attempt = 0) {
  const suffix = attempt === 0 ? '' : `-${attempt}`;
  const candidate = `${baseSlug}${suffix}`;
  const exists = await Model.findOne({ slug: candidate });
  if (!exists) return candidate;
  return generateUniqueSlug(Model, baseSlug, attempt + 1);
}

AnnouncementSchema.pre('validate', async function (next) {
  try {
    if (this.isNew || this.isModified('title')) {
      const base = slugify(this.title || '', { lower: true, strict: true }).slice(0, 60);
      const baseSlug = base && base.length ? base : `announcement-${nanoid()}`;
      this.slug = await generateUniqueSlug(this.constructor, baseSlug);
    }
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Announcement', AnnouncementSchema);
