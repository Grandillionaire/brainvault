import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Hash,
  Clock,
  Pin,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Settings,
  GitBranch,
  MessageSquare,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  FileStack,
} from "lucide-react";
import { useNotesStore } from "../../stores/notesStore";
import { useUIStore } from "../../stores/uiStore";
import { cn, formatRelativeDate } from "../../lib/utils";
import { getDailyNoteTitle, getDailyNoteContent } from "../../lib/templates";
import { ImportModal } from "../Import/ImportModal";
import { TemplateModal } from "../Templates/TemplateModal";

interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "note";
  children?: TreeNode[];
  note?: any;
}

export const Sidebar: React.FC = () => {
  const { notes, currentNote, setCurrentNote, createNote, deleteNote, updateNote } = useNotesStore();
  const {
    sidebarOpen,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    recentNotes,
    pinnedNotes,
    openSettings,
    openGraphView,
    openAIChat,
    togglePinNote,
  } = useUIStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<"files" | "tags" | "recent" | "pinned">("files");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; note: any } | null>(null);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Build folder tree from notes
  const folderTree = useMemo(() => {
    const tree: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    notes.forEach(note => {
      const path = note.path || note.title;
      const parts = path.split("/");

      if (parts.length === 1) {
        // Root level note
        tree.push({
          id: note.id,
          name: note.title,
          type: "note",
          note,
        });
      } else {
        // Note in folder
        let currentLevel = tree;
        let currentPath = "";

        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

          let folder = folderMap.get(currentPath);
          if (!folder) {
            folder = {
              id: currentPath,
              name: folderName,
              type: "folder",
              children: [],
            };
            folderMap.set(currentPath, folder);
            currentLevel.push(folder);
          }

          currentLevel = folder.children!;
        }

        // Add note to final folder
        currentLevel.push({
          id: note.id,
          name: note.title,
          type: "note",
          note,
        });
      }
    });

    return tree;
  }, [notes]);


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

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(noteId);
      setContextMenu(null);
    }
  };

  const handleRenameNote = (note: any) => {
    const newTitle = prompt('Enter new title:', note.title);
    if (newTitle && newTitle !== note.title) {
      updateNote(note.id, { title: newTitle });
    }
    setContextMenu(null);
  };

  const handleDuplicateNote = async (note: any) => {
    await createNote(`${note.title} (copy)`, note.content);
    setContextMenu(null);
  };

  const handleDailyNote = async () => {
    const title = getDailyNoteTitle();
    const existingNote = notes.find(n => n.title === title);
    
    if (existingNote) {
      setCurrentNote(existingNote);
    } else {
      const content = getDailyNoteContent();
      const note = await createNote(title, content);
      setCurrentNote(note);
    }
  };

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders.has(node.id);
      const isActive = node.note && currentNote?.id === node.id;

      if (node.type === "folder") {
        return (
          <div key={node.id}>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm",
                "select-none"
              )}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => toggleFolder(node.id)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Folder className="w-3 h-3" />
              <span className="flex-1 truncate">{node.name}</span>
            </div>
            {isExpanded && node.children && renderTree(node.children, level + 1)}
          </div>
        );
      }

      return (
        <div
          key={node.id}
          className={cn(
            "flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm",
            isActive && "bg-accent text-accent-foreground"
          )}
          style={{ paddingLeft: `${level * 12 + 20}px` }}
          onClick={() => setCurrentNote(node.note)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, note: node.note });
          }}
        >
          <FileText className="w-3 h-3" />
          <span className="flex-1 truncate">{node.name}</span>
        </div>
      );
    });
  };

  if (!sidebarOpen) return null;

  return (
    <div className="w-64 h-full bg-background border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">BrainVault</h1>
          <div className="flex gap-1">
            <button
              onClick={handleDailyNote}
              className="p-1 hover:bg-accent rounded-sm"
              title="Daily Note (Cmd+D)"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="p-1 hover:bg-accent rounded-sm"
              title="New from Template"
            >
              <FileStack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setNewFolderModal(true)}
              className="p-1 hover:bg-accent rounded-sm"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                const note = await createNote();
                setCurrentNote(note);
              }}
              className="p-1 hover:bg-accent rounded-sm"
              title="New Note (Cmd+N)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1 text-sm bg-muted rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 p-2 border-b">
        <button
          onClick={() => setActiveSection("files")}
          className={cn(
            "flex-1 p-1 text-xs rounded-sm",
            activeSection === "files" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
        >
          Files
        </button>
        <button
          onClick={() => setActiveSection("tags")}
          className={cn(
            "flex-1 p-1 text-xs rounded-sm",
            activeSection === "tags" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
        >
          Tags
        </button>
        <button
          onClick={() => setActiveSection("recent")}
          className={cn(
            "flex-1 p-1 text-xs rounded-sm",
            activeSection === "recent" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
        >
          Recent
        </button>
        <button
          onClick={() => setActiveSection("pinned")}
          className={cn(
            "flex-1 p-1 text-xs rounded-sm",
            activeSection === "pinned" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
        >
          Pinned
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {activeSection === "files" && (
          <div className="space-y-1">
            {renderTree(folderTree)}
          </div>
        )}

        {activeSection === "tags" && (
          <div className="space-y-1">
            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4">No tags yet</p>
            ) : (
              allTags.map(tag => (
                <div
                  key={tag}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm",
                    selectedTags.includes(tag) && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => toggleTag(tag)}
                  onDoubleClick={() => {
                    setSearchQuery(`#${tag}`);
                    setActiveSection("files");
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const tagNotes = notes.filter(n => n.tags.includes(tag));
                    if (tagNotes.length > 0) {
                      setContextMenu({ x: e.clientX, y: e.clientY, note: tagNotes[0] });
                    }
                  }}
                >
                  <Hash className="w-3 h-3" />
                  <span className="flex-1">{tag}</span>
                  <span className="text-xs text-muted-foreground">
                    {notes.filter(n => n.tags.includes(tag)).length}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === "recent" && (
          <div className="space-y-1">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4">No recent notes</p>
            ) : (
              recentNotes.map(note => (
                <div
                  key={note.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm",
                    currentNote?.id === note.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setCurrentNote(note)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, note });
                  }}
                  onDoubleClick={() => setCurrentNote(note)}
                >
                  <Clock className="w-3 h-3" />
                  <span className="flex-1 truncate">{note.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(note.updatedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === "pinned" && (
          <div className="space-y-1">
            {pinnedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4">No pinned notes</p>
            ) : (
              pinnedNotes.map(note => (
                <div
                  key={note.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm",
                    currentNote?.id === note.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setCurrentNote(note)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, note });
                  }}
                  onDoubleClick={() => setCurrentNote(note)}
                >
                  <Pin className="w-3 h-3" />
                  <span className="flex-1 truncate">{note.title}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t flex gap-2">
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1 p-2 text-xs hover:bg-accent hover:text-accent-foreground rounded-sm"
          title="Import Notes"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={openGraphView}
          className="flex-1 flex items-center justify-center gap-1 p-2 text-xs hover:bg-accent hover:text-accent-foreground rounded-sm"
          title="Graph View"
        >
          <GitBranch className="w-4 h-4" />
        </button>
        <button
          onClick={openAIChat}
          className="flex-1 flex items-center justify-center gap-1 p-2 text-xs hover:bg-accent hover:text-accent-foreground rounded-sm"
          title="AI Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={openSettings}
          className="flex-1 flex items-center justify-center gap-1 p-2 text-xs hover:bg-accent hover:text-accent-foreground rounded-sm"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      <ImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
      <TemplateModal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-popover border rounded-lg shadow-xl py-2 z-[100] min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              setCurrentNote(contextMenu.note);
              setContextMenu(null);
            }}
          >
            <FileText className="w-4 h-4" />
            Open
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => handleRenameNote(contextMenu.note)}
          >
            <Edit2 className="w-4 h-4" />
            Rename
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => handleDuplicateNote(contextMenu.note)}
          >
            <Plus className="w-4 h-4" />
            Duplicate
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => {
              togglePinNote(contextMenu.note);
              setContextMenu(null);
            }}
          >
            <Pin className="w-4 h-4" />
            {pinnedNotes.some(n => n.id === contextMenu.note.id) ? 'Unpin' : 'Pin'}
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-destructive text-left"
            onClick={() => handleDeleteNote(contextMenu.note.id)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderModal && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center">
          <div className="bg-background border rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name (e.g., Projects/Work)"
              className="w-full px-3 py-2 bg-muted rounded-md mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const folderName = (e.target as HTMLInputElement).value.trim();
                  if (folderName) {
                    // Create a placeholder note in the folder
                    createNote(`${folderName}/README`, `# ${folderName}\n\nThis is a folder for organizing notes.`);
                  }
                  setNewFolderModal(false);
                } else if (e.key === 'Escape') {
                  setNewFolderModal(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setNewFolderModal(false)}
                className="px-4 py-2 text-sm hover:bg-accent rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input[placeholder*="Folder"]');
                  const folderName = input?.value.trim();
                  if (folderName) {
                    createNote(`${folderName}/README`, `# ${folderName}\n\nThis is a folder for organizing notes.`);
                  }
                  setNewFolderModal(false);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Create
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Tip: Use "/" to create nested folders (e.g., "Projects/Work/2024")
            </p>
          </div>
        </div>
      )}
    </div>
  );
};