import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotesStore } from "../notesStore";
import { Note } from "../../types";

// Mock the API
vi.mock("../../lib/api", () => ({
  notesApi: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation((data) => ({
      id: `mock-${Date.now()}`,
      ...data,
      links: [],
      backlinks: [],
      attachments: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    update: vi.fn().mockImplementation((id, updates) => ({
      id,
      title: "Updated Note",
      content: "",
      tags: [],
      links: [],
      backlinks: [],
      attachments: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates,
    })),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  searchApi: {
    search: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("notesStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useNotesStore.setState({
      notes: [],
      currentNote: null,
      searchResults: [],
      isLoading: false,
      error: null,
    });
  });

  describe("initial state", () => {
    it("should have empty notes array", () => {
      const { notes } = useNotesStore.getState();
      expect(notes).toEqual([]);
    });

    it("should have null currentNote", () => {
      const { currentNote } = useNotesStore.getState();
      expect(currentNote).toBeNull();
    });

    it("should not be loading", () => {
      const { isLoading } = useNotesStore.getState();
      expect(isLoading).toBe(false);
    });

    it("should have no error", () => {
      const { error } = useNotesStore.getState();
      expect(error).toBeNull();
    });
  });

  describe("createNote", () => {
    it("should create a note with default title", async () => {
      const { createNote } = useNotesStore.getState();

      const note = await createNote();

      expect(note.title).toBe("Untitled");
      expect(note.content).toBe("");
    });

    it("should create a note with provided title and content", async () => {
      const { createNote } = useNotesStore.getState();

      const note = await createNote("My Note", "My Content");

      expect(note.title).toBe("My Note");
      expect(note.content).toBe("My Content");
    });

    it("should add note to notes array", async () => {
      const { createNote } = useNotesStore.getState();

      await createNote("Test Note");

      const { notes } = useNotesStore.getState();
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe("Test Note");
    });

    it("should set created note as current note", async () => {
      const { createNote } = useNotesStore.getState();

      const note = await createNote("New Note");

      const { currentNote } = useNotesStore.getState();
      expect(currentNote?.id).toBe(note.id);
    });

    it("should extract tags from content", async () => {
      const { createNote } = useNotesStore.getState();

      const note = await createNote("Tagged Note", "This has #tag1 and #tag2");

      expect(note.tags).toContain("tag1");
      expect(note.tags).toContain("tag2");
    });
  });

  describe("setCurrentNote", () => {
    it("should set the current note", () => {
      const mockNote: Note = {
        id: "test-1",
        title: "Test",
        content: "",
        tags: [],
        links: [],
        backlinks: [],
        attachments: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { setCurrentNote } = useNotesStore.getState();
      setCurrentNote(mockNote);

      const { currentNote } = useNotesStore.getState();
      expect(currentNote?.id).toBe("test-1");
    });

    it("should allow setting current note to null", () => {
      const mockNote: Note = {
        id: "test-1",
        title: "Test",
        content: "",
        tags: [],
        links: [],
        backlinks: [],
        attachments: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { setCurrentNote } = useNotesStore.getState();
      setCurrentNote(mockNote);
      setCurrentNote(null);

      const { currentNote } = useNotesStore.getState();
      expect(currentNote).toBeNull();
    });
  });

  describe("getNote", () => {
    it("should return note by id", async () => {
      const { createNote, getNote } = useNotesStore.getState();

      const note = await createNote("Find Me");

      const foundNote = getNote(note.id);
      expect(foundNote?.title).toBe("Find Me");
    });

    it("should return undefined for non-existent id", () => {
      const { getNote } = useNotesStore.getState();

      const foundNote = getNote("non-existent");
      expect(foundNote).toBeUndefined();
    });
  });

  describe("getNoteByTitle", () => {
    it("should return note by title", async () => {
      const { createNote, getNoteByTitle } = useNotesStore.getState();

      await createNote("Unique Title");

      const foundNote = getNoteByTitle("Unique Title");
      expect(foundNote?.title).toBe("Unique Title");
    });

    it("should return undefined for non-existent title", () => {
      const { getNoteByTitle } = useNotesStore.getState();

      const foundNote = getNoteByTitle("Non Existent");
      expect(foundNote).toBeUndefined();
    });
  });

  describe("getBacklinks", () => {
    it("should return backlinks for a note", () => {
      const note1: Note = {
        id: "1",
        title: "Note 1",
        content: "",
        tags: [],
        links: [],
        backlinks: ["2"],
        attachments: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const note2: Note = {
        id: "2",
        title: "Note 2",
        content: "",
        tags: [],
        links: ["Note 1"],
        backlinks: [],
        attachments: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note1, note2] });

      const { getBacklinks } = useNotesStore.getState();
      const backlinks = getBacklinks("1");

      expect(backlinks.length).toBe(1);
      expect(backlinks[0].id).toBe("2");
    });

    it("should return empty array for note with no backlinks", () => {
      const note: Note = {
        id: "1",
        title: "Orphan Note",
        content: "",
        tags: [],
        links: [],
        backlinks: [],
        attachments: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });

      const { getBacklinks } = useNotesStore.getState();
      const backlinks = getBacklinks("1");

      expect(backlinks).toEqual([]);
    });
  });

  describe("clearError", () => {
    it("should clear the error state", () => {
      useNotesStore.setState({ error: "Some error" });

      const { clearError } = useNotesStore.getState();
      clearError();

      const { error } = useNotesStore.getState();
      expect(error).toBeNull();
    });
  });

  describe("multiple notes", () => {
    it("should handle multiple notes correctly", async () => {
      const { createNote } = useNotesStore.getState();

      await createNote("Note 1");
      await createNote("Note 2");
      await createNote("Note 3");

      const { notes } = useNotesStore.getState();
      expect(notes.length).toBe(3);
    });

    it("should maintain note order", async () => {
      const { createNote } = useNotesStore.getState();

      await createNote("First");
      await createNote("Second");
      await createNote("Third");

      const { notes } = useNotesStore.getState();
      expect(notes[0].title).toBe("First");
      expect(notes[1].title).toBe("Second");
      expect(notes[2].title).toBe("Third");
    });
  });
});

describe("notesStore persistence", () => {
  it("should have persistence configuration", () => {
    // Check that the store is configured with persist middleware
    const store = useNotesStore;
    expect(store.persist).toBeDefined();
  });
});
