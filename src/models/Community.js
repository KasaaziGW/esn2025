import mongoose from 'mongoose';
import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const { Schema } = mongoose;
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8); // 8-char id

const CommunitySchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  region: { type: Schema.Types.ObjectId, ref: 'Region', required: true },
  district: { type: Schema.Types.ObjectId, ref: 'District', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isPublic: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },

  bannerUrl: { type: String },

  // public identifiers
  slug: { type: String, unique: true, sparse: true },
  publicId: { type: String, unique: true, index: true, required: true },

  membersCount: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

CommunitySchema.index({ name: 'text', description: 'text' });

/**
 * Helper to generate a URL-safe slug
 * Uses slugify to create base slug from name, then ensures uniqueness
 */
async function generateUniqueSlug(Model, baseSlug, suffixAttempt = 0) {
  const attemptSuffix = suffixAttempt === 0 ? '' : `-${suffixAttempt}`;
  const candidate = `${baseSlug}${attemptSuffix}`;

  // check conflict
  const existing = await Model.findOne({ slug: candidate });
  if (!existing) return candidate;

  // if exists, try next suffix recursively
  return generateUniqueSlug(Model, baseSlug, suffixAttempt + 1);
}

CommunitySchema.pre('validate', async function(next) {
  try {
    // Ensure publicId exists on create
    if (!this.publicId) {
      this.publicId = nanoid();
    }

    // If name changed or slug not set, (re)generate slug
    if (this.isNew || this.isModified('name')) {
      const base = slugify(this.name || '', {
        lower: true,
        strict: true, // remove special chars
        remove: /[*+~.()'"!:@]/g
      }).slice(0, 60); // limit length
      // fallback base if empty
      const baseSlug = base && base.length > 0 ? base : `community-${nanoid()}`;

      // get unique slug
      this.slug = await generateUniqueSlug(this.constructor, baseSlug);
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Community', CommunitySchema);
