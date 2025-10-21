import mongoose from 'mongoose';

const { Schema } = mongoose;

const CoordinatorRequestSchema = new Schema({
  // User making the request
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Community for which the request is made
  community: { 
    type: Schema.Types.ObjectId, 
    ref: 'Community', 
    required: true 
  },
  
  // Request details
  position: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  
  organization: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  
  requestDetails: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Optional attachment
  attachment: {
    filename: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    path: { type: String }
  },
  
  // Request status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  
  // Admin review details
  reviewedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  reviewedAt: { 
    type: Date 
  },
  
  adminComments: { 
    type: String, 
    trim: true,
    maxlength: 500
  },
  
  // Timestamps
  requestedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
CoordinatorRequestSchema.index({ user: 1, community: 1 });
CoordinatorRequestSchema.index({ status: 1 });
CoordinatorRequestSchema.index({ requestedAt: -1 });

// Virtual for request duration
CoordinatorRequestSchema.virtual('duration').get(function() {
  if (this.reviewedAt) {
    return this.reviewedAt - this.requestedAt;
  }
  return Date.now() - this.requestedAt;
});

// Ensure virtual fields are serialized
CoordinatorRequestSchema.set('toJSON', { virtuals: true });

const CoordinatorRequest = mongoose.model('CoordinatorRequest', CoordinatorRequestSchema);

export default CoordinatorRequest;
