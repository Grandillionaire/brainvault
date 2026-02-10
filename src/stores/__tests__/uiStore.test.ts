import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../uiStore";
import { Note } from "../../types";

const mockNote: Note = {
  id: "test-note-1",
  title: "Test Note",
  content: "Test content",
  tags: ["test"],
  links: [],
  backlinks: [],
  attachments: [],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("uiStore", () => {
  beforeEach(() => {
    // Reset store to default state
    useUIStore.setState({
      viewMode: "split",
      sidebarOpen: true,
      commandPaletteOpen: false,
      settingsOpen: false,
      shortcutsOpen: false,
      aiChatOpen: false,
      graphViewOpen: false,
      canvasViewOpen: false,
      focusMode: false,
      searchQuery: "",
      selectedTags: [],
      recentNotes: [],
      pinnedNotes: [],
      openTabs: [],
      activeTabId: null,
      editorSplitRatio: 50,
      previewScrollSync: true,
    });
  });

  describe("view mode", () => {
    it("should have default split view mode", () => {
      const { viewMode } = useUIStore.getState();
      expect(viewMode).toBe("split");
    });

    it("should change view mode", () => {
      const { setViewMode } = useUIStore.getState();
      
      setViewMode("editor");
      expect(useUIStore.getState().viewMode).toBe("editor");
      
      setViewMode("preview");
      expect(useUIStore.getState().viewMode).toBe("preview");
    });
  });

  describe("sidebar", () => {
    it("should have sidebar open by default", () => {
      const { sidebarOpen } = useUIStore.getState();
      expect(sidebarOpen).toBe(true);
    });

    it("should toggle sidebar", () => {
      const { toggleSidebar } = useUIStore.getState();
      
      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe("command palette", () => {
    it("should be closed by default", () => {
      const { commandPaletteOpen } = useUIStore.getState();
      expect(commandPaletteOpen).toBe(false);
    });

    it("should open command palette", () => {
      const { openCommandPalette } = useUIStore.getState();
      
      openCommandPalette();
      
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    });

    it("should close command palette", () => {
      useUIStore.setState({ commandPaletteOpen: true });
      
      const { closeCommandPalette } = useUIStore.getState();
      closeCommandPalette();
      
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    });
  });

  describe("settings", () => {
    it("should be closed by default", () => {
      const { settingsOpen } = useUIStore.getState();
      expect(settingsOpen).toBe(false);
    });

    it("should open and close settings", () => {
      const { openSettings, closeSettings } = useUIStore.getState();
      
      openSettings();
      expect(useUIStore.getState().settingsOpen).toBe(true);
      
      closeSettings();
      expect(useUIStore.getState().settingsOpen).toBe(false);
    });
  });

  describe("AI chat", () => {
    it("should be closed by default", () => {
      const { aiChatOpen } = useUIStore.getState();
      expect(aiChatOpen).toBe(false);
    });

    it("should open and close AI chat", () => {
      const { openAIChat, closeAIChat } = useUIStore.getState();
      
      openAIChat();
      expect(useUIStore.getState().aiChatOpen).toBe(true);
      
      closeAIChat();
      expect(useUIStore.getState().aiChatOpen).toBe(false);
    });
  });

  describe("graph view", () => {
    it("should be closed by default", () => {
      const { graphViewOpen } = useUIStore.getState();
      expect(graphViewOpen).toBe(false);
    });

    it("should open graph view and set view mode", () => {
      const { openGraphView } = useUIStore.getState();
      
      openGraphView();
      
      const state = useUIStore.getState();
      expect(state.graphViewOpen).toBe(true);
      expect(state.viewMode).toBe("graph");
    });

    it("should close graph view and reset view mode", () => {
      useUIStore.setState({ graphViewOpen: true, viewMode: "graph" });
      
      const { closeGraphView } = useUIStore.getState();
      closeGraphView();
      
      const state = useUIStore.getState();
      expect(state.graphViewOpen).toBe(false);
      expect(state.viewMode).toBe("split");
    });
  });

  describe("focus mode", () => {
    it("should be off by default", () => {
      const { focusMode } = useUIStore.getState();
      expect(focusMode).toBe(false);
    });

    it("should toggle focus mode", () => {
      const { toggleFocusMode } = useUIStore.getState();
      
      toggleFocusMode();
      expect(useUIStore.getState().focusMode).toBe(true);
      
      toggleFocusMode();
      expect(useUIStore.getState().focusMode).toBe(false);
    });
  });

  describe("search", () => {
    it("should have empty search query by default", () => {
      const { searchQuery } = useUIStore.getState();
      expect(searchQuery).toBe("");
    });

    it("should set search query", () => {
      const { setSearchQuery } = useUIStore.getState();
      
      setSearchQuery("test query");
      
      expect(useUIStore.getState().searchQuery).toBe("test query");
    });
  });

  describe("tags", () => {
    it("should have no selected tags by default", () => {
      const { selectedTags } = useUIStore.getState();
      expect(selectedTags).toEqual([]);
    });

    it("should toggle tag selection", () => {
      const { toggleTag } = useUIStore.getState();
      
      toggleTag("react");
      expect(useUIStore.getState().selectedTags).toContain("react");
      
      toggleTag("typescript");
      expect(useUIStore.getState().selectedTags).toContain("react");
      expect(useUIStore.getState().selectedTags).toContain("typescript");
      
      toggleTag("react");
      expect(useUIStore.getState().selectedTags).not.toContain("react");
      expect(useUIStore.getState().selectedTags).toContain("typescript");
    });
  });

  describe("recent notes", () => {
    it("should have empty recent notes by default", () => {
      const { recentNotes } = useUIStore.getState();
      expect(recentNotes).toEqual([]);
    });

    it("should add note to recent notes", () => {
      const { addRecentNote } = useUIStore.getState();
      
      addRecentNote(mockNote);
      
      const { recentNotes } = useUIStore.getState();
      expect(recentNotes.length).toBe(1);
      expect(recentNotes[0].id).toBe(mockNote.id);
    });

    it("should not duplicate recent notes", () => {
      const { addRecentNote } = useUIStore.getState();
      
      addRecentNote(mockNote);
      addRecentNote(mockNote);
      
      const { recentNotes } = useUIStore.getState();
      expect(recentNotes.length).toBe(1);
    });

    it("should limit recent notes to 10", () => {
      const { addRecentNote } = useUIStore.getState();
      
      for (let i = 0; i < 15; i++) {
        addRecentNote({ ...mockNote, id: `note-${i}`, title: `Note ${i}` });
      }
      
      const { recentNotes } = useUIStore.getState();
      expect(recentNotes.length).toBe(10);
    });

    it("should move re-visited notes to front", () => {
      const { addRecentNote } = useUIStore.getState();
      
      const note1 = { ...mockNote, id: "1", title: "First" };
      const note2 = { ...mockNote, id: "2", title: "Second" };
      
      addRecentNote(note1);
      addRecentNote(note2);
      addRecentNote(note1); // Re-visit first note
      
      const { recentNotes } = useUIStore.getState();
      expect(recentNotes[0].id).toBe("1");
    });
  });

  describe("pinned notes", () => {
    it("should have no pinned notes by default", () => {
      const { pinnedNotes } = useUIStore.getState();
      expect(pinnedNotes).toEqual([]);
    });

    it("should toggle pin note", () => {
      const { togglePinNote } = useUIStore.getState();
      
      togglePinNote(mockNote);
      expect(useUIStore.getState().pinnedNotes).toContainEqual(mockNote);
      
      togglePinNote(mockNote);
      expect(useUIStore.getState().pinnedNotes).not.toContainEqual(mockNote);
    });
  });

  describe("tabs", () => {
    it("should have no open tabs by default", () => {
      const { openTabs, activeTabId } = useUIStore.getState();
      expect(openTabs).toEqual([]);
      expect(activeTabId).toBeNull();
    });

    it("should open a tab", () => {
      const { openTab } = useUIStore.getState();
      
      openTab(mockNote);
      
      const { openTabs, activeTabId } = useUIStore.getState();
      expect(openTabs.length).toBe(1);
      expect(openTabs[0].id).toBe(mockNote.id);
      expect(activeTabId).toBe(mockNote.id);
    });

    it("should not duplicate tabs", () => {
      const { openTab } = useUIStore.getState();
      
      openTab(mockNote);
      openTab(mockNote);
      
      const { openTabs } = useUIStore.getState();
      expect(openTabs.length).toBe(1);
    });

    it("should close a tab", () => {
      const { openTab, closeTab } = useUIStore.getState();
      
      openTab(mockNote);
      closeTab(mockNote.id);
      
      const { openTabs, activeTabId } = useUIStore.getState();
      expect(openTabs.length).toBe(0);
      expect(activeTabId).toBeNull();
    });

    it("should set active tab to last remaining tab on close", () => {
      const note2 = { ...mockNote, id: "note-2", title: "Note 2" };
      const { openTab, closeTab } = useUIStore.getState();
      
      openTab(mockNote);
      openTab(note2);
      closeTab(note2.id);
      
      const { activeTabId } = useUIStore.getState();
      expect(activeTabId).toBe(mockNote.id);
    });

    it("should set active tab", () => {
      const note2 = { ...mockNote, id: "note-2", title: "Note 2" };
      const { openTab, setActiveTab } = useUIStore.getState();
      
      openTab(mockNote);
      openTab(note2);
      setActiveTab(mockNote.id);
      
      const { activeTabId } = useUIStore.getState();
      expect(activeTabId).toBe(mockNote.id);
    });
  });

  describe("editor", () => {
    it("should have default split ratio of 50", () => {
      const { editorSplitRatio } = useUIStore.getState();
      expect(editorSplitRatio).toBe(50);
    });

    it("should set editor split ratio", () => {
      const { setEditorSplitRatio } = useUIStore.getState();
      
      setEditorSplitRatio(70);
      
      expect(useUIStore.getState().editorSplitRatio).toBe(70);
    });

    it("should clamp split ratio between 0 and 100", () => {
      const { setEditorSplitRatio } = useUIStore.getState();
      
      setEditorSplitRatio(150);
      expect(useUIStore.getState().editorSplitRatio).toBe(100);
      
      setEditorSplitRatio(-20);
      expect(useUIStore.getState().editorSplitRatio).toBe(0);
    });

    it("should have preview scroll sync enabled by default", () => {
      const { previewScrollSync } = useUIStore.getState();
      expect(previewScrollSync).toBe(true);
    });

    it("should toggle preview scroll sync", () => {
      const { togglePreviewScrollSync } = useUIStore.getState();
      
      togglePreviewScrollSync();
      expect(useUIStore.getState().previewScrollSync).toBe(false);
      
      togglePreviewScrollSync();
      expect(useUIStore.getState().previewScrollSync).toBe(true);
    });
  });
});
