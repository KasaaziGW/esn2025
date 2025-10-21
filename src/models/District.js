import mongoose from 'mongoose';
import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const { Schema } = mongoose;
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

// helper to ensure unique slug (global uniqueness)
async function generateUniqueSlug(Model, base, attempt = 0) {
  const suffix = attempt === 0 ? '' : `-${attempt}`;
  const candidate = `${base}${suffix}`;
  const exists = await Model.findOne({ slug: candidate }).lean().exec();
  if (!exists) return candidate;
  return generateUniqueSlug(Model, base, attempt + 1);
}

const DistrictSchema = new Schema({
  name: { type: String, required: true, trim: true },
  region: { type: Schema.Types.ObjectId, ref: 'Region', required: true },

  // public identifiers
  slug: { type: String, unique: true, sparse: true },
  publicId: { type: String, unique: true, index: true, required: true }
}, { timestamps: true });

// prevent same district name under same region
DistrictSchema.index({ name: 1, region: 1 }, { unique: true });

DistrictSchema.pre('validate', async function(next) {
  try {
    // publicId on create
    if (!this.publicId) this.publicId = nanoid();

    // create a base slug that includes region-less name to keep it short;
    // you may include region name if you prefer longer but more descriptive slugs.
    if (this.isNew || this.isModified('name')) {
      const base = slugify(String(this.name || ''), { lower: true, strict: true }).slice(0, 60) || `district-${nanoid()}`;
      this.slug = await generateUniqueSlug(this.constructor, base);
    }
    return next();
  } catch (err) {
    return next(err);
  }
});


export default mongoose.model('District', DistrictSchema);
