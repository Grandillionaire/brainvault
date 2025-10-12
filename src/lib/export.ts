import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Note } from "../types";

export const exportNoteAsMarkdown = (note: Note) => {
  const content = `# ${note.title}\n\n${note.content}`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const filename = `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
  saveAs(blob, filename);
};

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

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${note.title}</title>
        ${styles}
      </head>
      <body>
        <h1>${note.title}</h1>
        <div>${note.content.replace(/\n/g, "<br>")}</div>
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
