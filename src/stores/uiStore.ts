import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { ViewMode, Note } from "../types";

interface UIState {
  // View state
  viewMode: ViewMode;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  aiChatOpen: boolean;
  graphViewOpen: boolean;
  canvasViewOpen: boolean;
  focusMode: boolean;

  // Search state
  searchQuery: string;
  selectedTags: string[];

  // Notes state
  recentNotes: Note[];
  pinnedNotes: Note[];
  openTabs: Note[];
  activeTabId: string | null;

  // Editor state
  editorSplitRatio: number;
  previewScrollSync: boolean;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openAIChat: () => void;
  closeAIChat: () => void;
  openGraphView: () => void;
  closeGraphView: () => void;
  openCanvasView: () => void;
  closeCanvasView: () => void;
  toggleFocusMode: () => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  addRecentNote: (note: Note) => void;
  togglePinNote: (note: Note) => void;
  openTab: (note: Note) => void;
  closeTab: (noteId: string) => void;
  setActiveTab: (noteId: string) => void;
  setEditorSplitRatio: (ratio: number) => void;
  togglePreviewScrollSync: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // View state
        viewMode: "split",
        sidebarOpen: true,
        commandPaletteOpen: false,
        settingsOpen: false,
        aiChatOpen: false,
        graphViewOpen: false,
        canvasViewOpen: false,
        focusMode: false,

        // Search state
        searchQuery: "",
        selectedTags: [],

        // Notes state
        recentNotes: [],
        pinnedNotes: [],
        openTabs: [],
        activeTabId: null,

        // Editor state
        editorSplitRatio: 50,
        previewScrollSync: true,

        // Actions
        setViewMode: (mode) => {
          set({ viewMode: mode });
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }));
        },

        openCommandPalette: () => {
          set({ commandPaletteOpen: true });
        },

        closeCommandPalette: () => {
          set({ commandPaletteOpen: false });
        },

        openSettings: () => {
          set({ settingsOpen: true });
        },

        closeSettings: () => {
          set({ settingsOpen: false });
        },

        openAIChat: () => {
          set({ aiChatOpen: true });
        },

        closeAIChat: () => {
          set({ aiChatOpen: false });
        },

        openGraphView: () => {
          set({ graphViewOpen: true, viewMode: "graph" });
        },

        closeGraphView: () => {
          set({ graphViewOpen: false, viewMode: "split" });
        },

        openCanvasView: () => {
          set({ canvasViewOpen: true, viewMode: "canvas" });
        },

        closeCanvasView: () => {
          set({ canvasViewOpen: false, viewMode: "split" });
        },

        toggleFocusMode: () => {
          set((state) => ({ focusMode: !state.focusMode }));
        },

        setSearchQuery: (query) => {
          set({ searchQuery: query });
        },

        toggleTag: (tag) => {
          set((state) => {
            const tags = state.selectedTags.includes(tag)
              ? state.selectedTags.filter((t) => t !== tag)
              : [...state.selectedTags, tag];
            return { selectedTags: tags };
          });
        },

        addRecentNote: (note) => {
          set((state) => {
            const recent = [
              note,
              ...state.recentNotes.filter((n) => n.id !== note.id),
            ].slice(0, 10);
            return { recentNotes: recent };
          });
        },

        togglePinNote: (note) => {
          set((state) => {
            const isPinned = state.pinnedNotes.some((n) => n.id === note.id);
            const pinned = isPinned
              ? state.pinnedNotes.filter((n) => n.id !== note.id)
              : [...state.pinnedNotes, note];
            return { pinnedNotes: pinned };
          });
        },

        openTab: (note) => {
          set((state) => {
            const exists = state.openTabs.some((t) => t.id === note.id);
            if (exists) {
              return { activeTabId: note.id };
            }
            return {
              openTabs: [...state.openTabs, note],
              activeTabId: note.id,
            };
          });
        },

        closeTab: (noteId) => {
          set((state) => {
            const tabs = state.openTabs.filter((t) => t.id !== noteId);
            const activeTabId =
              state.activeTabId === noteId
                ? tabs.length > 0
                  ? tabs[tabs.length - 1].id
                  : null
                : state.activeTabId;
            return { openTabs: tabs, activeTabId };
          });
        },

        setActiveTab: (noteId) => {
          set({ activeTabId: noteId });
        },

        setEditorSplitRatio: (ratio) => {
          set({ editorSplitRatio: Math.min(100, Math.max(0, ratio)) });
        },

        togglePreviewScrollSync: () => {
          set((state) => ({ previewScrollSync: !state.previewScrollSync }));
        },
      }),
      {
        name: "ui-storage",
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          viewMode: state.viewMode,
          pinnedNotes: state.pinnedNotes,
          editorSplitRatio: state.editorSplitRatio,
          previewScrollSync: state.previewScrollSync,
        }),
      }
    )
  )
);