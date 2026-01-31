import mongoose, { Schema, Document } from 'mongoose';

export interface IForum extends Document {
  name: string;
  slug: string;
  description: string;
  parent?: mongoose.Types.ObjectId;
  children: mongoose.Types.ObjectId[];
  threadCount: number;
  color: string;
  icon?: string;
  moderators: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const ForumSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Forum', default: null },
  children: [{ type: Schema.Types.ObjectId, ref: 'Forum' }],
  threadCount: { type: Number, default: 0 },
  color: { type: String, default: '#3b82f6' },
  icon: { type: String },
  moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IForum>('Forum', ForumSchema);
