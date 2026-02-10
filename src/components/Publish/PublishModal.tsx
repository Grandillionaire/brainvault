/**
 * Publish Modal Component
 * Generate shareable links for notes and manage published content
 */

import React, { useState, useMemo } from "react";
import { X, Globe, Copy, Check, ExternalLink, Eye, Lock, Link2 } from "lucide-react";
import { Note } from "../../types";
import { useNotesStore } from "../../stores/notesStore";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

interface PublishedNote {
  noteId: string;
  slug: string;
  publishedAt: string;
  isPublic: boolean;
  views: number;
}

// Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 50);
}

// Mock storage for published notes (in real app, this would be server-side)
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
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const publishedNote = useMemo(() => {
    if (!note) return null;
    return getPublishedNotes().find((p) => p.noteId === note.id);
  }, [note]);

  const isPublished = !!publishedNote;
  const slug = publishedNote?.slug || (note ? generateSlug(note.title) : "");
  const shareUrl = `https://brainvault.app/p/${slug}`;

  if (!isOpen || !note) return null;

  const handlePublish = async () => {
    const published: PublishedNote = {
      noteId: note.id,
      slug: generateSlug(note.title),
      publishedAt: new Date().toISOString(),
      isPublic,
      views: 0,
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

    toast.success("Note published!");
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
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
              <p className="text-sm text-muted-foreground">Share this note with anyone</p>
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

          {/* Share Link */}
          {isPublished && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm truncate">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "px-3 py-2 rounded-md transition-colors",
                    copied ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-muted hover:bg-accent rounded-md transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">{isPublic ? "Public" : "Link Only"}</p>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? "Anyone can find and view this note"
                    : "Only people with the link can view"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                isPublic ? "bg-green-500" : "bg-muted-foreground/30"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  isPublic ? "left-7" : "left-1"
                )}
              />
            </button>
          </div>

          {/* Stats (if published) */}
          {isPublished && publishedNote && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{publishedNote.views}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-sm font-medium">
                  {new Date(publishedNote.publishedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">Published</p>
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
                onClick={handleCopyLink}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {copied ? "Copied!" : "Copy Link"}
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
                <Globe className="w-4 h-4" />
                Publish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
