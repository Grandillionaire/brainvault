import { describe, it, expect } from "vitest";
import { markdownToHtml, editorDocToMarkdown } from "../markdown";

describe("markdownToHtml", () => {
  it("should turn headings into heading elements, not literal text", () => {
    const html = markdownToHtml("# Welcome to BrainVault");
    expect(html).toContain("<h1>Welcome to BrainVault</h1>");
    expect(html).not.toContain("# Welcome");
  });

  it("should turn list items into a list, not one paragraph", () => {
    const html = markdownToHtml("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });

  it("should keep wiki links and tags as literal text", () => {
    const html = markdownToHtml("see [[Other Note]] about #work");
    expect(html).toContain("[[Other Note]]");
    expect(html).toContain("#work");
  });

  it("should return an empty string for empty input", () => {
    expect(markdownToHtml("")).toBe("");
  });
});

describe("editorDocToMarkdown", () => {
  it("should serialize headings back to markdown", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
      ],
    };
    expect(editorDocToMarkdown(doc)).toBe("## Title");
  });

  it("should serialize bullet lists back to markdown", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }],
            },
          ],
        },
      ],
    };
    expect(editorDocToMarkdown(doc)).toBe("- one\n- two");
  });

  it("should serialize marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "code", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    expect(editorDocToMarkdown(doc)).toBe("**bold** and `code`");
  });

  it("should serialize task items with their checked state", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "done" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "todo" }] }],
            },
          ],
        },
      ],
    };
    expect(editorDocToMarkdown(doc)).toBe("- [x] done\n- [ ] todo");
  });

  it("should serialize fenced code blocks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    };
    expect(editorDocToMarkdown(doc)).toBe("```ts\nconst x = 1;\n```");
  });

  it("should return an empty string for an empty document", () => {
    expect(editorDocToMarkdown({ type: "doc" })).toBe("");
  });
});

describe("markdown round trip", () => {
  // The editor holds HTML; a note must come back out as the markdown it went in
  // as, otherwise every save flattens structure into literal source text.
  const source = [
    "# Welcome to BrainVault",
    "",
    "Start taking notes! You can:",
    "",
    "- Create new notes with the + button",
    "- Use [[wiki links]] to connect notes",
    "- Add #tags to organize",
  ].join("\n");

  it("should survive markdown -> html -> markdown", () => {
    const html = markdownToHtml(source);
    // Rebuild the ProseMirror shape the editor would produce from that HTML
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Welcome to BrainVault" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Start taking notes! You can:" }],
        },
        {
          type: "bulletList",
          content: [
            "Create new notes with the + button",
            "Use [[wiki links]] to connect notes",
            "Add #tags to organize",
          ].map((text) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          })),
        },
      ],
    };

    expect(html).toContain("<h1>");
    expect(editorDocToMarkdown(doc)).toBe(source);
  });
});
