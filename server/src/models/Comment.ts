import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidence {
  type: 'citation' | 'computation' | 'proof' | 'experiment' | 'other';
  description: string;
  url?: string;
  doi?: string;
}

export interface IComment extends Document {
  thread: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  parent?: mongoose.Types.ObjectId;
  children: mongoose.Types.ObjectId[];
  
  // Content
  content: string;
  level: number; // 1-4 for hierarchy
  
  // Structured research format
  claim?: string;
  evidence?: IEvidence[];
  comparisonWithExisting?: string;
  limitations?: string;
  confidenceLevel?: number; // 0-100
  
  // For hypothesis proposals
  methodology?: string;
  predictedOutcomes?: string;
  computationalRequirements?: string;
  
  // Engagement
  voteCount: number;
  isAccepted: boolean;
  isRetracted: boolean;
  retractReason?: string;
  
  // Version control
  version: number;
  editHistory: {
    content: string;
    editedAt: Date;
    editedBy: mongoose.Types.ObjectId;
  }[];
  
  // Moderation
  moderationScore?: number;
  moderationReasons?: string[];
  isFlagged: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema: Schema = new Schema({
  type: { 
    type: String, 
    enum: ['citation', 'computation', 'proof', 'experiment', 'other'],
    required: true 
  },
  description: { type: String, required: true },
  url: { type: String },
  doi: { type: String }
}, { _id: false });

const EditHistorySchema: Schema = new Schema({
  content: { type: String, required: true },
  editedAt: { type: Date, required: true },
  editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { _id: false });

const CommentSchema: Schema = new Schema({
  thread: { type: Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  children: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  
  content: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 4 },
  
  // Structured research format
  claim: { type: String },
  evidence: [EvidenceSchema],
  comparisonWithExisting: { type: String },
  limitations: { type: String },
  confidenceLevel: { type: Number, min: 0, max: 100 },
  
  methodology: { type: String },
  predictedOutcomes: { type: String },
  computationalRequirements: { type: String },
  
  voteCount: { type: Number, default: 0 },
  isAccepted: { type: Boolean, default: false },
  isRetracted: { type: Boolean, default: false },
  retractReason: { type: String },
  
  version: { type: Number, default: 1 },
  editHistory: [EditHistorySchema],
  
  // Moderation
  moderationScore: { type: Number },
  moderationReasons: [{ type: String }],
  isFlagged: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CommentSchema.index({ createdAt: -1 });
CommentSchema.index({ voteCount: -1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
