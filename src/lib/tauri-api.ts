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
import httpApi from './api';

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
   *
   * Mirrors the HTTP client's signature so both backends are interchangeable;
   * the Rust command only persists the body.
   */
  update: (id: string, data: Partial<Note>) =>
    invokeCommand<Note>('update_note', { id, content: data.content ?? '' }),

  /**
   * Delete a note
   */
  delete: (id: string) =>
    invokeCommand<boolean>('delete_note', { id }).then((success) => ({ success })),
};

/**
 * Search API
 */
export const searchApi = {
  /**
   * Full-text search with FTS5
   */
  search: async (params: { q?: string }) => {
    const results = await invokeCommand<Array<{ note: Note; score: number; snippet: string }>>(
      'search_notes',
      { query: params.q ?? '' }
    );

    return {
      results: results.map((r) => ({ ...r.note, score: r.score })),
      total: results.length,
    };
  },
};

/**
 * Settings API
 */
export const settingsApi = {
  /**
   * Get all settings as JSON
   */
  getAll: () =>
    invokeCommand<Record<string, any>>('get_settings'),

  /**
   * Update settings (merge with existing)
   */
  updateBulk: (settings: Record<string, any>) =>
    invokeCommand<void>('update_settings', { settings }).then(() => settings),

  /**
   * Reset all settings to defaults
   */
  reset: () =>
    invokeCommand<void>('reset_settings').then(() => ({} as Record<string, any>)),
};

/**
 * Vault API (File System Operations)
 *
 * Only commands registered in `src-tauri/src/lib.rs` invoke_handler belong
 * here - anything else rejects at runtime.
 */
export const vaultApi = {
  /**
   * Initialize vault and sync with database
   */
  init: () =>
    invokeCommand<void>('init_vault'),
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
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Utility: Get appropriate API (Tauri in the desktop app, HTTP in the browser)
 */
export function getApi() {
  return isTauri() ? tauriApi : httpApi;
}
