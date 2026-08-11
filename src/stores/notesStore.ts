import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Note, SearchResult, SearchOptions } from "../types";
import { getApi } from "../lib/tauri-api";
import { extractWikiLinks, extractTags } from "../lib/utils";
import { toast } from "sonner";

// Tauri commands in the desktop app, HTTP in the browser
const { notes: notesApi, search: searchApi } = getApi();

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadNotes: () => Promise<void>;
  createNote: (title?: string, content?: string) => Promise<Note>;
  importNotes: (notes: Note[]) => Promise<number>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  searchNotes: (options: SearchOptions) => Promise<void>;
  getNote: (id: string) => Note | undefined;
  getNoteByTitle: (title: string) => Note | undefined;
  getBacklinks: (noteId: string) => Note[];
  clearError: () => void;
}

export const useNotesStore = create<NotesState>()(
  devtools(
    persist(
      (set, get) => ({
        notes: [],
        currentNote: null,
        searchResults: [],
        isLoading: false,
        error: null,

        loadNotes: async () => {
          set({ isLoading: true, error: null });
          try {
            const notes = await notesApi.getAll();
            set({ notes, isLoading: false });
          } catch (error) {
            // No server: keep whatever the persist middleware rehydrated.
            // Never clear `notes` here — that would overwrite the local vault.
            set({ isLoading: false, error: null });
          }
        },

        createNote: async (title = "Untitled", content = "") => {
          set({ isLoading: true, error: null });
          try {
            const tags = extractTags(content);
            const links = extractWikiLinks(content);

            // Try API first, fallback to local storage
            let note: Note;
            try {
              note = await notesApi.create({
                title,
                content,
                tags,
              });
            } catch (apiError) {
              // Fallback: create note locally
              console.log('API unavailable, creating note locally');
              note = {
                id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title,
                content,
                tags,
                links,
                backlinks: [],
                attachments: [],
                path: `${title}.md`,
                plainContent: content.replace(/[#\[\]]/g, ""),
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }

            set((state) => ({
              notes: [...state.notes, note],
              currentNote: note,
              isLoading: false,
            }));

            toast.success("note created");
            return note;
          } catch (error) {
            set({ error: String(error), isLoading: false });
            throw error;
          }
        },

        importNotes: async (incoming) => {
          if (incoming.length === 0) return 0;

          set({ isLoading: true, error: null });
          try {
            const existingIds = new Set(get().notes.map((n) => n.id));
            // Keep every field the importer recovered (timestamps, folder path,
            // frontmatter metadata, backlinks) instead of re-deriving them.
            const imported = incoming
              .filter((note) => !existingIds.has(note.id))
              .map((note) => ({
                ...note,
                tags: note.tags?.length ? note.tags : extractTags(note.content),
                links: note.links?.length ? note.links : extractWikiLinks(note.content),
                backlinks: note.backlinks || [],
                attachments: note.attachments || [],
                metadata: note.metadata || {},
              }));

            set((state) => ({
              notes: [...state.notes, ...imported],
              isLoading: false,
            }));

            return imported.length;
          } catch (error) {
            set({ error: String(error), isLoading: false });
            throw error;
          }
        },

        updateNote: async (id, updates) => {
          set({ isLoading: true, error: null });
          try {
            const { notes } = get();
            const noteIndex = notes.findIndex((n) => n.id === id);
            if (noteIndex === -1) throw new Error("Note not found");

            // Extract new links and tags if content is updated
            if (updates.content) {
              updates.tags = extractTags(updates.content);
              updates.links = extractWikiLinks(updates.content);
              updates.plainContent = updates.content.replace(/[#\[\]]/g, "");
            }

            // Try API first, fallback to a local update so edits are never lost
            let updatedNote: Note;
            try {
              updatedNote = await notesApi.update(id, updates);
            } catch (apiError) {
              updatedNote = {
                ...notes[noteIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }

            const newNotes = [...notes];
            newNotes[noteIndex] = updatedNote;

            set({
              notes: newNotes,
              currentNote: get().currentNote?.id === id ? updatedNote : get().currentNote,
              isLoading: false,
            });
          } catch (error) {
            set({ error: String(error), isLoading: false });
            toast.error("failed to save note");
          }
        },

        deleteNote: async (id) => {
          set({ isLoading: true, error: null });
          try {
            try {
              await notesApi.delete(id);
            } catch (apiError) {
              // Fallback: delete locally so the vault stays usable offline
              console.log('API unavailable, deleting note locally');
            }

            set((state) => ({
              notes: state.notes.filter((n) => n.id !== id),
              currentNote: state.currentNote?.id === id ? null : state.currentNote,
              isLoading: false,
            }));

            toast.success("note deleted");
          } catch (error) {
            set({ error: String(error), isLoading: false });
            toast.error("failed to delete note");
          }
        },

        setCurrentNote: (note) => {
          set({ currentNote: note });
        },

        searchNotes: async (options) => {
          set({ isLoading: true, error: null });
          try {
            const { results } = await searchApi.search({
              q: options.query,
              tags: options.filters?.tags?.join(','),
              limit: options.limit,
              offset: options.offset,
              sortBy: options.sortBy,
            });

            const searchResults = results.map(r => ({
              note: r,
              score: r.score || 0,
              snippet: r.content?.substring(0, 150) || '',
              highlights: []
            }));

            set({ searchResults, isLoading: false });
          } catch (error) {
            set({ error: String(error), isLoading: false });
          }
        },

        getNote: (id) => {
          return get().notes.find((n) => n.id === id);
        },

        getNoteByTitle: (title) => {
          return get().notes.find((n) => n.title === title);
        },

        getBacklinks: (noteId) => {
          const { notes } = get();
          const note = notes.find((n) => n.id === noteId);
          if (!note) return [];

          return note.backlinks
            .map((id) => notes.find((n) => n.id === id))
            .filter(Boolean) as Note[];
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: "notes-storage",
        partialize: (state) => ({
          notes: state.notes,
          currentNote: state.currentNote,
        }),
      }
    )
  )
);