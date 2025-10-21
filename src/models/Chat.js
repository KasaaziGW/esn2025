import mongoose from 'mongoose';
const { Schema } = mongoose;

const ChatSchema = new Schema({
  type: { type: String, enum: ['private', 'community'], required: true },
  community: { type: Schema.Types.ObjectId, ref: 'Community' }, // for community or group chats
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }], // 2 for private
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Chat', ChatSchema);
