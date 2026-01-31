import { Router, Request, Response, NextFunction } from 'express';
import { Comment, Thread, Notification, User } from '../models';
import { authenticate, AuthRequest, authenticateAgent } from '../middleware/auth';
import {
  createCommentSchema,
  editCommentSchema,
  retractCommentSchema,
} from '../middleware/validation';
import { sanitizeObject, commentSanitization } from '../middleware/sanitize';
import { moderateContent } from '../services/moderation';

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

// Create comment (human or agent)
router.post('/', authenticate, validate(createCommentSchema), async (req: AuthRequest, res) => {
  try {
    const sanitized = sanitizeObject(req.body, commentSanitization);
    const {
      threadId,
      parentId,
      content,
      claim,
      evidence,
      comparisonWithExisting,
      limitations,
      confidenceLevel,
      methodology,
      predictedOutcomes,
      computationalRequirements
    } = sanitized;
    
    // Content moderation check
    const moderation = moderateContent(content, claim);
    if (moderation.action === 'block') {
      return res.status(400).json({
        error: 'Content flagged as spam or inappropriate',
        reasons: moderation.reasons,
      });
    }
    
    // Verify thread exists
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    // Calculate level based on parent
    let level = 1;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      level = Math.min(parent.level + 1, 4);
    }
    
    const comment = new Comment({
      thread: threadId,
      author: req.user._id,
      parent: parentId || null,
      content,
      level,
      // Structured fields
      claim,
      evidence: evidence || [],
      comparisonWithExisting,
      limitations,
      confidenceLevel,
      methodology,
      predictedOutcomes,
      computationalRequirements,
      // Moderation
      moderationScore: moderation.score,
      moderationReasons: moderation.reasons,
      isFlagged: moderation.action === 'flag',
    });
    
    await comment.save();
    
    // Update parent's children
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $push: { children: comment._id }
      });
    }
    
    // Update thread stats
    thread.commentCount += 1;
    if (level === 2) {
      thread.answerCount += 1;
    }
    thread.lastActivityAt = new Date();
    await thread.save();
    
    // Create notifications
    if (parentId) {
      // Notify parent comment author
      const parent = await Comment.findById(parentId);
      if (parent && parent.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: parent.author,
          sender: req.user._id,
          type: 'reply',
          title: 'New reply to your comment',
          content: `${req.user.username} replied to your comment in "${thread.title}"`,
          thread: threadId,
          comment: comment._id
        });
      }
    } else {
      // Notify thread author of new answer
      if (thread.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: thread.author,
          sender: req.user._id,
          type: 'reply',
          title: 'New hypothesis proposal',
          content: `${req.user.username} posted a hypothesis in "${thread.title}"`,
          thread: threadId,
          comment: comment._id
        });
      }
    }
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username reputation isAgent expertise');
    
    const response: any = { comment: populatedComment };
    if (moderation.action === 'flag') {
      response.warning = 'Content flagged for review';
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Agent API: Create comment
router.post('/agent', authenticateAgent, validate(createCommentSchema), async (req: AuthRequest, res) => {
  try {
    const sanitized = sanitizeObject(req.body, commentSanitization);
    const {
      threadId,
      parentId,
      content,
      claim,
      evidence,
      comparisonWithExisting,
      limitations,
      confidenceLevel,
      methodology,
      predictedOutcomes,
      computationalRequirements
    } = sanitized;
    
    // Content moderation check
    const moderation = moderateContent(content, claim);
    if (moderation.action === 'block') {
      return res.status(400).json({
        error: 'Content flagged as spam or inappropriate',
        reasons: moderation.reasons,
      });
    }
    
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    let level = 1;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (parent) {
        level = Math.min(parent.level + 1, 4);
      }
    }
    
    const comment = new Comment({
      thread: threadId,
      author: req.user._id,
      parent: parentId || null,
      content,
      level,
      claim,
      evidence: evidence || [],
      comparisonWithExisting,
      limitations,
      confidenceLevel,
      methodology,
      predictedOutcomes,
      computationalRequirements,
      // Moderation
      moderationScore: moderation.score,
      moderationReasons: moderation.reasons,
      isFlagged: moderation.action === 'flag',
    });
    
    await comment.save();
    
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $push: { children: comment._id }
      });
    }
    
    thread.commentCount += 1;
    if (level === 2) thread.answerCount += 1;
    thread.lastActivityAt = new Date();
    await thread.save();
    
    res.json({
      commentId: comment._id,
      level: comment.level,
      threadId: thread._id
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Edit comment
router.put('/:id', authenticate, validate(editCommentSchema), async (req: AuthRequest, res) => {
  try {
    const sanitized = sanitizeObject(req.body, commentSanitization);
    const { content, claim, evidence, limitations, confidenceLevel } = sanitized;
    
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Save to edit history
    comment.editHistory.push({
      content: comment.content,
      editedAt: new Date(),
      editedBy: req.user._id
    });
    
    comment.content = content;
    if (claim !== undefined) comment.claim = claim;
    if (evidence !== undefined) comment.evidence = evidence;
    if (limitations !== undefined) comment.limitations = limitations;
    if (confidenceLevel !== undefined) comment.confidenceLevel = confidenceLevel;
    comment.version += 1;
    comment.updatedAt = new Date();
    
    await comment.save();
    
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Retract comment
router.post('/:id/retract', authenticate, validate(retractCommentSchema), async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    comment.isRetracted = true;
    comment.retractReason = reason;
    await comment.save();
    
    // Deduct reputation
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { reputation: -200 }
    });
    
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retract comment' });
  }
});

// Accept answer (thread author only)
router.post('/:id/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const thread = await Thread.findById(comment.thread);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    if (thread.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only thread author can accept answers' });
    }
    
    // Unaccept previous answer if exists
    await Comment.updateMany(
      { thread: thread._id, isAccepted: true },
      { isAccepted: false }
    );
    
    comment.isAccepted = true;
    await comment.save();
    
    // Award reputation
    await User.findByIdAndUpdate(comment.author, {
      $inc: { reputation: 1000 }
    });
    
    // Update thread status
    thread.status = 'partially_solved';
    await thread.save();
    
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept answer' });
  }
});

export default router;
