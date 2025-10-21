import mongoose from 'mongoose';

const { Schema } = mongoose;

const CommunityMemberSchema = new Schema({
  community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['citizen', 'admin', 'coordinator'], default: 'citizen' },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure one membership per user per community
CommunityMemberSchema.index({ community: 1, user: 1 }, { unique: true });

export default mongoose.model('CommunityMember', CommunityMemberSchema);
