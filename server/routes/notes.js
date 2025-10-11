import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createNote,
  updateNote,
  deleteNote,
  getNoteById,
  getAllNotes,
  updateBacklinks
} from '../services/database.js';
import {
  saveNoteToFile,
  deleteNoteFile,
  createDailyNote,
  extractTags
} from '../services/vault.js';

const router = express.Router();

// Get all notes
router.get('/', async (req, res) => {
  try {
    const notes = getAllNotes();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get single note
router.get('/:id', async (req, res) => {
  try {
    const note = getNoteById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Create note
router.post('/', async (req, res) => {
  try {
    const {
      title = 'Untitled',
      content = '',
      tags = [],
      type = 'note'
    } = req.body;

    // Extract tags and links from content
    const contentTags = extractTags(content);
    const allTags = [...new Set([...tags, ...contentTags])];

    const links = extractWikiLinks(content);

    const id = uuidv4();
    const now = new Date().toISOString();

    // Create full note object with all required fields
    const note = {
      id,
      title,
      content,
      plainContent: stripMarkdown(content),
      createdAt: now,
      updatedAt: now,
      tags: allTags,
      links,
      backlinks: [],
      attachments: [],
      metadata: {},
      type,
      path: '' // Will be set after saving to file
    };

    // Save to file system to get the path
    const filepath = saveNoteToFile(note);
    note.path = filepath;

    // Save to database
    createNote(note);

    // Update backlinks
    updateBacklinks(note.id, links);

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'note:created',
        data: note
      });
    }

    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingNote = getNoteById(id);
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Extract tags and links if content is updated
    if (updates.content) {
      const contentTags = extractTags(updates.content);
      const existingTags = updates.tags || existingNote.tags;
      updates.tags = [...new Set([...existingTags, ...contentTags])];
      updates.links = extractWikiLinks(updates.content);
      updates.plainContent = stripMarkdown(updates.content);
    }

    // Update database
    const updatedNote = updateNote(id, updates);

    // Update file
    if (updatedNote.path) {
      saveNoteToFile(updatedNote);
    }

    // Update backlinks
    if (updates.links) {
      updateBacklinks(id, updates.links);
    }

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'note:updated',
        data: updatedNote
      });
    }

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const note = getNoteById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Delete from file system
    if (note.path) {
      deleteNoteFile(note);
    }

    // Delete from database
    const deleted = deleteNote(id);

    // Broadcast update
    if (global.broadcast) {
      global.broadcast({
        type: 'note:deleted',
        data: { id }
      });
    }

    res.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get daily note
router.get('/daily/:date?', async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : new Date();
    const dailyNote = createDailyNote(date);

    // Save to database if new
    const existing = getNoteById(dailyNote.id);
    if (!existing) {
      createNote(dailyNote);
    }

    res.json(dailyNote);
  } catch (error) {
    console.error('Error getting daily note:', error);
    res.status(500).json({ error: 'Failed to get daily note' });
  }
});

// Helper functions
function extractWikiLinks(content) {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return [...new Set(links)];
}

function stripMarkdown(content) {
  return content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/#(\w+)/g, '$1')
    .trim();
}

export default router;