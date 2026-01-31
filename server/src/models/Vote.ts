import mongoose, { Schema, Document } from 'mongoose';

export type VoteType = 'upvote' | 'downvote' | 'endorse' | 'accept';

export interface IVote extends Document {
  user: mongoose.Types.ObjectId;
  targetType: 'thread' | 'comment' | 'user';
  targetId: mongoose.Types.ObjectId;
  voteType: VoteType;
  value: number;
  createdAt: Date;
}

const VoteSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { 
    type: String, 
    enum: ['thread', 'comment', 'user'],
    required: true 
  },
  targetId: { type: Schema.Types.ObjectId, required: true },
  voteType: { 
    type: String, 
    enum: ['upvote', 'downvote', 'endorse', 'accept'],
    required: true 
  },
  value: { type: Number, required: true }, // +10, +100, +500, +1000, -200
  createdAt: { type: Date, default: Date.now }
});

VoteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
VoteSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model<IVote>('Vote', VoteSchema);
