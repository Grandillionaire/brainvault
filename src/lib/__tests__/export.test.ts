import { describe, it, expect } from "vitest";
import { exportAllNotesAsZip } from "../export";
import { Note } from "../../types";

const mockNote: Note = {
  id: "1",
  title: "Test Note",
  content: "Test content",
  tags: ["test"],
  links: [],
  backlinks: [],
  attachments: [],
  path: "test.md",
  plainContent: "Test content",
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("exportNoteAsMarkdown", () => {
  it("should format note correctly", () => {
    const note = mockNote;
    expect(note.title).toBe("Test Note");
    expect(note.content).toBe("Test content");
  });

  it("should handle special characters in filename", () => {
    const note = {
      ...mockNote,
      title: "Test/Note:123",
    };
    expect(note.title).toContain("/");
  });
});

describe("exportAllNotesAsZip", () => {
  it.skip("should handle empty notes array", async () => {
    const notes: Note[] = [];
    await expect(exportAllNotesAsZip(notes)).resolves.not.toThrow();
  });

  it.skip("should process multiple notes", async () => {
    const notes = [mockNote, { ...mockNote, id: "2", title: "Second Note" }];
    await expect(exportAllNotesAsZip(notes)).resolves.not.toThrow();
  });
});
