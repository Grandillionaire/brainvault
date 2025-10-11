# BrainVault Backend Setup Guide

## ✅ Backend Status: FULLY IMPLEMENTED

All backend features are implemented and working. The server includes:

- ✅ Express.js REST API
- ✅ SQLite database with FTS5 full-text search
- ✅ File system vault storage
- ✅ WebSocket real-time updates
- ✅ Ollama AI integration
- ✅ Complete CRUD operations
- ✅ Attachment handling
- ✅ Settings management
- ✅ Search and tagging

---

## 🚀 Quick Start

### Option 1: Use the Startup Script (Recommended)

```bash
./start-dev.sh
```

This will:
1. Check and install dependencies
2. Create required directories
3. Start both backend and frontend servers
4. Open the app at http://localhost:1420

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd server
npm install
node index.js
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

---

## 📋 Prerequisites

### Required

- **Node.js** (v18+): https://nodejs.org
- **npm** (comes with Node.js)

### Optional

- **Ollama** (for local AI): https://ollama.com
  ```bash
  # macOS/Linux
  brew install ollama
  
  # Start Ollama
  ollama serve
  
  # Pull a model
  ollama pull llama2
  ```

---

## 🏗️ Architecture

### Backend Stack

```
server/
├── index.js              # Main Express server
├── .env                  # Configuration
├── routes/               # API endpoints
│   ├── notes.js         # Notes CRUD
│   ├── search.js        # Full-text search
│   ├── settings.js      # User settings
│   ├── ai.js            # AI/Ollama integration
│   ├── attachments.js   # File uploads
│   └── auth.js          # Authentication (optional)
├── services/
│   ├── database.js      # SQLite + FTS5
│   ├── vault.js         # File system operations
│   └── watcher.js       # File watcher for sync
└── data/
    ├── brainvault.db    # SQLite database
    └── vault/           # Markdown files
        ├── notes/
        ├── daily/
        ├── attachments/
        └── templates/
```

### Database Schema

```sql
-- Notes table with full-text search
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  plainContent TEXT,
  createdAt DATETIME,
  updatedAt DATETIME,
  tags TEXT (JSON),
  links TEXT (JSON),
  backlinks TEXT (JSON),
  attachments TEXT (JSON),
  metadata TEXT (JSON),
  path TEXT,
  type TEXT
);

-- FTS5 virtual table for fast search
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, plainContent, tags
);

-- Settings, attachments, tags tables...
```

---

## 🔌 API Endpoints

### Notes

```
GET    /api/notes          # Get all notes
GET    /api/notes/:id      # Get single note
POST   /api/notes          # Create note
PUT    /api/notes/:id      # Update note
DELETE /api/notes/:id      # Delete note
GET    /api/notes/daily/:date?  # Get daily note
```

### Search

```
GET /api/search
  ?q=query           # Search query
  &tags=tag1,tag2    # Filter by tags
  &limit=50          # Results limit
  &offset=0          # Pagination
  &sortBy=relevance  # Sort (relevance/created/updated/title)

GET /api/search/tags              # Get all tags with counts
GET /api/search/suggestions?q=    # Autocomplete
```

### Settings

```
GET /api/settings           # Get all settings
GET /api/settings/:key      # Get specific setting
PUT /api/settings/:key      # Update setting
PUT /api/settings           # Bulk update
POST /api/settings/reset    # Reset to defaults
```

### AI (Ollama)

```
GET  /api/ai/status         # Check Ollama status
POST /api/ai/chat           # Chat with AI
POST /api/ai/suggest        # Get suggestions
POST /api/ai/summarize      # Summarize content
```

### Attachments

```
POST   /api/attachments/:noteId  # Upload file
GET    /api/attachments/:noteId  # Get attachments
DELETE /api/attachments/:id      # Delete attachment
```

### Health

```
GET /api/health  # Server health check
```

---

## 🔐 Environment Variables

Create `server/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Client (CORS)
CLIENT_URL=http://localhost:1420

# Database
DB_PATH=./data/brainvault.db

# Vault (file storage)
VAULT_PATH=./data/vault

# JWT (optional, for auth)
JWT_SECRET=change-this-in-production

# Ollama (optional)
OLLAMA_URL=http://localhost:11434
```

---

## 📂 Vault Structure

```
vault/
├── notes/              # Regular notes
│   ├── my-note.md
│   └── project-ideas.md
├── daily/              # Daily notes
│   ├── 2025-10-11.md
│   └── 2025-10-10.md
├── attachments/        # Uploaded files
│   └── [noteId]/
│       └── image.png
├── templates/          # Note templates
│   ├── daily.md
│   ├── meeting.md
│   └── project.md
└── .trash/             # Deleted notes (recovery)
```

### Markdown Format

```markdown
---
id: uuid-v4
title: My Note
created: 2025-10-11T...
updated: 2025-10-11T...
tags: ["project", "idea"]
links: ["Related Note"]
---

# My Note

Content with [[Wiki Links]] and #tags

## Tasks
- [ ] Todo item
```

---

## 🔍 Full-Text Search (FTS5)

The backend uses SQLite's FTS5 for lightning-fast search:

```javascript
// Search examples
GET /api/search?q=machine learning
GET /api/search?q=project&tags=work,important
GET /api/search?q=meeting&sortBy=updated
```

### FTS5 Features

- Porter stemming (searching "running" finds "run", "runs", etc.)
- Unicode support
- Prefix matching
- Phrase search
- Boolean operators (AND, OR, NOT)

---

## 🤖 AI Integration

### Ollama Setup

```bash
# Install Ollama
brew install ollama  # macOS/Linux
# or download from https://ollama.com

# Start Ollama service
ollama serve

# Pull a model
ollama pull llama2      # 7B model (~4GB)
ollama pull mistral     # Alternative
ollama pull codellama   # For code

# List models
ollama list
```

### AI Endpoints Usage

```bash
# Check status
curl http://localhost:3001/api/ai/status

# Chat
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What did I write about AI?"}'

# Get suggestions
curl -X POST http://localhost:3001/api/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning project", "type": "tags"}'
```

---

## 🔄 WebSocket Real-Time Updates

The server supports WebSocket connections for real-time updates:

```javascript
// Client connection
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch(event.type) {
    case 'note:created':
    case 'note:updated':
    case 'note:deleted':
      // Update UI
      break;
  }
});

// Ping/pong keepalive
ws.send(JSON.stringify({ type: 'ping' }));
```

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Create a note
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "Hello #world",
    "tags": ["test"]
  }'

# Get all notes
curl http://localhost:3001/api/notes

# Search
curl "http://localhost:3001/api/search?q=hello"

# Get tags
curl http://localhost:3001/api/search/tags
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Database Locked

```bash
# Stop all instances
pkill -f "node.*index.js"

# Remove lock files
rm server/data/brainvault.db-shm
rm server/data/brainvault.db-wal
```

### Ollama Not Working

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Check logs
tail -f ~/.ollama/logs/server.log  # macOS
```

### File Watcher Issues

```bash
# Increase file watch limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 🚀 Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Change `JWT_SECRET` to a secure value
3. Set proper `CORS` origins
4. Use environment-specific database path
5. Enable HTTPS
6. Set up proper logging

### Process Manager

```bash
# Using PM2
npm install -g pm2

cd server
pm2 start index.js --name brainvault-server
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 📊 Performance

### Database Optimization

- FTS5 index for fast full-text search
- WAL mode for better concurrency
- Prepared statements for security and speed
- JSON storage for flexible metadata

### File System

- Markdown files for portability
- Frontmatter for metadata
- Organized folder structure
- Trash folder for recovery

### Caching

- In-memory note cache (can be added)
- Static file caching
- Compression middleware

---

## 🔒 Security

- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection prevention (prepared statements)
- XSS protection
- Rate limiting (can be added)

---

## 📝 Development

### Adding New Routes

```javascript
// server/routes/myroute.js
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});

export default router;

// server/index.js
import myRoute from './routes/myroute.js';
app.use('/api/myroute', myRoute);
```

### Database Queries

```javascript
import { getDb } from './services/database.js';

const db = getDb();
const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
const note = stmt.get(noteId);
```

---

## 📚 Additional Resources

- Express.js: https://expressjs.com
- SQLite FTS5: https://www.sqlite.org/fts5.html
- Better-SQLite3: https://github.com/WiseLibs/better-sqlite3
- Ollama: https://ollama.com
- WebSockets: https://github.com/websockets/ws

---

**✨ Backend is ready to use! All features are fully implemented and tested. ✨**
