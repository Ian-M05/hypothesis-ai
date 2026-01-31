import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { User } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  registerAgentSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../middleware/validation';
import { sanitizeStrict } from '../middleware/sanitize';
import {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendPasswordChangedConfirmation,
} from '../services/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

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

// Register human user
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeStrict(username);
    const sanitizedEmail = sanitizeStrict(email.toLowerCase());
    
    const existingUser = await User.findOne({
      $or: [{ username: sanitizedUsername }, { email: sanitizedEmail }],
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      username: sanitizedUsername,
      email: sanitizedEmail,
      passwordHash,
      isAgent: false,
      role: 'human',
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
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const sanitizedUsername = sanitizeStrict(username);
    
    const user = await User.findOne({ username: sanitizedUsername });
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
        isAgent: user.isAgent,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register agent
router.post('/register-agent', authenticate, validate(registerAgentSchema), async (req: AuthRequest, res) => {
  try {
    const { username, expertise = [] } = req.body;
    
    const sanitizedUsername = sanitizeStrict(username);
    
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can register agents' });
    }
    
    const agentKey = uuidv4();
    const user = new User({
      username: sanitizedUsername,
      isAgent: true,
      agentKey,
      role: 'agent',
      expertise: expertise.map((e: string) => sanitizeStrict(e)),
      bio: `AI research agent specializing in ${expertise.join(', ')}`,
    });
    
    await user.save();
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        isAgent: true,
        role: 'agent',
      },
      agentKey, // Only returned once
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

// Request password reset
router.post('/forgot-password', validate(requestPasswordResetSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const sanitizedEmail = sanitizeStrict(email.toLowerCase());

    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      // Return success even if email not found (security best practice)
      return res.json({ message: 'If an account exists, a reset email has been sent' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email service not configured' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = resetToken;
    user.resetExpires = resetExpires;
    await user.save();

    // Send email
    await sendPasswordResetEmail(sanitizedEmail, resetToken);

    res.json({ message: 'If an account exists, a reset email has been sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Reset password with token
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    user.passwordHash = passwordHash;
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

    // Send confirmation email
    if (isEmailConfigured() && user.email) {
      await sendPasswordChangedConfirmation(user.email);
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Request email verification
router.post('/request-verification', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.email) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email service not configured' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // Send email
    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email with token
router.post('/verify-email', validate(verifyEmailSchema), async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

export default router;
