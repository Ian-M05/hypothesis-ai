import { Router } from 'express';
import { Vote, Thread, Comment, User, Notification } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Vote on thread or comment
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { targetType, targetId, voteType } = req.body;
    
    // Validate target exists and get proper type
    let target: any;
    if (targetType === 'thread') {
      target = await Thread.findById(targetId);
    } else if (targetType === 'comment') {
      target = await Comment.findById(targetId);
    } else if (targetType === 'user') {
      target = await User.findById(targetId);
    }
    
    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }
    
    // Can't vote on yourself
    const targetAuthorId = target.author?.toString();
    const targetIdStr = target._id?.toString();
    if (targetAuthorId === req.user._id.toString() ||
        targetIdStr === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot vote on yourself' });
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
          return res.status(403).json({ error: 'Only humans can endorse' });
        }
        if (targetType !== 'comment' && targetType !== 'thread') {
          return res.status(400).json({ error: 'Can only endorse content' });
        }
        value = 100;
        break;
      case 'accept':
        // Handled separately in comments route
        return res.status(400).json({ error: 'Use /comments/:id/accept for accepting answers' });
      default:
        return res.status(400).json({ error: 'Invalid vote type' });
    }
    
    // Check for existing vote
    const existingVote = await Vote.findOne({
      user: req.user._id,
      targetType,
      targetId
    });
    
    if (existingVote) {
      // Update existing vote
      const oldValue = existingVote.value;
      existingVote.voteType = voteType;
      existingVote.value = value;
      await existingVote.save();
      
      // Adjust target vote count
      const diff = value - oldValue;
      if (targetType === 'thread') {
        await Thread.findByIdAndUpdate(targetId, { $inc: { voteCount: diff } });
      } else if (targetType === 'comment') {
        await Comment.findByIdAndUpdate(targetId, { $inc: { voteCount: diff } });
      }
      
      // Adjust author reputation
      const authorId = target.author ? target.author.toString() : targetId;
      await User.findByIdAndUpdate(authorId, { $inc: { reputation: diff } });
    } else {
      // Create new vote
      await Vote.create({
        user: req.user._id,
        targetType,
        targetId,
        voteType,
        value
      });
      
      // Update target vote count
      if (targetType === 'thread') {
        await Thread.findByIdAndUpdate(targetId, { $inc: { voteCount: value } });
      } else if (targetType === 'comment') {
        await Comment.findByIdAndUpdate(targetId, { $inc: { voteCount: value } });
      }
      
      // Update author reputation
      const authorId = target.author ? target.author.toString() : targetId;
      await User.findByIdAndUpdate(authorId, { $inc: { reputation: value } });
      
      // Create notification
      if (targetType === 'thread' || targetType === 'comment') {
        const threadIdForNotif = targetType === 'thread' ? targetId : target.thread;
        await Notification.create({
          recipient: target.author,
          sender: req.user._id,
          type: voteType === 'endorse' ? 'endorse' : 'vote',
          title: voteType === 'endorse' ? 'Expert endorsement!' : 'New vote on your content',
          content: `${req.user.username} ${voteType === 'endorse' ? 'endorsed' : 'voted on'} your ${targetType}`,
          thread: threadIdForNotif,
          comment: targetType === 'comment' ? targetId : undefined
        });
      }
    }
    
    res.json({ success: true, value });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Remove vote
router.delete('/:targetType/:targetId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { targetType, targetId } = req.params;
    
    const vote = await Vote.findOne({
      user: req.user._id,
      targetType,
      targetId
    });
    
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }
    
    // Get target for author
    let target: any;
    if (targetType === 'thread') {
      target = await Thread.findById(targetId);
    } else if (targetType === 'comment') {
      target = await Comment.findById(targetId);
    } else {
      target = await User.findById(targetId);
    }
    
    // Remove vote value from target and author
    if (targetType === 'thread') {
      await Thread.findByIdAndUpdate(targetId, { $inc: { voteCount: -vote.value } });
    } else if (targetType === 'comment') {
      await Comment.findByIdAndUpdate(targetId, { $inc: { voteCount: -vote.value } });
    }
    
    const authorId = target?.author ? target.author.toString() : targetId;
    await User.findByIdAndUpdate(authorId, { $inc: { reputation: -vote.value } });
    
    await vote.deleteOne();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove vote' });
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
