import chokidar from 'chokidar';
import path from 'path';
import { getVaultPath, loadNoteFromFile } from './vault.js';
import { createNote, updateNote, deleteNote, getNoteById } from './database.js';

let watcher;

export function startFileWatcher() {
  const vaultPath = getVaultPath();
  const watchPaths = [
    path.join(vaultPath, 'notes', '*.md'),
    path.join(vaultPath, 'daily', '*.md')
  ];

  watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', handleFileAdd)
    .on('change', handleFileChange)
    .on('unlink', handleFileRemove)
    .on('error', error => console.error('Watcher error:', error));

  console.log('File watcher started for vault:', vaultPath);
}

async function handleFileAdd(filepath) {
  try {
    console.log('File added:', filepath);
    const note = loadNoteFromFile(filepath);

    if (note) {
      // Check if note exists in database
      const existing = getNoteById(note.id);

      if (!existing) {
        createNote(note);
        broadcastUpdate('note:created', note);
      }
    }
  } catch (error) {
    console.error('Error handling file add:', error);
  }
}

async function handleFileChange(filepath) {
  try {
    console.log('File changed:', filepath);
    const note = loadNoteFromFile(filepath);

    if (note) {
      const existing = getNoteById(note.id);

      if (existing) {
        updateNote(note.id, note);
        broadcastUpdate('note:updated', note);
      } else {
        createNote(note);
        broadcastUpdate('note:created', note);
      }
    }
  } catch (error) {
    console.error('Error handling file change:', error);
  }
}

async function handleFileRemove(filepath) {
  try {
    console.log('File removed:', filepath);

    // Find note by path
    const filename = path.basename(filepath);
    // This is a simplified approach - in production, you'd want to track filepath in DB
    broadcastUpdate('note:deleted', { path: filepath });
  } catch (error) {
    console.error('Error handling file remove:', error);
  }
}

function broadcastUpdate(type, data) {
  if (global.broadcast) {
    global.broadcast({
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    console.log('File watcher stopped');
  }
}

export default {
  startFileWatcher,
  stopFileWatcher
};