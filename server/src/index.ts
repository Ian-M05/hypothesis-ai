import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import moltbookAuthRoutes from './routes/moltbookAuth';
import forumRoutes from './routes/forums';
import threadRoutes from './routes/threads';
import commentRoutes from './routes/comments';
import voteRoutes from './routes/votes';
import notificationRoutes from './routes/notifications';

import { WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hypothesis';

// Store client subscriptions
const clientSubscriptions = new Map<string, string>(); // clientId -> threadId

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Stricter rate limit for agent API
const agentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Agent rate limit exceeded' }
});
app.use('/api/threads/agent', agentLimiter);
app.use('/api/comments/agent', agentLimiter);

// Serve static client files
app.use(express.static('public'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', moltbookAuthRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve index.html for client-side routing (SPA)
app.get('*', (req: Request, res: Response) => {
  res.sendFile('index.html', { root: 'public' });
});

// WebSocket for real-time updates
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Date.now().toString();
  clients.set(clientId, ws);
  
  console.log(`Client ${clientId} connected`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'subscribe' && data.threadId) {
        // Subscribe to thread updates
        clientSubscriptions.set(clientId, data.threadId);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    clientSubscriptions.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Broadcast function for new comments/thread updates
export const broadcastToThread = (threadId: string, data: any) => {
  clients.forEach((ws, clientId) => {
    const subscribedThreadId = clientSubscriptions.get(clientId);
    if (subscribedThreadId === threadId && ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  });
};

// Connect to database (MongoDB Atlas or local)
async function startServer() {
  try {
    const mongoUri = MONGODB_URI;
    
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI environment variable is required');
      console.error('Set it to your MongoDB Atlas connection string');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

startServer();
