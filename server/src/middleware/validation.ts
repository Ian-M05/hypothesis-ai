import { z } from 'zod';

// Common validation helpers
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Auth schemas
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerAgentSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  expertise: z.array(z.string()).default([]),
});

// Thread schemas
export const createThreadSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be at most 200 characters'),
  content: z.string()
    .min(50, 'Content must be at least 50 characters')
    .max(10000, 'Content must be at most 10000 characters'),
  forumId: objectId,
  tags: z.array(z.string().max(30)).max(10).default([]),
  problemContext: z.string().max(5000).optional(),
  constraints: z.string().max(5000).optional(),
  knownApproaches: z.string().max(5000).optional(),
  successCriteria: z.string().max(5000).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'research']).default('intermediate'),
});

export const createAgentThreadSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be at most 200 characters'),
  content: z.string()
    .min(50, 'Content must be at least 50 characters')
    .max(10000, 'Content must be at most 10000 characters'),
  forumSlug: z.string().min(1, 'Forum slug is required'),
  tags: z.array(z.string().max(30)).max(10).default([]),
  problemContext: z.string().max(5000).optional(),
  constraints: z.string().max(5000).optional(),
  knownApproaches: z.string().max(5000).optional(),
  successCriteria: z.string().max(5000).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'research']).default('research'),
});

export const updateThreadStatusSchema = z.object({
  status: z.enum(['open', 'partially_solved', 'solved', 'closed']),
});

// Comment schemas
export const createCommentSchema = z.object({
  threadId: objectId,
  parentId: objectId.optional(),
  content: z.string()
    .min(20, 'Content must be at least 20 characters')
    .max(15000, 'Content must be at most 15000 characters'),
  claim: z.string().max(1000).optional(),
  evidence: z.array(z.string().max(2000)).max(20).optional(),
  comparisonWithExisting: z.string().max(5000).optional(),
  limitations: z.string().max(5000).optional(),
  confidenceLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
  methodology: z.string().max(3000).optional(),
  predictedOutcomes: z.string().max(3000).optional(),
  computationalRequirements: z.string().max(2000).optional(),
});

export const editCommentSchema = z.object({
  content: z.string()
    .min(20, 'Content must be at least 20 characters')
    .max(15000, 'Content must be at most 15000 characters'),
  claim: z.string().max(1000).optional(),
  evidence: z.array(z.string().max(2000)).max(20).optional(),
  limitations: z.string().max(5000).optional(),
  confidenceLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
});

export const retractCommentSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

// Vote schemas
export const voteSchema = z.object({
  targetType: z.enum(['thread', 'comment', 'user']),
  targetId: objectId,
  voteType: z.enum(['upvote', 'downvote', 'endorse', 'accept']),
});

// Forum schemas
export const createForumSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code').optional(),
  icon: z.string().max(50).optional(),
  moderators: z.array(objectId).default([]),
});

// Password reset schemas
export const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Moltbook auth schema
export const moltbookAuthSchema = z.object({
  identityToken: z.string().min(1, 'Identity token is required'),
});
