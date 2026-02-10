/**
 * Import utilities for BrainVault
 * Supports importing from Markdown files, folders, Obsidian vaults, and Notion exports
 */

import { Note } from "../types";
import { extractTags, extractWikiLinks } from "./utils";
import JSZip from "jszip";

export interface ImportResult {
  success: boolean;
  notes: Note[];
  errors: string[];
  stats: {
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  };
}

/**
 * Parse Obsidian-style [[wiki links]] and convert to our format
 */
function parseObsidianLinks(content: string): string {
  // Convert [[link|alias]] to [[link]]
  return content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "[[$1]]");
}

/**
 * Parse Obsidian frontmatter (YAML)
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }

  const [, yaml, body] = frontmatterMatch;
  const frontmatter: Record<string, any> = {};

  // Simple YAML parsing for common fields
  yaml.split("\n").forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)?$/);
    if (match) {
      const [, key, value] = match;
      if (value) {
        // Handle arrays
        if (value.startsWith("[") && value.endsWith("]")) {
          frontmatter[key] = value
            .slice(1, -1)
            .split(",")
            .map(s => s.trim().replace(/^["']|["']$/g, ""));
        } else {
          frontmatter[key] = value.replace(/^["']|["']$/g, "");
        }
      }
    }
  });

  return { frontmatter, body };
}

/**
 * Import a single markdown file
 */
export async function importMarkdownFile(file: File, basePath: string = ""): Promise<Note> {
  const content = await file.text();
  const filename = file.name.replace(/\.md$/, "");
  
  // Parse Obsidian frontmatter if present
  const { frontmatter, body } = parseFrontmatter(content);
  
  // Parse Obsidian links
  const processedContent = parseObsidianLinks(body);
  
  // Extract tags and links
  const tags = frontmatter.tags 
    ? (Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags])
    : extractTags(processedContent);
  const links = extractWikiLinks(processedContent);
  
  // Determine title from frontmatter or filename
  const title = frontmatter.title || filename;
  
  // Build path
  const path = basePath ? `${basePath}/${filename}.md` : `${filename}.md`;

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    content: processedContent,
    tags,
    links,
    backlinks: [],
    attachments: [],
    path,
    plainContent: processedContent.replace(/[#\[\]]/g, ""),
    metadata: frontmatter,
    createdAt: frontmatter.created || new Date().toISOString(),
    updatedAt: frontmatter.modified || new Date().toISOString(),
  };
}

/**
 * Import multiple markdown files from a FileList
 */
export async function importMarkdownFiles(files: FileList): Promise<ImportResult> {
  const notes: Note[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const file of Array.from(files)) {
    if (!file.name.endsWith(".md")) {
      skipped++;
      continue;
    }

    try {
      const note = await importMarkdownFile(file);
      notes.push(note);
    } catch (error) {
      errors.push(`Failed to import ${file.name}: ${error}`);
    }
  }

  return {
    success: errors.length === 0,
    notes,
    errors,
    stats: {
      total: files.length,
      imported: notes.length,
      skipped,
      failed: errors.length,
    },
  };
}

/**
 * Import from directory (uses File System Access API if available)
 */
export async function importFromDirectory(): Promise<ImportResult> {
  const notes: Note[] = [];
  const errors: string[] = [];
  let total = 0;
  let skipped = 0;

  try {
    // Check if File System Access API is available
    if ("showDirectoryPicker" in window) {
      const dirHandle = await (window as any).showDirectoryPicker();
      await processDirectory(dirHandle, "", notes, errors);
      total = notes.length + errors.length;
    } else {
      // Fallback: use input element
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            const result = await importMarkdownFiles(files);
            resolve(result);
          } else {
            resolve({
              success: false,
              notes: [],
              errors: ["No files selected"],
              stats: { total: 0, imported: 0, skipped: 0, failed: 0 },
            });
          }
        };
        
        input.click();
      });
    }
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      errors.push(`Failed to access directory: ${error}`);
    }
  }

  return {
    success: errors.length === 0,
    notes,
    errors,
    stats: {
      total,
      imported: notes.length,
      skipped,
      failed: errors.length,
    },
  };
}

async function processDirectory(
  dirHandle: any,
  basePath: string,
  notes: Note[],
  errors: string[]
): Promise<void> {
  for await (const entry of dirHandle.values()) {
    const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.kind === "directory") {
      // Skip hidden directories and common non-note folders
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      await processDirectory(entry, currentPath, notes, errors);
    } else if (entry.kind === "file" && entry.name.endsWith(".md")) {
      try {
        const file = await entry.getFile();
        const folderPath = basePath.replace(/\//g, "/");
        const note = await importMarkdownFile(file, folderPath);
        notes.push(note);
      } catch (error) {
        errors.push(`Failed to import ${currentPath}: ${error}`);
      }
    }
  }
}

/**
 * Import from Obsidian vault (special handling for Obsidian conventions)
 */
export async function importObsidianVault(): Promise<ImportResult> {
  // Obsidian vaults are just directories with .md files
  // The main difference is in parsing (frontmatter, links, etc.) which we already handle
  const result = await importFromDirectory();
  
  // Post-process to build backlinks
  const notesByTitle = new Map<string, Note>();
  result.notes.forEach(note => notesByTitle.set(note.title.toLowerCase(), note));
  
  result.notes.forEach(note => {
    note.links.forEach(linkTitle => {
      const linkedNote = notesByTitle.get(linkTitle.toLowerCase());
      if (linkedNote && !linkedNote.backlinks.includes(note.id)) {
        linkedNote.backlinks.push(note.id);
      }
    });
  });

  return result;
}

/**
 * Parse Notion-specific markdown quirks
 */
function parseNotionMarkdown(content: string, filename: string): { content: string; metadata: Record<string, any> } {
  let processedContent = content;
  const metadata: Record<string, any> = { source: "notion" };

  // Notion uses a specific format for internal links: [Page Title](Page%20Title%20abc123.md)
  processedContent = processedContent.replace(
    /\[([^\]]+)\]\([^)]+\.md\)/g,
    "[[$1]]"
  );

  // Handle Notion's callout blocks (> 💡 or > ⚠️ etc)
  processedContent = processedContent.replace(
    /^>\s*(💡|⚠️|❗|ℹ️|📌|✅|❌)\s*/gm,
    "> **Note:** "
  );

  // Handle Notion's toggle blocks (they become regular headers)
  processedContent = processedContent.replace(
    /^<details>\s*<summary>(.+)<\/summary>/gm,
    "### $1\n"
  );
  processedContent = processedContent.replace(/<\/?details>/g, "");

  // Handle Notion's database properties in the content
  const propsMatch = content.match(/^([A-Za-z ]+):\s*(.+)$/gm);
  if (propsMatch) {
    propsMatch.slice(0, 5).forEach(match => {
      const [key, value] = match.split(":").map(s => s.trim());
      if (key && value && !["http", "https"].some(p => value.startsWith(p))) {
        metadata[key.toLowerCase()] = value;
      }
    });
  }

  // Extract Notion's UUID from filename (format: "Page Name abc123def456.md")
  const uuidMatch = filename.match(/\s+([a-f0-9]{32})\./);
  if (uuidMatch) {
    metadata.notionId = uuidMatch[1];
  }

  return { content: processedContent, metadata };
}

/**
 * Import from Notion export (ZIP file)
 */
export async function importNotionExport(file: File): Promise<ImportResult> {
  const notes: Note[] = [];
  const errors: string[] = [];
  let skipped = 0;

  try {
    const zip = await JSZip.loadAsync(file);
    const markdownFiles: { path: string; file: JSZip.JSZipObject }[] = [];

    // Collect all markdown files
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && relativePath.endsWith(".md")) {
        markdownFiles.push({ path: relativePath, file: zipEntry });
      }
    });

    // Process each file
    for (const { path, file: zipEntry } of markdownFiles) {
      try {
        const content = await zipEntry.async("string");
        const filename = path.split("/").pop() || "Untitled";
        
        // Clean up Notion's filename format (remove UUID suffix)
        const cleanFilename = filename
          .replace(/\s+[a-f0-9]{32}\.md$/, ".md")
          .replace(/\.md$/, "");

        // Parse Notion-specific formatting
        const { content: processedContent, metadata: notionMeta } = parseNotionMarkdown(content, filename);

        // Parse frontmatter if present
        const { frontmatter, body } = parseFrontmatter(processedContent);

        // Combine metadata
        const metadata = { ...notionMeta, ...frontmatter };

        // Extract tags (Notion often uses "Tags" property)
        let tags: string[] = [];
        if (metadata.tags) {
          tags = Array.isArray(metadata.tags) 
            ? metadata.tags 
            : metadata.tags.split(",").map((t: string) => t.trim());
        }
        tags = [...tags, ...extractTags(body)];
        tags = [...new Set(tags)]; // Dedupe

        // Extract links
        const links = extractWikiLinks(body);

        // Determine folder path
        const pathParts = path.split("/");
        pathParts.pop(); // Remove filename
        const folderPath = pathParts.filter(p => p && !p.endsWith(".md")).join("/");

        // Handle Notion database exports (CSV-like structure in folder)
        const isDatabase = pathParts.some(p => p.includes("Database") || p.includes("Table"));
        if (isDatabase && metadata.source === "notion") {
          tags.push("notion-database");
        }

        const note: Note = {
          id: `notion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: cleanFilename,
          content: body,
          tags,
          links,
          backlinks: [],
          attachments: [],
          path: folderPath ? `${folderPath}/${cleanFilename}.md` : `${cleanFilename}.md`,
          plainContent: body.replace(/[#\[\]]/g, ""),
          metadata,
          createdAt: frontmatter.created || new Date().toISOString(),
          updatedAt: frontmatter.modified || new Date().toISOString(),
        };

        notes.push(note);
      } catch (error) {
        errors.push(`Failed to parse ${path}: ${error}`);
      }
    }

    // Build backlinks
    const notesByTitle = new Map<string, Note>();
    notes.forEach(note => notesByTitle.set(note.title.toLowerCase(), note));

    notes.forEach(note => {
      note.links.forEach(linkTitle => {
        const linkedNote = notesByTitle.get(linkTitle.toLowerCase());
        if (linkedNote && !linkedNote.backlinks.includes(note.id)) {
          linkedNote.backlinks.push(note.id);
        }
      });
    });

  } catch (error) {
    errors.push(`Failed to read ZIP file: ${error}`);
  }

  return {
    success: errors.length === 0,
    notes,
    errors,
    stats: {
      total: notes.length + errors.length,
      imported: notes.length,
      skipped,
      failed: errors.length,
    },
  };
}

/**
 * Import from Notion export (file picker)
 */
export async function importFromNotion(): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const result = await importNotionExport(file);
        resolve(result);
      } else {
        resolve({
          success: false,
          notes: [],
          errors: ["No file selected"],
          stats: { total: 0, imported: 0, skipped: 0, failed: 0 },
        });
      }
    };

    input.click();
  });
}
