import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Note } from "../types";

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

export const exportAllNotesAsZip = async (notes: Note[]) => {
  const zip = new JSZip();
  const folderMap = new Map<string, JSZip>();

  notes.forEach((note) => {
    const content = `# ${note.title}\n\n${note.content}`;
    const safePath = note.path || `${note.title}.md`;
    const pathParts = safePath.split("/");

    if (pathParts.length > 1) {
      let currentFolder = zip;
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
      currentFolder.file(pathParts[pathParts.length - 1], content);
    } else {
      zip.file(safePath.replace(/[/\\?%*:|"<>]/g, "-"), content);
    }
  });

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
  const folderMap = new Map<string, JSZip>();

  // Add markdown folder
  const mdFolder = zip.folder("markdown")!;
  
  notes.forEach((note) => {
    const content = `# ${note.title}\n\n${note.content}`;
    const safePath = note.path || `${note.title}.md`;
    const pathParts = safePath.split("/");

    if (pathParts.length > 1) {
      let currentFolder = mdFolder;
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
      currentFolder.file(pathParts[pathParts.length - 1], content);
    } else {
      mdFolder.file(safePath.replace(/[/\\?%*:|"<>]/g, "-"), content);
    }
  });

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
2. Go to Settings > Import
3. Select the \`backup.json\` file or the \`markdown/\` folder
`;
  zip.file("README.md", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().split("T")[0];
  saveAs(blob, `brainvault-full-backup-${timestamp}.zip`);
};
