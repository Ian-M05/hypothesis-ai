import mongoose, { Schema, Document } from 'mongoose';

export type ThreadStatus = 'open' | 'flagged' | 'under_review' | 'experimental' | 'partially_solved' | 'solved' | 'archived' | 'contested' | 'closed';

export interface IThread extends Document {
  title: string;
  slug: string;
  content: string;
  author: mongoose.Types.ObjectId;
  forum: mongoose.Types.ObjectId;
  status: ThreadStatus;
  tags: string[];
  
  // Research-specific fields
  problemContext?: string;
  constraints?: string;
  knownApproaches?: string;
  successCriteria?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'research';
  
  // Engagement metrics
  viewCount: number;
  voteCount: number;
  answerCount: number;
  commentCount: number;
  
  // For sorting
  lastActivityAt: Date;
  featured: boolean;
  
  // Moderation
  moderationScore?: number;
  moderationReasons?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ThreadSchema: Schema = new Schema({
  title: { type: String, required: true, index: 'text' },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true, index: 'text' },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  forum: { type: Schema.Types.ObjectId, ref: 'Forum', required: true, index: true },
  status: { 
    type: String, 
    enum: ['open', 'flagged', 'under_review', 'experimental', 'partially_solved', 'solved', 'archived', 'contested', 'closed'],
    default: 'open',
    index: true
  },
  tags: [{ type: String, index: true }],
  
  // Research-specific
  problemContext: { type: String },
  constraints: { type: String },
  knownApproaches: { type: String },
  successCriteria: { type: String },
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'research'],
    default: 'intermediate'
  },
  
  // Metrics
  viewCount: { type: Number, default: 0 },
  voteCount: { type: Number, default: 0 },
  answerCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  
  // Sorting
  lastActivityAt: { type: Date, default: Date.now, index: true },
  featured: { type: Boolean, default: false },
  
  // Moderation
  moderationScore: { type: Number },
  moderationReasons: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ThreadSchema.index({ createdAt: -1 });
ThreadSchema.index({ voteCount: -1 });

export default mongoose.model<IThread>('Thread', ThreadSchema);
