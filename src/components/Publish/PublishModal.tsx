/**
 * Publish Modal Component
 *
 * BrainVault is local-first: there is no BrainVault server that could host a
 * note, so "publish" exports a self-contained HTML page the user hosts
 * themselves. It deliberately does not show a share URL or view counts - a
 * link this app cannot serve would 404 for whoever the user sends it to.
 */

import React, { useState, useMemo } from "react";
import { X, Globe, Check, Eye, FileDown } from "lucide-react";
import { Note } from "../../types";
import { useNotesStore } from "../../stores/notesStore";
import { exportNoteAsHtmlPage } from "../../lib/export";
import { slugify } from "../../lib/utils";
import { toast } from "sonner";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

interface PublishedNote {
  noteId: string;
  slug: string;
  publishedAt: string;
  filename: string;
}

// Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return slugify(title).substring(0, 50);
}

// Which notes have been exported as a page, so the UI can show it
const getPublishedNotes = (): PublishedNote[] => {
  const stored = localStorage.getItem("brainvault_published");
  return stored ? JSON.parse(stored) : [];
};

const savePublishedNote = (published: PublishedNote): void => {
  const notes = getPublishedNotes();
  const existingIndex = notes.findIndex((n) => n.noteId === published.noteId);
  if (existingIndex >= 0) {
    notes[existingIndex] = published;
  } else {
    notes.push(published);
  }
  localStorage.setItem("brainvault_published", JSON.stringify(notes));
};

const unpublishNote = (noteId: string): void => {
  const notes = getPublishedNotes().filter((n) => n.noteId !== noteId);
  localStorage.setItem("brainvault_published", JSON.stringify(notes));
};

export const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, note }) => {
  const { updateNote } = useNotesStore();
  const [exported, setExported] = useState(false);

  const publishedNote = useMemo(() => {
    if (!note) return null;
    return getPublishedNotes().find((p) => p.noteId === note.id);
  }, [note]);

  const isPublished = !!publishedNote;

  if (!isOpen || !note) return null;

  const handlePublish = async () => {
    const filename = exportNoteAsHtmlPage(note);

    const published: PublishedNote = {
      noteId: note.id,
      slug: generateSlug(note.title),
      publishedAt: new Date().toISOString(),
      filename,
    };

    savePublishedNote(published);

    // Update note metadata
    await updateNote(note.id, {
      metadata: {
        ...note.metadata,
        published: true,
        publishedAt: published.publishedAt,
        publishSlug: published.slug,
      },
    });

    setExported(true);
    setTimeout(() => setExported(false), 2000);
    toast.success(`Saved ${filename}`);
  };

  const handleUnpublish = async () => {
    unpublishNote(note.id);

    await updateNote(note.id, {
      metadata: {
        ...note.metadata,
        published: false,
        publishedAt: undefined,
        publishSlug: undefined,
      },
    });

    toast.success("Note unpublished");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Publish to Web</h2>
              <p className="text-sm text-muted-foreground">
                Save this note as a standalone page you can host
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Note Preview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-background rounded-md">
                <Eye className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{note.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {note.content?.replace(/[#\[\]*_~`]/g, "").substring(0, 120)}...
                </p>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Where the page goes */}
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            BrainVault has no server of its own, so publishing writes a
            self-contained <code>.html</code> file to your downloads. Put it on
            any static host (GitHub Pages, Netlify, your own server) to share it.
          </div>

          {/* Last export (if published) */}
          {isPublished && publishedNote && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-sm font-medium truncate">{publishedNote.filename}</p>
                <p className="text-xs text-muted-foreground">File</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-sm font-medium">
                  {new Date(publishedNote.publishedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">Last exported</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          {isPublished ? (
            <>
              <button
                onClick={handleUnpublish}
                className="px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
              >
                Unpublish
              </button>
              <button
                onClick={handlePublish}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {exported ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                {exported ? "Saved" : "Export again"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm hover:bg-accent rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export page
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
