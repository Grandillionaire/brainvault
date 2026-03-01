import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import notesRouter from './routes/notes.js';
import searchRouter from './routes/search.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import attachmentsRouter from './routes/attachments.js';

// Import services
import { initDatabase } from './services/database.js';
import { initVault } from './services/vault.js';
import { startFileWatcher } from './services/watcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
    }
  }
}));

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : (process.env.CLIENT_URL || 'http://localhost:1420'),
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan('dev'));

// Simple rate limiter
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const requests = rateLimits.get(ip).filter(t => t > windowStart);
  requests.push(now);
  rateLimits.set(ip, requests);

  if (requests.length > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

// Apply before routes
app.use(rateLimit);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/notes', notesRouter);
app.use('/api/search', searchRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/attachments', attachmentsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Initialize services
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized');

    // Initialize vault
    await initVault();
    console.log('✅ Vault initialized');

    // Start file watcher
    startFileWatcher();
    console.log('✅ File watcher started');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 BrainVault server running on http://localhost:${PORT}`);
      console.log(`📁 Vault location: ${process.env.VAULT_PATH || path.join(__dirname, 'vault')}`);
    });

    // WebSocket server for real-time updates
    const wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    wss.on('connection', (ws) => {
      console.log('Client connected via WebSocket');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      }));
    });

    // Broadcast function for real-time updates
    global.broadcast = (data) => {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });
    };

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    case 'subscribe':
      // Handle subscription to specific note updates
      ws.noteSubscriptions = data.noteIds || [];
      break;
    default:
      console.log('Unknown WebSocket message type:', data.type);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...');
  process.exit(0);
});

// Start the server
startServer();