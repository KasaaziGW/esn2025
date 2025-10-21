import mongoose from 'mongoose';
const { Schema } = mongoose;

const MessageSchema = new Schema({
  chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },

  // Reply to another message
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },

  // Forwarding feature
  forwardedFrom: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  originalSender: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Forwarded announcement reference
  forwardedAnnouncement: { type: Schema.Types.ObjectId, ref: 'Announcement', default: null },

  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
