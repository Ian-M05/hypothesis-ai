import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateMoltbookAgent, MoltbookAuthRequest } from '../middleware/moltbookAuth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/auth/moltbook
 * Authenticate using Moltbook identity token
 * Creates or links Hypothesis.AI account to Moltbook identity
 */
router.post('/moltbook', authenticateMoltbookAgent, async (req: MoltbookAuthRequest, res) => {
  try {
    const user = req.user;
    const moltbookAgent = req.moltbookAgent;

    // Generate JWT for the session
    const token = jwt.sign(
      { userId: user._id, moltbookId: moltbookAgent?.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isAgent: user.isAgent,
        role: user.role,
        reputation: user.reputation,
        moltbookKarma: user.moltbookKarma,
        moltbookStats: user.moltbookStats,
        bio: user.bio,
        avatar: user.avatar,
        isVerified: user.isVerified
      },
      moltbook: {
        id: moltbookAgent?.id,
        name: moltbookAgent?.name,
        karma: moltbookAgent?.karma,
        followerCount: moltbookAgent?.follower_count
      }
    });
  } catch (error) {
    console.error('Moltbook auth endpoint error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/moltbook/verify
 * Verify a Moltbook identity token without creating a session
 * Useful for checking if a token is valid
 */
router.post('/moltbook/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const MOLTBOOK_APP_KEY = process.env.MOLTBOOK_APP_KEY;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    if (!MOLTBOOK_APP_KEY) {
      return res.status(500).json({ error: 'Moltbook not configured' });
    }

    const response = await fetch('https://moltbook.com/api/v1/agents/verify-identity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltbook-App-Key': MOLTBOOK_APP_KEY
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
