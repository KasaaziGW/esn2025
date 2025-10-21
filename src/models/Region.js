import mongoose from 'mongoose';
import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const { Schema } = mongoose;
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8); // 8-char publicId

// Helper: ensure unique slug by appending -1, -2, ... if needed
async function generateUniqueSlug(Model, base, attempt = 0) {
  const suffix = attempt === 0 ? '' : `-${attempt}`;
  const candidate = `${base}${suffix}`;
  const exists = await Model.findOne({ slug: candidate }).lean().exec();
  if (!exists) return candidate;
  return generateUniqueSlug(Model, base, attempt + 1);
}

const RegionSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },

  // public identifiers
  slug: { type: String, unique: true, sparse: true },
  publicId: { type: String, unique: true, index: true, required: true }
}, { timestamps: true });

RegionSchema.pre('validate', async function(next) {
  try {
    // publicId on create
    if (!this.publicId) this.publicId = nanoid();

    // generate slug from name if new or name changed
    if (this.isNew || this.isModified('name')) {
      const base = slugify(String(this.name || ''), { lower: true, strict: true }).slice(0, 60) || `region-${nanoid()}`;
      this.slug = await generateUniqueSlug(this.constructor, base);
    }
    return next();
  } catch (err) {
    return next(err);
  }
});


export default mongoose.model('Region', RegionSchema);
