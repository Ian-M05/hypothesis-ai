import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Vote, Thread, Comment, User, Notification } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { voteSchema } from '../middleware/validation';

const router = Router();

// Validation middleware helper
const validate = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

// Vote on thread or comment
router.post('/', authenticate, validate(voteSchema), async (req: AuthRequest, res) => {
  const session = await mongoose.startSession();
  let result: { success: boolean; value?: number } = { success: false };
  
  try {
    await session.withTransaction(async () => {
      const { targetType, targetId, voteType } = req.body;
      
      // Validate target exists and get proper type
      let target: any;
      if (targetType === 'thread') {
        target = await Thread.findById(targetId).session(session);
      } else if (targetType === 'comment') {
        target = await Comment.findById(targetId).session(session);
      } else if (targetType === 'user') {
        target = await User.findById(targetId).session(session);
      }
      
      if (!target) {
        throw new Error('Target not found');
      }
      
      // Can't vote on yourself
      const targetAuthorId = target.author?.toString();
      const targetIdStr = target._id?.toString();
      if (targetAuthorId === req.user._id.toString() ||
          targetIdStr === req.user._id.toString()) {
        throw new Error('Cannot vote on yourself');
      }
      
      // Calculate vote value
      let value = 0;
      switch (voteType) {
        case 'upvote':
          value = 10;
          break;
        case 'downvote':
          value = -2;
          break;
        case 'endorse':
          // Only humans can endorse, and only agents can be endorsed
          if (req.user.role === 'agent') {
            throw new Error('Only humans can endorse');
          }
          if (targetType !== 'comment' && targetType !== 'thread') {
            throw new Error('Can only endorse content');
          }
          value = 100;
          break;
        case 'accept':
          // Handled separately in comments route
          throw new Error('Use /comments/:id/accept for accepting answers');
        default:
          throw new Error('Invalid vote type');
      }
      
      // Check for existing vote
      const existingVote = await Vote.findOne({
        user: req.user._id,
        targetType,
        targetId
      }).session(session);
      
      const authorId = target.author ? target.author.toString() : targetId;
      
      if (existingVote) {
        // Update existing vote
        const oldValue = existingVote.value;
        existingVote.voteType = voteType;
        existingVote.value = value;
        await existingVote.save({ session });
        
        // Adjust target vote count
        const diff = value - oldValue;
        if (targetType === 'thread') {
          await Thread.findByIdAndUpdate(targetId, { $inc: { voteCount: diff } }, { session });
        } else if (targetType === 'comment') {
          await Comment.findByIdAndUpdate(targetId, { $inc: { voteCount: diff } }, { session });
        }
        
        // Adjust author reputation
        await User.findByIdAndUpdate(authorId, { $inc: { reputation: diff } }, { session });
      } else {
        // Create new vote
        await Vote.create([{
          user: req.user._id,
          targetType,
          targetId,
          voteType,
          value
        }], { session });
        
        // Update target vote count
        if (targetType === 'thread') {
          await Thread.findByIdAndUpdate(targetId, { $inc: { voteCount: value } }, { session });
        } else if (targetType === 'comment') {
          await Comment.findByIdAndUpdate(targetId, { $inc: { voteCount: value } }, { session });
        }
        
        // Update author reputation
        await User.findByIdAndUpdate(authorId, { $inc: { reputation: value } }, { session });
        
        // Create notification
        if (targetType === 'thread' || targetType === 'comment') {
          const threadIdForNotif = targetType === 'thread' ? targetId : target.thread;
          await Notification.create([{
            recipient: target.author,
            sender: req.user._id,
            type: voteType === 'endorse' ? 'endorse' : 'vote',
            title: voteType === 'endorse' ? 'Expert endorsement!' : 'New vote on your content',
            content: `${req.user.username} ${voteType === 'endorse' ? 'endorsed' : 'voted on'} your ${targetType}`,
            thread: threadIdForNotif,
            comment: targetType === 'comment' ? targetId : undefined
          }], { session });
        }
      }
      
      result = { success: true, value };
    });
    
    // Send response AFTER transaction commits
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Target not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Cannot vote on yourself' || 
        error.message === 'Only humans can endorse' ||
        error.message === 'Can only endorse content' ||
        error.message === 'Use /comments/:id/accept for accepting answers' ||
        error.message === 'Invalid vote type') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to vote' });
  } finally {
    await session.endSession();
  }
});

// Remove vote
router.delete('/:targetType/:targetId', authenticate, async (req: AuthRequest, res) => {
  const session = await mongoose.startSession();
  let success = false;
  
  try {
    await session.withTransaction(async () => {
      const { targetType, targetId } = req.params;
      
      const vote = await Vote.findOne({
        user: req.user._id,
        targetType,
        targetId
      }).session(session);
      
      if (!vote) {
        throw new Error('Vote not found');
      }
      
      // Get target for author
      let target: any;
      if (targetType === 'thread') {
        target = await Thread.findById(targetId).session(session);
      } else if (targetType === 'comment') {
        target = await Comment.findById(targetId).session(session);
      } else {
        target = await User.findById(targetId).session(session);
      }
      
      // Remove vote value from target and author
      if (targetType === 'thread') {
        await Thread.findByIdAndUpdate(targetId, { $inc: { voteCount: -vote.value } }, { session });
      } else if (targetType === 'comment') {
        await Comment.findByIdAndUpdate(targetId, { $inc: { voteCount: -vote.value } }, { session });
      }
      
      const authorId = target?.author ? target.author.toString() : targetId;
      await User.findByIdAndUpdate(authorId, { $inc: { reputation: -vote.value } }, { session });
      
      await vote.deleteOne({ session });
      
      success = true;
    });
    
    // Send response AFTER transaction commits
    res.json({ success });
  } catch (error: any) {
    if (error.message === 'Vote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to remove vote' });
  } finally {
    await session.endSession();
  }
});

// Get user's votes
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const votes = await Vote.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(votes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

export default router;
