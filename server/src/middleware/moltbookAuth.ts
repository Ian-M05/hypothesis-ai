import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { AuthRequest } from './auth';

const MOLTBOOK_API_URL = 'https://moltbook.com/api/v1/agents/verify-identity';
const MOLTBOOK_APP_KEY = process.env.MOLTBOOK_APP_KEY;

export interface MoltbookAgent {
  id: string;
  name: string;
  description?: string;
  karma: number;
  avatar_url?: string;
  is_claimed: boolean;
  created_at: string;
  follower_count: number;
  stats: {
    posts: number;
    comments: number;
  };
  owner?: {
    x_handle?: string;
    x_name?: string;
    x_verified?: boolean;
    x_follower_count?: number;
  };
}

export interface MoltbookAuthRequest extends AuthRequest {
  moltbookAgent?: MoltbookAgent;
}

/**
 * Verify Moltbook identity token and attach agent to request
 * This middleware validates the X-Moltbook-Identity header
 */
export const verifyMoltbookIdentity = async (
  req: MoltbookAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identityToken = req.headers['x-moltbook-identity'] as string;

    if (!identityToken) {
      return res.status(401).json({
        error: 'No identity token provided',
        hint: 'Include X-Moltbook-Identity header with a valid Moltbook identity token'
      });
    }

    if (!MOLTBOOK_APP_KEY) {
      console.error('MOLTBOOK_APP_KEY not configured');
      return res.status(500).json({
        error: 'Moltbook integration not configured'
      });
    }

    // Verify token with Moltbook API
    const response = await fetch(MOLTBOOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltbook-App-Key': MOLTBOOK_APP_KEY
      },
      body: JSON.stringify({ token: identityToken })
    });

    // Handle HTTP errors from Moltbook API
    if (!response.ok) {
      const errorStatus = response.status;
      let errorMessage = 'Moltbook API error';
      
      switch (errorStatus) {
        case 401:
          errorMessage = 'Invalid Moltbook app key';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded - please retry later';
          break;
        case 500:
        case 503:
          errorMessage = 'Moltbook service temporarily unavailable';
          break;
      }
      
      return res.status(502).json({
        error: 'moltbook_api_error',
        message: errorMessage,
        status: errorStatus
      });
    }

    const data = await response.json() as { 
      success: boolean;
      valid: boolean; 
      error?: string; 
      message?: string;
      hint?: string; 
      agent?: MoltbookAgent 
    };

    if (!data.valid) {
      // Pass through Moltbook's specific error codes
      const errorCode = data.error || 'invalid_token';
      let userMessage = data.message || 'Invalid identity token';
      let action = 'Request a new identity token from Moltbook';
      
      // Customize message based on error code
      switch (errorCode) {
        case 'token_expired':
          action = 'Generate a new identity token - this one has expired';
          break;
        case 'token_invalid':
          action = 'Check that the token is properly formatted';
          break;
        case 'token_revoked':
        case 'agent_not_found':
          action = 'The agent account may have been deleted or revoked';
          break;
      }
      
      return res.status(401).json({
        error: errorCode,
        message: userMessage,
        hint: action
      });
    }

    // Attach verified agent to request
    req.moltbookAgent = data.agent;
    next();
  } catch (error) {
    console.error('Moltbook verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify Moltbook identity'
    });
  }
};

/**
 * Authenticate or create user from Moltbook identity
 * Links Moltbook agent to local Hypothesis.AI account
 */
export const authenticateMoltbookAgent = async (
  req: MoltbookAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identityToken = req.headers['x-moltbook-identity'] as string;

    if (!identityToken) {
      return res.status(401).json({
        error: 'No identity token provided',
        hint: 'Include X-Moltbook-Identity header with a valid Moltbook identity token'
      });
    }

    if (!MOLTBOOK_APP_KEY) {
      console.error('MOLTBOOK_APP_KEY not configured');
      return res.status(500).json({
        error: 'Moltbook integration not configured'
      });
    }

    // Verify token with Moltbook API
    const response = await fetch(MOLTBOOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltbook-App-Key': MOLTBOOK_APP_KEY
      },
      body: JSON.stringify({ token: identityToken })
    });

    // Handle HTTP errors from Moltbook API
    if (!response.ok) {
      const errorStatus = response.status;
      let errorMessage = 'Moltbook API error';
      
      switch (errorStatus) {
        case 401:
          errorMessage = 'Invalid Moltbook app key';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded - please retry later';
          break;
        case 500:
        case 503:
          errorMessage = 'Moltbook service temporarily unavailable';
          break;
      }
      
      return res.status(502).json({
        error: 'moltbook_api_error',
        message: errorMessage,
        status: errorStatus
      });
    }

    const data = await response.json() as { 
      success: boolean;
      valid: boolean; 
      error?: string; 
      message?: string;
      hint?: string; 
      agent?: MoltbookAgent 
    };

    if (!data.valid) {
      // Pass through Moltbook's specific error codes
      const errorCode = data.error || 'invalid_token';
      let userMessage = data.message || 'Invalid identity token';
      let action = 'Request a new identity token from Moltbook';
      
      // Customize message based on error code
      switch (errorCode) {
        case 'token_expired':
          action = 'Generate a new identity token - this one has expired';
          break;
        case 'token_invalid':
          action = 'Check that the token is properly formatted';
          break;
        case 'token_revoked':
        case 'agent_not_found':
          action = 'The agent account may have been deleted or revoked';
          break;
      }
      
      return res.status(401).json({
        error: errorCode,
        message: userMessage,
        hint: action
      });
    }

    const moltbookAgent: MoltbookAgent = data.agent!;

    // Find existing user linked to this Moltbook agent
    let user = await User.findOne({ moltbookId: moltbookAgent.id });

    if (!user) {
      // Create new agent account linked to Moltbook identity
      user = new User({
        username: moltbookAgent.name,
        isAgent: true,
        role: 'agent',
        moltbookId: moltbookAgent.id,
        moltbookKarma: moltbookAgent.karma,
        moltbookStats: moltbookAgent.stats,
        bio: moltbookAgent.description || `Moltbook agent with ${moltbookAgent.karma} karma`,
        avatar: moltbookAgent.avatar_url,
        isVerified: moltbookAgent.is_claimed,
        // Initialize with some reputation based on Moltbook karma
        reputation: Math.min(moltbookAgent.karma / 10, 100)
      });

      await user.save();
    } else {
      // Update Moltbook stats on each login
      user.moltbookKarma = moltbookAgent.karma;
      user.moltbookStats = moltbookAgent.stats;
      user.lastActive = new Date();
      await user.save();
    }

    req.user = user;
    req.moltbookAgent = moltbookAgent;
    next();
  } catch (error) {
    console.error('Moltbook authentication error:', error);
    return res.status(500).json({
      error: 'Failed to authenticate Moltbook agent'
    });
  }
};
