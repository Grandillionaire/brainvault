/**
 * Tauri Backend API Client
 *
 * This uses Tauri's invoke() function for direct Rust backend communication.
 * No HTTP server required - 10-100x faster than REST API!
 *
 * Usage:
 *   import { tauriApi } from '@/lib/tauri-api';
 *   const notes = await tauriApi.notes.getAll();
 */

import { invoke } from '@tauri-apps/api/core';
import type { Note } from '../types';

class TauriApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TauriApiError';
  }
}

/**
 * Wrapper for Tauri invoke with error handling
 */
async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TauriApiError(message);
  }
}

/**
 * Notes API
 */
export const notesApi = {
  /**
   * Get all notes
   */
  getAll: () => invokeCommand<Note[]>('list_notes'),

  /**
   * Get a single note by ID
   */
  getById: (id: string) => invokeCommand<Note | null>('get_note', { id }),

  /**
   * Create a new note
   */
  create: (data: {
    title: string;
    content: string;
    tags?: string[];
  }) => invokeCommand<Note>('create_note', {
    title: data.title,
    content: data.content,
    tags: data.tags || [],
  }),

  /**
   * Update a note's content
   */
  update: (id: string, content: string) =>
    invokeCommand<Note>('update_note', { id, content }),

  /**
   * Delete a note
   */
  delete: (id: string) =>
    invokeCommand<boolean>('delete_note', { id }),

  /**
   * Get or create today's daily note
   */
  getDailyNote: () =>
    invokeCommand<Note>('get_daily_note'),
};

/**
 * Search API
 */
export const searchApi = {
  /**
   * Full-text search with FTS5
   */
  search: (query: string) =>
    invokeCommand<Array<{ note: Note; score: number; snippet: string }>>('search_notes', { query }),

  /**
   * Get all tags with counts
   */
  getTags: () =>
    invokeCommand<Array<{ name: string; count: number }>>('get_tags'),

  /**
   * Search suggestions for autocomplete
   */
  getSuggestions: (query: string) =>
    invokeCommand<string[]>('get_suggestions', { query }),
};

/**
 * Settings API
 */
export const settingsApi = {
  /**
   * Get all settings as JSON
   */
  getAll: () =>
    invokeCommand<Record<string, unknown>>('get_settings'),

  /**
   * Update settings (merge with existing)
   */
  update: (settings: Record<string, unknown>) =>
    invokeCommand<void>('update_settings', { settings }),

  /**
   * Reset all settings to defaults
   */
  reset: () =>
    invokeCommand<void>('reset_settings'),
};

/**
 * Vault API (File System Operations)
 */
export const vaultApi = {
  /**
   * Initialize vault and sync with database
   */
  init: () =>
    invokeCommand<void>('init_vault'),

  /**
   * Get vault path
   */
  getPath: () =>
    invokeCommand<string>('get_vault_path'),

  /**
   * Export note as markdown file
   */
  exportNote: (id: string, path: string) =>
    invokeCommand<void>('export_note', { id, path }),

  /**
   * Import markdown file as note
   */
  importNote: (path: string) =>
    invokeCommand<Note>('import_note', { path }),
};

/**
 * Complete API object
 */
export const tauriApi = {
  notes: notesApi,
  search: searchApi,
  settings: settingsApi,
  vault: vaultApi,
};

/**
 * Export default
 */
export default tauriApi;

/**
 * Utility: Check if running in Tauri
 */
export function isTauri(): boolean {
  return '__TAURI__' in window;
}

/**
 * Utility: Get appropriate API (Tauri or HTTP fallback)
 */
export function getApi() {
  if (isTauri()) {
    return tauriApi;
  } else {
    // Fallback to HTTP API for web version
    console.warn('Running in browser mode - some features may be limited');
    return tauriApi; // You could import the HTTP api.ts here as fallback
  }
}
