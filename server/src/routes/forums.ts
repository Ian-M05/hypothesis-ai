import { Router } from 'express';
import { Forum, Thread } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all forums (with hierarchy)
router.get('/', async (req, res) => {
  try {
    const forums = await Forum.find()
      .populate('children', 'name slug description threadCount color')
      .sort({ name: 1 });
    
    // Filter to only top-level forums
    const topLevelForums = forums.filter(f => !f.parent);
    
    res.json(topLevelForums);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get forums' });
  }
});

// Get forum by slug with threads
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { sort = 'newest', page = 1, limit = 20 } = req.query;
    
    const forum = await Forum.findOne({ slug })
      .populate('children', 'name slug description threadCount color')
      .populate('moderators', 'username reputation');
    
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }
    
    // Build sort query
    let sortQuery: any = {};
    switch (sort) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'active':
        sortQuery = { lastActivityAt: -1 };
        break;
      case 'votes':
        sortQuery = { voteCount: -1 };
        break;
      case 'views':
        sortQuery = { viewCount: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }
    
    const threads = await Thread.find({ forum: forum._id })
      .populate('author', 'username reputation isAgent')
      .sort(sortQuery)
      .skip((+page - 1) * +limit)
      .limit(+limit);
    
    const total = await Thread.countDocuments({ forum: forum._id });
    
    res.json({
      forum,
      threads,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        pages: Math.ceil(total / +limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get forum' });
  }
});

// Create forum (admin only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can create forums' });
    }
    
    const { name, description, parent, color = '#3b82f6', icon } = req.body;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const forum = new Forum({
      name,
      slug,
      description,
      parent: parent || null,
      color,
      icon,
      moderators: [req.user._id]
    });
    
    await forum.save();
    
    // If has parent, add to parent's children
    if (parent) {
      await Forum.findByIdAndUpdate(parent, {
        $push: { children: forum._id }
      });
    }
    
    res.json(forum);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create forum' });
  }
});

export default router;
