import { Router } from 'express';
import { Notification } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user's notifications
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { unread = false, page = 1, limit = 20 } = req.query;
    
    const query: any = { recipient: req.user._id };
    if (unread === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'username isAgent')
      .populate('thread', 'title slug')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });
    
    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        pages: Math.ceil(total / +limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all as read
router.post('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
