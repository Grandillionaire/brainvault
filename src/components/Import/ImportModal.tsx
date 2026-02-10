/**
 * Import Modal Component
 * Allows importing notes from Markdown files, folders, and Obsidian vaults
 */

import React, { useState } from "react";
import { X, Upload, FolderOpen, FileText, AlertCircle, Check, Loader2 } from "lucide-react";
import { useNotesStore } from "../../stores/notesStore";
import { importMarkdownFiles, importFromDirectory, importObsidianVault, ImportResult } from "../../lib/import";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = "files" | "folder" | "obsidian";

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const { createNote } = useNotesStore();
  const [mode, setMode] = useState<ImportMode>("files");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleImport = async (importFn: () => Promise<ImportResult>) => {
    setImporting(true);
    setResult(null);

    try {
      const importResult = await importFn();
      setResult(importResult);

      if (importResult.notes.length > 0) {
        // Add notes to store
        for (const note of importResult.notes) {
          await createNote(note.title, note.content);
        }
        toast.success(`Imported ${importResult.notes.length} notes`);
      }
    } catch (error) {
      toast.error(`Import failed: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleImport(() => importMarkdownFiles(files));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleImport(() => importMarkdownFiles(files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const importModes = [
    {
      id: "files" as ImportMode,
      name: "Markdown Files",
      description: "Import individual .md files",
      icon: FileText,
    },
    {
      id: "folder" as ImportMode,
      name: "Folder",
      description: "Import all notes from a folder",
      icon: FolderOpen,
    },
    {
      id: "obsidian" as ImportMode,
      name: "Obsidian Vault",
      description: "Import from Obsidian with links",
      icon: Upload,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Import Notes</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Import notes from other apps or markdown files
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Import Mode Selection */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-3 gap-3">
            {importModes.map((importMode) => (
              <button
                key={importMode.id}
                onClick={() => setMode(importMode.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  mode === importMode.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <importMode.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{importMode.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Import Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {importing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Importing notes...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Result Summary */}
              <div className={cn(
                "p-4 rounded-lg border",
                result.success ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {result.success ? "Import Complete" : "Import Completed with Issues"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-medium">{result.stats.total}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Imported:</span>
                    <span className="ml-2 font-medium text-green-500">{result.stats.imported}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped:</span>
                    <span className="ml-2 font-medium text-yellow-500">{result.stats.skipped}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="ml-2 font-medium text-red-500">{result.stats.failed}</span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="font-medium text-red-500 mb-2">Errors</h4>
                  <ul className="text-sm space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i} className="text-muted-foreground">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Import More */}
              <button
                onClick={() => setResult(null)}
                className="w-full py-2 text-sm text-primary hover:underline"
              >
                Import more notes
              </button>
            </div>
          ) : (
            <>
              {mode === "files" && (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-border"
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Drop markdown files here</p>
                  <p className="text-sm text-muted-foreground mb-4">or</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".md,.markdown"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors">
                      Browse Files
                    </span>
                  </label>
                </div>
              )}

              {mode === "folder" && (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Import from a folder</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a folder containing markdown files
                  </p>
                  <button
                    onClick={() => handleImport(importFromDirectory)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Select Folder
                  </button>
                </div>
              )}

              {mode === "obsidian" && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center text-4xl">
                    💎
                  </div>
                  <p className="text-lg font-medium mb-2">Import Obsidian Vault</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Import your Obsidian vault with full support for wiki-style links,
                    tags, and frontmatter metadata
                  </p>
                  <button
                    onClick={() => handleImport(importObsidianVault)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Select Obsidian Vault
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 text-xs text-muted-foreground">
          <p>Supported formats: .md, .markdown • Preserves tags, links, and metadata</p>
        </div>
      </div>
    </div>
  );
};
