import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  createAttachment,
  getAttachmentsByNoteId,
  deleteAttachment as deleteAttachmentDb
} from '../services/database.js';
import {
  saveAttachment,
  deleteAttachmentFile
} from '../services/vault.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Upload attachment
router.post('/:noteId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { noteId } = req.params;
    const attachment = saveAttachment(req.file, noteId);

    // Save to database
    createAttachment(attachment);

    res.json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Get attachments for a note
router.get('/:noteId', async (req, res) => {
  try {
    const attachments = getAttachmentsByNoteId(req.params.noteId);
    res.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get attachment info
    const attachment = getAttachmentsByNoteId(id)[0]; // Simplified lookup

    if (attachment) {
      // Delete file
      deleteAttachmentFile(attachment.path);
    }

    // Delete from database
    const deleted = deleteAttachmentDb(id);

    res.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

export default router;