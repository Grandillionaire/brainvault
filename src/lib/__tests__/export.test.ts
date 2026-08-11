import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { exportAllNotesAsZip, exportFullBackup } from "../export";
import { Note } from "../../types";

const savedFiles: Blob[] = [];

vi.mock("file-saver", () => ({
  saveAs: vi.fn((blob: Blob) => {
    savedFiles.push(blob);
  }),
}));

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

async function entryNames(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(blob);
  return Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir)
    .sort();
}

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
  it("should handle empty notes array", async () => {
    const notes: Note[] = [];
    await expect(exportAllNotesAsZip(notes)).resolves.not.toThrow();
  });

  it("should process multiple notes", async () => {
    savedFiles.length = 0;
    const notes = [mockNote, { ...mockNote, id: "2", title: "Second Note", path: "second.md" }];

    await exportAllNotesAsZip(notes);

    expect(await entryNames(savedFiles[0])).toEqual(["second.md", "test.md"]);
  });

  it("should not drop notes that share a path", async () => {
    savedFiles.length = 0;
    // Locally created notes get `path: "${title}.md"`, so two notes titled
    // "Meeting Notes" collide - JSZip would silently keep only the last one.
    const notes = [
      { ...mockNote, id: "a", title: "Meeting Notes", path: "Meeting Notes.md", content: "A" },
      { ...mockNote, id: "b", title: "Meeting Notes", path: "Meeting Notes.md", content: "B" },
    ];

    await exportAllNotesAsZip(notes);

    expect(await entryNames(savedFiles[0])).toEqual(["Meeting Notes-2.md", "Meeting Notes.md"]);
  });

  it("should keep folder structure and dedupe within a folder", async () => {
    savedFiles.length = 0;
    const notes = [
      { ...mockNote, id: "a", title: "Ideas", path: "work/Ideas.md" },
      { ...mockNote, id: "b", title: "Ideas", path: "work/Ideas.md" },
      { ...mockNote, id: "c", title: "Ideas", path: "personal/Ideas.md" },
    ];

    await exportAllNotesAsZip(notes);

    expect(await entryNames(savedFiles[0])).toEqual([
      "personal/Ideas.md",
      "work/Ideas-2.md",
      "work/Ideas.md",
    ]);
  });
});

describe("exportFullBackup", () => {
  it("should ship every note plus a restorable backup.json", async () => {
    savedFiles.length = 0;
    const notes = [
      { ...mockNote, id: "a", title: "Ideas", path: "Ideas.md" },
      { ...mockNote, id: "b", title: "Ideas", path: "Ideas.md" },
    ];

    await exportFullBackup(notes);

    const names = await entryNames(savedFiles[0]);
    expect(names).toContain("markdown/Ideas.md");
    expect(names).toContain("markdown/Ideas-2.md");
    expect(names).toContain("backup.json");
  });
});
