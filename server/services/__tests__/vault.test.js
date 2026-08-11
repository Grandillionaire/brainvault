// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import {
  initVault,
  saveNoteToFile,
  loadNoteFromFile,
  saveAttachment,
  slugify,
  isInsideDir,
} from "../vault.js";

let vaultPath;

beforeEach(() => {
  vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), "brainvault-test-"));
  process.env.VAULT_PATH = vaultPath;
  initVault();
});

afterEach(() => {
  fs.rmSync(vaultPath, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
});

const note = (id, title, content = "") => ({
  id,
  title,
  content,
  tags: [],
  links: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("slugify", () => {
  it("keeps non-latin scripts instead of producing an empty filename", () => {
    expect(slugify("日本語のノート")).toBe("日本語のノート");
    expect(slugify("Заметка о работе")).toBe("заметка-о-работе");
    expect(slugify("Σημείωση")).toBe("σημείωση");
  });

  it("returns an empty string for input with no letters or digits", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("saveNoteToFile", () => {
  it("does not let two notes with the same slug overwrite each other", () => {
    const a = note("aaa", "Q4 Report", "note A's financials");
    const b = note("bbb", "Q4  Report!", "note B");

    a.path = saveNoteToFile(a);
    b.path = saveNoteToFile(b);

    expect(path.resolve(a.path)).not.toBe(path.resolve(b.path));
    expect(path.basename(a.path)).toBe("q4-report.md");
    expect(path.basename(b.path)).toBe("q4-report-2.md");
    expect(loadNoteFromFile(a.path).content.trim()).toBe("note A's financials");
  });

  it("gives non-latin titles their own file", () => {
    const jp = note("jp", "日本語のノート", "jp");
    const ru = note("ru", "Заметка", "ru");

    jp.path = saveNoteToFile(jp);
    ru.path = saveNoteToFile(ru);

    expect(path.basename(jp.path)).toBe("日本語のノート.md");
    expect(path.basename(ru.path)).toBe("заметка.md");
    expect(loadNoteFromFile(jp.path).content.trim()).toBe("jp");
    expect(loadNoteFromFile(ru.path).content.trim()).toBe("ru");
  });

  it("falls back to a usable name when the title has no slug characters", () => {
    const n = note("p1", "!!!", "punctuation only");
    n.path = saveNoteToFile(n);
    expect(path.basename(n.path)).toBe("untitled.md");
  });

  it("rewrites the same file when a note is saved repeatedly", () => {
    const n = note("same", "Journal", "v1");
    n.path = saveNoteToFile(n);
    n.content = "v2";
    const second = saveNoteToFile(n);

    expect(path.resolve(second)).toBe(path.resolve(n.path));
    expect(fs.readdirSync(path.join(vaultPath, "notes"))).toHaveLength(1);
  });

  it("removes the old file when a note is renamed", () => {
    const n = note("d1", "Draft", "body");
    n.path = saveNoteToFile(n);
    n.title = "Final";
    n.path = saveNoteToFile(n);

    expect(fs.readdirSync(path.join(vaultPath, "notes"))).toEqual(["final.md"]);
  });
});

describe("saveAttachment", () => {
  const file = { originalname: "evil.sh", buffer: Buffer.from("pwn"), mimetype: "text/plain", size: 3 };

  it("rejects a note id that escapes the vault", () => {
    expect(() => saveAttachment(file, "../../../../../../../../tmp/brainvault-pwned")).toThrow(
      /Invalid note id/
    );
    expect(fs.existsSync("/tmp/brainvault-pwned")).toBe(false);
  });

  it("stores a legitimate attachment inside the vault", () => {
    const saved = saveAttachment(
      { ...file, originalname: "notes.pdf" },
      "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
    );

    expect(isInsideDir(path.join(vaultPath, "attachments"), saved.path)).toBe(true);
    expect(fs.existsSync(saved.path)).toBe(true);
  });
});
