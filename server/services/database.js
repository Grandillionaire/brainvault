import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export function initDatabase() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/brainvault.db');

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable foreign keys and WAL mode for better performance
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      plainContent TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      tags TEXT DEFAULT '[]',
      links TEXT DEFAULT '[]',
      backlinks TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      path TEXT,
      type TEXT DEFAULT 'note'
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      noteId TEXT,
      filename TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT,
      size INTEGER,
      path TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      count INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      noteId TEXT,
      tagId TEXT,
      PRIMARY KEY (noteId, tagId),
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Full-text search virtual table
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      plainContent,
      tags,
      content=notes,
      content_rowid=rowid,
      tokenize='porter unicode61'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS notes_ai
    AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, plainContent, tags)
      VALUES (new.rowid, new.title, new.plainContent, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_ad
    AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
    END;

    CREATE TRIGGER IF NOT EXISTS notes_au
    AFTER UPDATE ON notes BEGIN
      UPDATE notes_fts
      SET title = new.title,
          plainContent = new.plainContent,
          tags = new.tags
      WHERE rowid = new.rowid;
    END;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(createdAt);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
    CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(noteId);
  `);

  // Insert default settings if not exist
  const settingsStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaultSettings = {
    'theme': 'auto',
    'fontSize': '16',
    'fontFamily': 'Inter',
    'autoSave': 'true',
    'autoSaveInterval': '30000',
    'vaultPath': path.join(__dirname, '../vault'),
    'dailyNotesFolder': 'daily',
    'attachmentsFolder': 'attachments',
    'templatesFolder': 'templates'
  };

  Object.entries(defaultSettings).forEach(([key, value]) => {
    settingsStmt.run(key, value);
  });

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Note operations
export function createNote(note) {
  const stmt = db.prepare(`
    INSERT INTO notes (
      id, title, content, plainContent,
      tags, links, backlinks, attachments,
      metadata, path, type
    ) VALUES (
      @id, @title, @content, @plainContent,
      @tags, @links, @backlinks, @attachments,
      @metadata, @path, @type
    )
  `);

  return stmt.run({
    ...note,
    tags: JSON.stringify(note.tags || []),
    links: JSON.stringify(note.links || []),
    backlinks: JSON.stringify(note.backlinks || []),
    attachments: JSON.stringify(note.attachments || []),
    metadata: JSON.stringify(note.metadata || {})
  });
}

export function updateNote(id, updates) {
  const current = getNoteById(id);
  if (!current) throw new Error('Note not found');

  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const stmt = db.prepare(`
    UPDATE notes SET
      title = @title,
      content = @content,
      plainContent = @plainContent,
      tags = @tags,
      links = @links,
      backlinks = @backlinks,
      attachments = @attachments,
      metadata = @metadata,
      path = @path,
      type = @type,
      updatedAt = @updatedAt
    WHERE id = @id
  `);

  stmt.run({
    ...updated,
    tags: JSON.stringify(updated.tags || []),
    links: JSON.stringify(updated.links || []),
    backlinks: JSON.stringify(updated.backlinks || []),
    attachments: JSON.stringify(updated.attachments || []),
    metadata: JSON.stringify(updated.metadata || {})
  });

  return getNoteById(id);
}

export function deleteNote(id) {
  const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getNoteById(id) {
  const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
  const note = stmt.get(id);

  if (note) {
    return {
      ...note,
      tags: JSON.parse(note.tags),
      links: JSON.parse(note.links),
      backlinks: JSON.parse(note.backlinks),
      attachments: JSON.parse(note.attachments),
      metadata: JSON.parse(note.metadata)
    };
  }

  return null;
}

export function getAllNotes() {
  const stmt = db.prepare('SELECT * FROM notes ORDER BY updatedAt DESC');
  const notes = stmt.all();

  return notes.map(note => ({
    ...note,
    tags: JSON.parse(note.tags),
    links: JSON.parse(note.links),
    backlinks: JSON.parse(note.backlinks),
    attachments: JSON.parse(note.attachments),
    metadata: JSON.parse(note.metadata)
  }));
}

// Search operations
export function searchNotes(query, options = {}) {
  const {
    limit = 50,
    offset = 0,
    tags = [],
    sortBy = 'relevance'
  } = options;

  let sql;
  let params = [];

  if (query) {
    // Full-text search
    sql = `
      SELECT
        n.*,
        rank
      FROM notes n
      JOIN notes_fts ON n.rowid = notes_fts.rowid
      WHERE notes_fts MATCH ?
    `;
    params.push(query);

    if (tags.length > 0) {
      sql += ' AND (';
      tags.forEach((tag, index) => {
        if (index > 0) sql += ' OR ';
        sql += 'n.tags LIKE ?';
        params.push(`%"${tag}"%`);
      });
      sql += ')';
    }

    if (sortBy === 'relevance') {
      sql += ' ORDER BY rank';
    } else if (sortBy === 'created') {
      sql += ' ORDER BY n.createdAt DESC';
    } else if (sortBy === 'updated') {
      sql += ' ORDER BY n.updatedAt DESC';
    }
  } else {
    // Browse with filters
    sql = 'SELECT * FROM notes WHERE 1=1';

    if (tags.length > 0) {
      sql += ' AND (';
      tags.forEach((tag, index) => {
        if (index > 0) sql += ' OR ';
        sql += 'tags LIKE ?';
        params.push(`%"${tag}"%`);
      });
      sql += ')';
    }

    sql += ' ORDER BY updatedAt DESC';
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(sql);
  const notes = stmt.all(...params);

  return notes.map(note => ({
    ...note,
    tags: JSON.parse(note.tags),
    links: JSON.parse(note.links),
    backlinks: JSON.parse(note.backlinks),
    attachments: JSON.parse(note.attachments),
    metadata: JSON.parse(note.metadata),
    score: note.rank ? -note.rank : 0 // FTS5 rank is negative
  }));
}

// Settings operations
export function getSetting(key) {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key);
  return result ? result.value : null;
}

export function setSetting(key, value) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(key, value);
}

export function getAllSettings() {
  const stmt = db.prepare('SELECT key, value FROM settings');
  const settings = stmt.all();

  const result = {};
  settings.forEach(({ key, value }) => {
    result[key] = value;
  });

  return result;
}

// Tag operations
export function getAllTags() {
  const stmt = db.prepare(`
    SELECT name, COUNT(*) as count
    FROM (
      SELECT json_each.value as name
      FROM notes, json_each(notes.tags)
    )
    GROUP BY name
    ORDER BY count DESC
  `);

  return stmt.all();
}

// Attachment operations
export function createAttachment(attachment) {
  const stmt = db.prepare(`
    INSERT INTO attachments (
      id, noteId, filename, originalName,
      mimeType, size, path
    ) VALUES (
      @id, @noteId, @filename, @originalName,
      @mimeType, @size, @path
    )
  `);

  return stmt.run(attachment);
}

export function getAttachmentsByNoteId(noteId) {
  const stmt = db.prepare('SELECT * FROM attachments WHERE noteId = ?');
  return stmt.all(noteId);
}

export function deleteAttachment(id) {
  const stmt = db.prepare('DELETE FROM attachments WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Update backlinks for a note
export function updateBacklinks(noteId, linkedNoteIds) {
  const transaction = db.transaction(() => {
    // Remove old backlinks
    linkedNoteIds.forEach(linkedId => {
      const linkedNote = getNoteById(linkedId);
      if (linkedNote) {
        const backlinks = linkedNote.backlinks.filter(id => id !== noteId);
        const stmt = db.prepare('UPDATE notes SET backlinks = ? WHERE id = ?');
        stmt.run(JSON.stringify(backlinks), linkedId);
      }
    });

    // Add new backlinks
    const note = getNoteById(noteId);
    if (note) {
      note.links.forEach(linkedTitle => {
        const stmt = db.prepare('SELECT id, backlinks FROM notes WHERE title = ?');
        const linkedNote = stmt.get(linkedTitle);

        if (linkedNote) {
          const backlinks = JSON.parse(linkedNote.backlinks);
          if (!backlinks.includes(noteId)) {
            backlinks.push(noteId);
            const updateStmt = db.prepare('UPDATE notes SET backlinks = ? WHERE id = ?');
            updateStmt.run(JSON.stringify(backlinks), linkedNote.id);
          }
        }
      });
    }
  });

  transaction();
}

export default {
  initDatabase,
  getDb,
  createNote,
  updateNote,
  deleteNote,
  getNoteById,
  getAllNotes,
  searchNotes,
  getSetting,
  setSetting,
  getAllSettings,
  getAllTags,
  createAttachment,
  getAttachmentsByNoteId,
  deleteAttachment,
  updateBacklinks
};