import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 
  | 'reply'
  | 'mention'
  | 'vote'
  | 'accept'
  | 'endorse'
  | 'status_change'
  | 'critique'
  | 'validation';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  content: string;
  thread?: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: ['reply', 'mention', 'vote', 'accept', 'endorse', 'status_change', 'critique', 'validation'],
    required: true 
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  thread: { type: Schema.Types.ObjectId, ref: 'Thread' },
  comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
});

NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
