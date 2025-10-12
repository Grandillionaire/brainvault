import React from 'react';
import {
  Copy,
  Scissors,
  Clipboard,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Trash2,
  Hash,
  FileText,
  Search
} from 'lucide-react';

interface EditorContextMenuProps {
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  x,
  y,
  selectedText,
  onClose,
  onAction
}) => {
  const hasSelection = selectedText.length > 0;

  return (
    <div
      className="fixed bg-popover border rounded-lg shadow-xl py-2 z-[100] min-w-[200px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection && (
        <>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              navigator.clipboard.writeText(selectedText);
              onClose();
            }}
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('cut');
              onClose();
            }}
          >
            <Scissors className="w-4 h-4" />
            Cut
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('bold');
              onClose();
            }}
          >
            <Bold className="w-4 h-4" />
            Make Bold
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('italic');
              onClose();
            }}
          >
            <Italic className="w-4 h-4" />
            Make Italic
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('code');
              onClose();
            }}
          >
            <Code className="w-4 h-4" />
            Make Code
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('link');
              onClose();
            }}
          >
            <LinkIcon className="w-4 h-4" />
            Create Link
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('wikilink');
              onClose();
            }}
          >
            <FileText className="w-4 h-4" />
            Create Wiki Link
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('tag');
              onClose();
            }}
          >
            <Hash className="w-4 h-4" />
            Create Tag
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('search');
              onClose();
            }}
          >
            <Search className="w-4 h-4" />
            Search for "{selectedText.slice(0, 20)}{selectedText.length > 20 ? '...' : ''}"
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-destructive text-left"
            onClick={() => {
              onAction('delete');
              onClose();
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Text
          </button>
        </>
      )}
      {!hasSelection && (
        <>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              onAction('paste');
              onClose();
            }}
          >
            <Clipboard className="w-4 h-4" />
            Paste
          </button>
        </>
      )}
    </div>
  );
};
