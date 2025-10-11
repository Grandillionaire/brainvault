import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Hash,
  Clock,
  Pin,
  Folder,
  ChevronRight,
  ChevronDown,
  FileText,
  Settings,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { useNotesStore } from "../../stores/notesStore";
import { useUIStore } from "../../stores/uiStore";
import { cn, formatRelativeDate } from "../../lib/utils";

interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "note";
  children?: TreeNode[];
  note?: any;
}

export const Sidebar: React.FC = () => {
  const { notes, currentNote, setCurrentNote, createNote } = useNotesStore();
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
  } = useUIStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<"files" | "tags" | "recent" | "pinned">("files");

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
          <button
            onClick={() => createNote()}
            className="p-1 hover:bg-accent rounded-sm"
            title="New Note"
          >
            <Plus className="w-4 h-4" />
          </button>
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
    </div>
  );
};