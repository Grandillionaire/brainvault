/**
 * Import utilities for BrainVault
 * Supports importing from Markdown files, folders, and Obsidian vaults
 */

import { Note } from "../types";
import { extractTags, extractWikiLinks } from "./utils";

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
