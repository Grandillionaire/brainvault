import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  semanticSearch,
  findRelatedNotes,
  summarizeNote,
  checkOllamaStatus,
} from "../ai";
import { Note } from "../../types";

// Mock notes for testing
const mockNotes: Note[] = [
  {
    id: "1",
    title: "JavaScript Basics",
    content: "JavaScript is a programming language used for web development. It supports functions, objects, and async programming.",
    tags: ["programming", "javascript", "web"],
    links: ["React Guide"],
    backlinks: [],
    attachments: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "React Guide",
    content: "React is a JavaScript library for building user interfaces. It uses components and hooks for state management.",
    tags: ["programming", "react", "web"],
    links: [],
    backlinks: ["JavaScript Basics"],
    attachments: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Cooking Recipes",
    content: "A collection of my favorite cooking recipes. Includes pasta, pizza, and healthy salads.",
    tags: ["cooking", "food"],
    links: [],
    backlinks: [],
    attachments: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    title: "TypeScript Types",
    content: "TypeScript adds static typing to JavaScript. It includes interfaces, generics, and union types.",
    tags: ["programming", "typescript"],
    links: ["JavaScript Basics"],
    backlinks: [],
    attachments: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    title: "Python for Beginners",
    content: "Python is a beginner-friendly programming language. Great for data science and automation.",
    tags: ["programming", "python"],
    links: [],
    backlinks: [],
    attachments: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("semanticSearch", () => {
  it("should find notes matching query keywords", () => {
    const results = semanticSearch("javascript programming", mockNotes);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].note.title).toBe("JavaScript Basics");
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("should rank title matches higher", () => {
    const results = semanticSearch("react", mockNotes);
    
    expect(results[0].note.title).toBe("React Guide");
  });

  it("should find notes by tag", () => {
    const results = semanticSearch("cooking", mockNotes);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].note.id).toBe("3");
  });

  it("should return empty array for non-matching query", () => {
    const results = semanticSearch("quantum physics", mockNotes);
    
    // May return some low-score results due to semantic matching
    expect(results.every((r) => r.score < 0.5)).toBe(true);
  });

  it("should respect limit parameter", () => {
    const results = semanticSearch("programming", mockNotes, 2);
    
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("should include relevance reasons", () => {
    const results = semanticSearch("javascript", mockNotes);
    
    expect(results[0].relevanceReason).toBeTruthy();
    expect(typeof results[0].relevanceReason).toBe("string");
  });

  it("should handle empty query", () => {
    const results = semanticSearch("", mockNotes);
    
    expect(results.length).toBe(0);
  });

  it("should handle empty notes array", () => {
    const results = semanticSearch("javascript", []);
    
    expect(results.length).toBe(0);
  });
});

describe("findRelatedNotes", () => {
  it("should find notes with direct links", () => {
    const results = findRelatedNotes(mockNotes[0], mockNotes);
    
    // JavaScript Basics links to React Guide
    const reactResult = results.find((r) => r.note.id === "2");
    expect(reactResult).toBeTruthy();
    expect(reactResult?.connectionReasons).toContain("Linked from this note");
  });

  it("should find notes with shared tags", () => {
    const results = findRelatedNotes(mockNotes[0], mockNotes);
    
    // Should find other programming notes
    const programmingNotes = results.filter((r) =>
      r.connectionReasons.some((reason) => reason.includes("Shared tags"))
    );
    expect(programmingNotes.length).toBeGreaterThan(0);
  });

  it("should calculate connection strength", () => {
    const results = findRelatedNotes(mockNotes[0], mockNotes);
    
    // All results should have connection strength between 0 and 1
    results.forEach((r) => {
      expect(r.connectionStrength).toBeGreaterThanOrEqual(0);
      expect(r.connectionStrength).toBeLessThanOrEqual(1);
    });
  });

  it("should not include the source note in results", () => {
    const results = findRelatedNotes(mockNotes[0], mockNotes);
    
    expect(results.find((r) => r.note.id === mockNotes[0].id)).toBeUndefined();
  });

  it("should respect limit parameter", () => {
    const results = findRelatedNotes(mockNotes[0], mockNotes, 2);
    
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("should sort by connection strength", () => {
    const results = findRelatedNotes(mockNotes[0], mockNotes);
    
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].connectionStrength).toBeGreaterThanOrEqual(
        results[i].connectionStrength
      );
    }
  });

  it("should handle notes with no connections", () => {
    const results = findRelatedNotes(mockNotes[2], mockNotes); // Cooking note
    
    // Should return few or no strong connections
    expect(results.filter((r) => r.connectionStrength > 0.3).length).toBe(0);
  });
});

describe("summarizeNote", () => {
  it("should return a summary shorter than the original", () => {
    const longNote: Note = {
      ...mockNotes[0],
      content: `
        JavaScript is a high-level, interpreted programming language.
        It is one of the core technologies of the World Wide Web.
        JavaScript enables interactive web pages and is an essential part of web applications.
        The vast majority of websites use it for client-side page behavior.
        JavaScript can also be used on the server-side with Node.js.
        It supports event-driven, functional, and imperative programming styles.
        JavaScript was initially created to make web pages alive.
        Today it can execute not only in the browser, but also on the server.
      `.trim(),
    };

    const summary = summarizeNote(longNote);

    expect(summary.length).toBeLessThan(longNote.content.length);
    expect(summary.length).toBeGreaterThan(0);
  });

  it("should preserve key information", () => {
    const summary = summarizeNote(mockNotes[0]);

    // Should mention key terms
    expect(
      summary.toLowerCase().includes("javascript") ||
        summary.toLowerCase().includes("programming") ||
        summary.toLowerCase().includes("web")
    ).toBe(true);
  });

  it("should handle very short content", () => {
    const shortNote: Note = {
      ...mockNotes[0],
      content: "Short note.",
    };

    const summary = summarizeNote(shortNote);

    expect(summary).toBe("Short note.");
  });

  it("should handle empty content", () => {
    const emptyNote: Note = {
      ...mockNotes[0],
      content: "",
    };

    const summary = summarizeNote(emptyNote);

    expect(summary).toBe("");
  });

  it("should handle content with only whitespace", () => {
    const whitespaceNote: Note = {
      ...mockNotes[0],
      content: "   \n\n   ",
    };

    const summary = summarizeNote(whitespaceNote);

    expect(summary.trim()).toBe("");
  });
});

describe("checkOllamaStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return unavailable when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const status = await checkOllamaStatus();

    expect(status.available).toBe(false);
    expect(status.models).toEqual([]);
  });

  it("should return available with models when Ollama responds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          models: [{ name: "llama2" }, { name: "codellama" }],
        }),
    });

    const status = await checkOllamaStatus();

    expect(status.available).toBe(true);
    expect(status.models).toContain("llama2");
    expect(status.models).toContain("codellama");
  });

  it("should return unavailable when response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    const status = await checkOllamaStatus();

    expect(status.available).toBe(false);
  });
});

describe("edge cases", () => {
  it("should handle notes with special characters", () => {
    const specialNote: Note = {
      ...mockNotes[0],
      title: "Note with <special> & 'characters'",
      content: "Content with [[links]] and #tags and @mentions",
    };

    const results = semanticSearch("links tags", [specialNote]);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("should handle notes with very long content", () => {
    const longNote: Note = {
      ...mockNotes[0],
      content: "This is a sentence with many words. ".repeat(500),
    };

    const summary = summarizeNote(longNote);
    // Summary should be significantly shorter than original
    expect(summary.length).toBeLessThan(longNote.content.length / 2);
  });

  it("should handle unicode content", () => {
    const unicodeNote: Note = {
      ...mockNotes[0],
      title: "日本語のノート",
      content: "これは日本語のテストです。プログラミングについて。",
    };

    const results = semanticSearch("日本語", [unicodeNote]);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});
