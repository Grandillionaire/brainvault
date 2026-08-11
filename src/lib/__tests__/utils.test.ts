import { describe, it, expect } from "vitest";
import {
  extractWikiLinks,
  extractTags,
  slugify,
  truncate,
  getWordCount,
  getReadingTime,
  parseMarkdownFrontmatter,
} from "../utils";

describe("extractWikiLinks", () => {
  it("should extract wiki links from content", () => {
    const content = "This links to [[Note 1]] and [[Note 2]]";
    const links = extractWikiLinks(content);
    expect(links).toEqual(["Note 1", "Note 2"]);
  });

  it("should return empty array when no links", () => {
    const content = "No links here";
    const links = extractWikiLinks(content);
    expect(links).toEqual([]);
  });

  it("should handle nested brackets", () => {
    const content = "Link to [[Complex [Note]]]";
    const links = extractWikiLinks(content);
    expect(links.length).toBeGreaterThan(0);
  });
});

describe("extractTags", () => {
  it("should extract tags from content", () => {
    const content = "This has #tag1 and #tag2";
    const tags = extractTags(content);
    expect(tags).toEqual(["tag1", "tag2"]);
  });

  it("should handle duplicate tags", () => {
    const content = "This has #test and #test again";
    const tags = extractTags(content);
    expect(tags).toEqual(["test"]);
  });

  it("should return empty array when no tags", () => {
    const content = "No tags here";
    const tags = extractTags(content);
    expect(tags).toEqual([]);
  });
});

describe("slugify", () => {
  it("should convert text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Test 123!")).toBe("test-123");
    expect(slugify("Multiple   Spaces")).toBe("multiple-spaces");
  });

  it("should keep non-latin scripts instead of collapsing them to nothing", () => {
    expect(slugify("日本語のノート")).toBe("日本語のノート");
    expect(slugify("Заметка о работе")).toBe("заметка-о-работе");
    expect(slugify("Σημείωση")).toBe("σημείωση");
  });

  it("should not produce a leading or trailing dash", () => {
    expect(slugify("   ")).toBe("");
    expect(slugify("!!!")).toBe("");
    expect(slugify("- edge -")).toBe("edge");
  });
});

describe("parseMarkdownFrontmatter", () => {
  it("should parse an unquoted YAML flow sequence without throwing", () => {
    const content = "---\ntags: [work, personal]\ntitle: My Note\n---\nbody";

    const { metadata, content: body } = parseMarkdownFrontmatter(content);

    expect(metadata.tags).toEqual(["work", "personal"]);
    expect(metadata.title).toBe("My Note");
    expect(body).toBe("body");
  });

  it("should parse a quoted JSON-style sequence too", () => {
    const { metadata } = parseMarkdownFrontmatter('---\ntags: ["a", "b"]\n---\nbody');
    expect(metadata.tags).toEqual(["a", "b"]);
  });

  it("should return an empty array for an empty sequence", () => {
    const { metadata } = parseMarkdownFrontmatter("---\ntags: []\n---\nbody");
    expect(metadata.tags).toEqual([]);
  });

  it("should return the content untouched when there is no frontmatter", () => {
    const { metadata, content } = parseMarkdownFrontmatter("# Just a note");
    expect(metadata).toEqual({});
    expect(content).toBe("# Just a note");
  });
});

describe("truncate", () => {
  it("should truncate long text", () => {
    const text = "This is a very long text";
    expect(truncate(text, 10)).toBe("This is...");
  });

  it("should not truncate short text", () => {
    const text = "Short";
    expect(truncate(text, 10)).toBe("Short");
  });
});

describe("getWordCount", () => {
  it("should count words correctly", () => {
    expect(getWordCount("one two three")).toBe(3);
    expect(getWordCount("single")).toBe(1);
    expect(getWordCount("")).toBe(0);
  });
});

describe("getReadingTime", () => {
  it("should calculate reading time", () => {
    const text = "word ".repeat(200);
    expect(getReadingTime(text)).toBe(1);
  });

  it("should round up reading time", () => {
    const text = "word ".repeat(250);
    expect(getReadingTime(text)).toBe(2);
  });
});
