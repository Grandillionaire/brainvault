import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Note } from "../types";
import { markdownToHtml } from "./markdown";

export interface BackupData {
  version: string;
  exportedAt: string;
  noteCount: number;
  notes: Note[];
  metadata: {
    appVersion: string;
    exportFormat: "json";
  };
}

export const exportNoteAsMarkdown = (note: Note) => {
  const content = `# ${note.title}\n\n${note.content}`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const filename = `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
  saveAs(blob, filename);
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export const exportNoteAsPDF = (note: Note) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("popup blocked");
  }

  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
        color: #333;
      }
      h1 { margin-top: 0; }
      pre { background: #f5f5f5; padding: 12px; border-radius: 4px; }
      code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    </style>
  `;

  const safeTitle = escapeHtml(note.title);
  const safeContent = note.content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeTitle}</title>
        ${styles}
      </head>
      <body>
        <h1>${safeTitle}</h1>
        <div>${safeContent}</div>
      </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * JSZip silently overwrites an entry that already exists, so two notes with the
 * same path/title would collapse into one file. Reserve each name and suffix
 * duplicates instead.
 */
const uniqueEntryName = (taken: Set<string>, folderKey: string, name: string): string => {
  const extension = name.endsWith(".md") ? ".md" : "";
  const base = extension ? name.slice(0, -extension.length) : name;

  let candidate = name;
  let counter = 1;
  while (taken.has(`${folderKey}/${candidate}`)) {
    counter++;
    candidate = `${base}-${counter}${extension}`;
  }

  taken.add(`${folderKey}/${candidate}`);
  return candidate;
};

const addNotesToZip = (root: JSZip, notes: Note[]) => {
  const folderMap = new Map<string, JSZip>();
  const takenNames = new Set<string>();

  notes.forEach((note) => {
    const content = `# ${note.title}\n\n${note.content}`;
    const safePath = note.path || `${note.title}.md`;
    const pathParts = safePath.split("/");

    if (pathParts.length > 1) {
      let currentFolder = root;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        const folderKey = pathParts.slice(0, i + 1).join("/");

        if (!folderMap.has(folderKey)) {
          currentFolder = currentFolder.folder(folderName)!;
          folderMap.set(folderKey, currentFolder);
        } else {
          currentFolder = folderMap.get(folderKey)!;
        }
      }
      const folderKey = pathParts.slice(0, -1).join("/");
      const filename = pathParts[pathParts.length - 1];
      currentFolder.file(uniqueEntryName(takenNames, folderKey, filename), content);
    } else {
      const filename = safePath.replace(/[/\\?%*:|"<>]/g, "-");
      root.file(uniqueEntryName(takenNames, "", filename), content);
    }
  });
};

/**
 * Export a note as a self-contained HTML page the user can host anywhere.
 * BrainVault runs entirely on the user's machine, so there is no service that
 * could host a note for them - the page has to be something they own.
 */
export const exportNoteAsHtmlPage = (note: Note) => {
  const safeTitle = escapeHtml(note.title);
  const page = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        max-width: 720px;
        margin: 40px auto;
        padding: 0 20px;
        color: #1a1a1a;
      }
      pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
      code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
      @media (prefers-color-scheme: dark) {
        body { background: #111; color: #eee; }
        pre, code { background: #1e1e1e; }
      }
    </style>
  </head>
  <body>
    <h1>${safeTitle}</h1>
    ${markdownToHtml(note.content || "")}
  </body>
</html>`;

  const blob = new Blob([page], { type: "text/html;charset=utf-8" });
  const filename = `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.html`;
  saveAs(blob, filename);

  return filename;
};

export const exportAllNotesAsZip = async (notes: Note[]) => {
  const zip = new JSZip();
  addNotesToZip(zip, notes);

  const blob = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().split("T")[0];
  saveAs(blob, `brainvault-export-${timestamp}.zip`);
};

/**
 * Export all notes as JSON backup with full metadata
 */
export const exportNotesAsJSON = (notes: Note[]) => {
  const backup: BackupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    noteCount: notes.length,
    notes: notes.map(note => ({
      ...note,
      // Ensure all fields are included
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      links: note.links,
      backlinks: note.backlinks,
      attachments: note.attachments,
      path: note.path,
      plainContent: note.plainContent,
      metadata: note.metadata,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
    metadata: {
      appVersion: "2.0.0",
      exportFormat: "json",
    },
  };

  const content = JSON.stringify(backup, null, 2);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const timestamp = new Date().toISOString().split("T")[0];
  saveAs(blob, `brainvault-backup-${timestamp}.json`);
};

/**
 * Export all notes as ZIP with both markdown and JSON backup
 */
export const exportFullBackup = async (notes: Note[]) => {
  const zip = new JSZip();

  // Add markdown folder
  const mdFolder = zip.folder("markdown")!;
  addNotesToZip(mdFolder, notes);

  // Add JSON backup
  const backup: BackupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    noteCount: notes.length,
    notes,
    metadata: {
      appVersion: "2.0.0",
      exportFormat: "json",
    },
  };
  zip.file("backup.json", JSON.stringify(backup, null, 2));

  // Add README
  const readme = `# BrainVault Backup

Exported: ${new Date().toISOString()}
Notes: ${notes.length}

## Contents

- \`markdown/\` - All notes as Markdown files
- \`backup.json\` - Full backup with metadata (for import)

## Restoring

To restore this backup:
1. Open BrainVault
2. Click "Import" in the sidebar
3. Choose "Backup" and select the \`backup.json\` file

Importing the \`markdown/\` folder instead ("Folder" mode) restores the note
bodies but not ids, backlinks or original timestamps.
`;
  zip.file("README.md", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().split("T")[0];
  saveAs(blob, `brainvault-full-backup-${timestamp}.zip`);
};
