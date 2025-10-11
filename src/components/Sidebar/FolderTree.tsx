/**
 * Folder Tree with Drag & Drop
 *
 * Allows users to:
 * 1. Create folders and subfolders
 * 2. Drag notes into folders
 * 3. Drag folders into other folders
 * 4. Right-click context menu for actions
 */

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  MoreVertical,
  FileText,
} from 'lucide-react';
import { useNotesStore } from '../../stores/notesStore';

interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: FolderNode[];
  noteIds: string[];
  isExpanded: boolean;
}

interface DragItem {
  type: 'note' | 'folder';
  id: string;
  folderId?: string;
}

export const FolderTree: React.FC = () => {
  const { notes, updateNote } = useNotesStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Build folder tree from notes
  const folderTree = React.useMemo(() => {
    const root: FolderNode = {
      id: 'root',
      name: 'All Notes',
      path: '',
      children: [],
      noteIds: [],
      isExpanded: true,
    };

    // Group notes by folder
    const folderMap = new Map<string, FolderNode>();
    folderMap.set('root', root);

    // Extract unique folder paths from notes
    const folderPaths = new Set<string>();
    notes.forEach(note => {
      if (note.path) {
        const parts = note.path.split('/').filter(Boolean);
        // Build folder hierarchy
        for (let i = 0; i < parts.length - 1; i++) {
          const path = parts.slice(0, i + 1).join('/');
          folderPaths.add(path);
        }
      }
    });

    // Create folder nodes
    Array.from(folderPaths).sort().forEach(path => {
      const parts = path.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/') || 'root';

      const folder: FolderNode = {
        id: path,
        name,
        path,
        children: [],
        noteIds: [],
        isExpanded: expandedFolders.has(path),
      };

      folderMap.set(path, folder);

      const parent = folderMap.get(parentPath);
      if (parent) {
        parent.children.push(folder);
      }
    });

    // Assign notes to folders
    notes.forEach(note => {
      if (note.path) {
        const parts = note.path.split('/').filter(Boolean);
        const folderPath = parts.slice(0, -1).join('/') || 'root';
        const folder = folderMap.get(folderPath);
        if (folder) {
          folder.noteIds.push(note.id);
        }
      } else {
        root.noteIds.push(note.id);
      }
    });

    return root;
  }, [notes, expandedFolders]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, type: 'note' | 'folder', id: string, folderId?: string) => {
    const dragData: DragItem = { type, id, folderId };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(folderId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOver(null);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    try {
      const dragData: DragItem = JSON.parse(e.dataTransfer.getData('application/json'));

      if (dragData.type === 'note') {
        // Move note to folder
        const note = notes.find(n => n.id === dragData.id);
        if (note) {
          const newPath = targetFolderId === 'root'
            ? `${note.title}.md`
            : `${targetFolderId}/${note.title}.md`;

          await updateNote(note.id, { path: newPath });
        }
      } else if (dragData.type === 'folder') {
        // Move folder (would need backend support)
        console.log('Move folder:', dragData.id, 'to', targetFolderId);
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  // Create new folder
  const handleCreateFolder = async (parentPath: string) => {
    if (!newFolderName.trim()) return;

    const folderPath = parentPath === 'root'
      ? newFolderName
      : `${parentPath}/${newFolderName}`;

    // Create a placeholder note in the folder to ensure it exists
    // (In real implementation, backend would handle this)
    console.log('Creating folder:', folderPath);

    setNewFolderName('');
    setIsCreatingFolder(null);
    setExpandedFolders(prev => new Set([...prev, folderPath]));
  };

  // Context menu actions
  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId });
  };

  // Close context menu
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Render folder node
  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isDraggedOver = dragOver === folder.id;
    const folderNotes = notes.filter(n => folder.noteIds.includes(n.id));

    return (
      <div key={folder.id} className="select-none" data-tutorial={folder.id === 'root' ? 'folders' : undefined}>
        {/* Folder Header */}
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
            hover:bg-accent transition-colors
            ${isDraggedOver ? 'bg-primary/20 border-2 border-primary' : ''}
          `}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          draggable={folder.id !== 'root'}
          onDragStart={(e) => folder.id !== 'root' && handleDragStart(e, 'folder', folder.id)}
        >
          {/* Expand/Collapse Icon */}
          {(folder.children.length > 0 || folder.noteIds.length > 0) && (
            <button className="p-0.5 hover:bg-accent rounded">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-primary" />
          ) : (
            <Folder className="w-4 h-4 text-muted-foreground" />
          )}

          {/* Folder Name */}
          <span className="flex-1 text-sm font-medium truncate">
            {folder.name}
          </span>

          {/* Note Count */}
          <span className="text-xs text-muted-foreground">
            {folder.noteIds.length + folder.children.reduce((acc, child) => acc + child.noteIds.length, 0)}
          </span>

          {/* Actions Menu */}
          <button
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, folder.id);
            }}
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div>
            {/* Subfolders */}
            {folder.children.map(child => renderFolder(child, level + 1))}

            {/* Notes in folder */}
            {folderNotes.map(note => (
              <div
                key={note.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent transition-colors"
                style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
                draggable
                onDragStart={(e) => handleDragStart(e, 'note', note.id, folder.id)}
                onClick={() => {
                  // Navigate to note (would integrate with your routing)
                  console.log('Open note:', note.id);
                }}
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">{note.title}</span>
                {note.tags.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {note.tags.slice(0, 2).map(tag => `#${tag}`).join(' ')}
                  </span>
                )}
              </div>
            ))}

            {/* New Folder Input */}
            {isCreatingFolder === folder.id && (
              <div
                className="flex items-center gap-2 px-2 py-1.5"
                style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
              >
                <FolderPlus className="w-3.5 h-3.5 text-primary" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder(folder.path);
                    if (e.key === 'Escape') setIsCreatingFolder(null);
                  }}
                  onBlur={() => {
                    if (newFolderName.trim()) handleCreateFolder(folder.path);
                    else setIsCreatingFolder(null);
                  }}
                  placeholder="Folder name..."
                  className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Folders
        </h3>
        <button
          onClick={() => setIsCreatingFolder('root')}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="New folder"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Folder Tree */}
      <div className="space-y-0.5">
        {renderFolder(folderTree)}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-popover border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            onClick={() => {
              setIsCreatingFolder(contextMenu.folderId);
              setContextMenu(null);
            }}
          >
            <FolderPlus className="w-4 h-4" />
            New Subfolder
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            onClick={() => {
              // Rename folder
              setContextMenu(null);
            }}
          >
            <Edit2 className="w-4 h-4" />
            Rename
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors"
            onClick={() => {
              if (confirm('Delete this folder and all its contents?')) {
                // Delete folder
              }
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Drag Hint */}
      <div className="mt-4 px-3 py-2 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Drag notes into folders to organize them. Right-click folders for more options.
        </p>
      </div>
    </div>
  );
};
