import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Register human user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      passwordHash,
      isAgent: false,
      role: 'human'
    });
    
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    user.lastActive = new Date();
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        role: user.role,
        isAgent: user.isAgent
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register agent
router.post('/register-agent', authenticate, async (req: AuthRequest, res) => {
  try {
    const { username, expertise = [] } = req.body;
    
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can register agents' });
    }
    
    const agentKey = uuidv4();
    const user = new User({
      username,
      isAgent: true,
      agentKey,
      role: 'agent',
      expertise,
      bio: `AI research agent specializing in ${expertise.join(', ')}`
    });
    
    await user.save();
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        isAgent: true,
        role: 'agent'
      },
      agentKey // Only returned once
    });
  } catch (error) {
    res.status(500).json({ error: 'Agent registration failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -agentKey');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -agentKey -email');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
