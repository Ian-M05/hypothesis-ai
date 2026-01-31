import { Router } from 'express';
import slugify from 'slugify';
import { Thread, Comment, Forum, User, Notification } from '../models';
import { authenticate, AuthRequest, authenticateAgent } from '../middleware/auth';

const router = Router();

// Get thread by ID with nested comments
router.get('/:id', async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate('author', 'username reputation isAgent expertise')
      .populate('forum', 'name slug color');
    
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    // Increment view count
    thread.viewCount += 1;
    await thread.save();
    
    // Get all comments for this thread
    const comments = await Comment.find({ thread: thread._id })
      .populate('author', 'username reputation isAgent expertise')
      .sort({ createdAt: 1 });
    
    // Build comment tree
    const commentMap = new Map();
    const rootComments: any[] = [];
    
    comments.forEach(comment => {
      const commentObj = comment.toObject();
      commentObj.children = [];
      commentMap.set(comment._id.toString(), commentObj);
    });
    
    comments.forEach(comment => {
      const commentObj = commentMap.get(comment._id.toString());
      if (comment.parent) {
        const parent = commentMap.get(comment.parent.toString());
        if (parent) {
          parent.children.push(commentObj);
        }
      } else {
        rootComments.push(commentObj);
      }
    });
    
    res.json({
      thread,
      comments: rootComments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get thread' });
  }
});

// Create thread (human or agent)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      content,
      forumId,
      tags = [],
      problemContext,
      constraints,
      knownApproaches,
      successCriteria,
      difficulty = 'intermediate'
    } = req.body;
    
    // Verify forum exists
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
    
    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
    
    const thread = new Thread({
      title,
      slug,
      content,
      author: req.user._id,
      forum: forumId,
      status: 'open',
      tags,
      problemContext,
      constraints,
      knownApproaches,
      successCriteria,
      difficulty,
      lastActivityAt: new Date()
    });
    
    await thread.save();
    
    // Update forum thread count
    forum.threadCount += 1;
    await forum.save();
    
    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Agent API: Create thread
router.post('/agent', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      content,
      forumSlug,
      tags = [],
      problemContext,
      constraints,
      knownApproaches,
      successCriteria,
      difficulty = 'research'
    } = req.body;
    
    const forum = await Forum.findOne({ slug: forumSlug });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
    
    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
    
    const thread = new Thread({
      title,
      slug,
      content,
      author: req.user._id,
      forum: forum._id,
      status: 'open',
      tags,
      problemContext,
      constraints,
      knownApproaches,
      successCriteria,
      difficulty,
      lastActivityAt: new Date()
    });
    
    await thread.save();
    
    forum.threadCount += 1;
    await forum.save();
    
    res.json({
      threadId: thread._id,
      slug: thread.slug,
      status: thread.status
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Update thread status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const thread = await Thread.findById(req.params.id);
    
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    // Only author, moderators, or admins can change status
    const isModerator = await Forum.exists({
      _id: thread.forum,
      moderators: req.user._id
    });
    
    if (thread.author.toString() !== req.user._id.toString() && 
        !isModerator && 
        !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    thread.status = status;
    thread.updatedAt = new Date();
    await thread.save();
    
    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Search threads
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { forum, status, tags, page = 1, limit = 20 } = req.query;
    
    const searchQuery: any = {
      $text: { $search: query }
    };
    
    if (forum) searchQuery.forum = forum;
    if (status) searchQuery.status = status;
    if (tags) searchQuery.tags = { $in: (tags as string).split(',') };
    
    const threads = await Thread.find(searchQuery)
      .populate('author', 'username reputation isAgent')
      .populate('forum', 'name slug')
      .sort({ score: { $meta: 'textScore' } })
      .skip((+page - 1) * +limit)
      .limit(+limit);
    
    const total = await Thread.countDocuments(searchQuery);
    
    res.json({
      threads,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        pages: Math.ceil(total / +limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
