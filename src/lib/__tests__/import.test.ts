import { describe, it, expect } from "vitest";
import { importBackupFile } from "../import";

// jsdom's File does not implement .text(), so stand in for it
function textFile(contents: string): File {
  return { name: "backup.json", text: async () => contents } as unknown as File;
}

function jsonFile(data: unknown): File {
  return textFile(JSON.stringify(data));
}

describe("importBackupFile", () => {
  // The archive written by exportFullBackup tells the user to restore from
  // backup.json, so that path has to exist and round-trip the metadata.
  const backup = {
    version: "1.0",
    exportedAt: "2026-01-01T00:00:00.000Z",
    noteCount: 1,
    notes: [
      {
        id: "note-1",
        title: "Tax records",
        content: "see [[Invoices]] #finance",
        tags: ["finance"],
        links: ["Invoices"],
        backlinks: ["note-2"],
        attachments: [],
        path: "money/Tax records.md",
        plainContent: "see Invoices finance",
        metadata: { source: "obsidian" },
        createdAt: "2019-05-06T00:00:00.000Z",
        updatedAt: "2021-08-09T00:00:00.000Z",
      },
    ],
    metadata: { appVersion: "2.0.0", exportFormat: "json" },
  };

  it("should restore every field of a backup note", async () => {
    const result = await importBackupFile(jsonFile(backup));

    expect(result.success).toBe(true);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject(backup.notes[0]);
  });

  it("should accept a bare array of notes", async () => {
    const result = await importBackupFile(jsonFile(backup.notes));

    expect(result.success).toBe(true);
    expect(result.notes[0].id).toBe("note-1");
  });

  it("should report a file that is not a backup instead of throwing", async () => {
    const result = await importBackupFile(jsonFile({ hello: "world" }));

    expect(result.success).toBe(false);
    expect(result.notes).toEqual([]);
    expect(result.errors[0]).toContain("notes");
  });

  it("should report malformed json instead of throwing", async () => {
    const result = await importBackupFile(textFile("{not json"));

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("should skip entries without a title and count them", async () => {
    const result = await importBackupFile(jsonFile({ notes: [{ content: "orphan" }] }));

    expect(result.notes).toEqual([]);
    expect(result.errors[0]).toContain("skipped");
  });
});
