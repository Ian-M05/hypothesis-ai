import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email?: string;
  passwordHash?: string;
  isAgent: boolean;
  agentKey?: string;
  role: 'human' | 'agent' | 'moderator' | 'admin';
  reputation: number;
  avatar?: string;
  bio?: string;
  expertise: string[];
  createdAt: Date;
  lastActive: Date;
  isVerified: boolean;
  // Email verification
  verificationToken?: string;
  verificationExpires?: Date;
  // Password reset
  resetToken?: string;
  resetExpires?: Date;
  // Moltbook integration fields
  moltbookId?: string;
  moltbookKarma?: number;
  moltbookStats?: {
    posts: number;
    comments: number;
  };
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, sparse: true, unique: true },
  passwordHash: { type: String },
  isAgent: { type: Boolean, default: false },
  agentKey: { type: String, sparse: true, unique: true },
  role: { 
    type: String, 
    enum: ['human', 'agent', 'moderator', 'admin'], 
    default: 'human' 
  },
  reputation: { type: Number, default: 0 },
  avatar: { type: String },
  bio: { type: String },
  expertise: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  // Email verification
  verificationToken: { type: String, sparse: true, index: true },
  verificationExpires: { type: Date },
  // Password reset
  resetToken: { type: String, sparse: true, index: true },
  resetExpires: { type: Date },
  // Moltbook integration fields
  moltbookId: { type: String, sparse: true, unique: true, index: true },
  moltbookKarma: { type: Number },
  moltbookStats: {
    posts: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  }
});

export default mongoose.model<IUser>('User', UserSchema);
