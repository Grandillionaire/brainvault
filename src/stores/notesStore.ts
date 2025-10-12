import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Note, SearchResult, SearchOptions } from "../types";
import { notesApi, searchApi } from "../lib/api";
import { extractWikiLinks, extractTags } from "../lib/utils";
import { toast } from "sonner";

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadNotes: () => Promise<void>;
  createNote: (title?: string, content?: string) => Promise<Note>;
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
            console.log('API not available, using empty state');
            set({ notes: [], isLoading: false, error: null });
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

            const updatedNote = await notesApi.update(id, updates);

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
            await notesApi.delete(id);

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