import React, { useState, useMemo } from "react";
import { Command } from "cmdk";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Search,
  FileText,
  Plus,
  Settings,
  Calendar,
  GitBranch,
  MessageSquare,
  Download,
  Moon,
  Sun,
  Monitor,
  FileCode,
  Copy,
  Trash2,
  Archive,
  BookOpen,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useNotesStore } from "../../stores/notesStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { exportNoteAsMarkdown, exportNoteAsPDF } from "../../lib/export";
import { toast } from "sonner";

interface CommandItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  description?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
}

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, closeCommandPalette, openSettings, openGraphView, openCanvasView, openAIChat, setViewMode } = useUIStore();
  const { createNote, notes, setCurrentNote, currentNote } = useNotesStore();
  const { settings, updateSettings } = useSettingsStore();
  const [search, setSearch] = useState("");
  const [selectedCategory] = useState<string | null>(null); // For future category filtering

  // Open/close with keyboard shortcut
  useHotkeys("cmd+k", () => {
    if (commandPaletteOpen) {
      closeCommandPalette();
    } else {
      useUIStore.getState().openCommandPalette();
    }
  }, { preventDefault: true });

  useHotkeys("cmd+shift+p", () => {
    if (commandPaletteOpen) {
      closeCommandPalette();
    } else {
      useUIStore.getState().openCommandPalette();
    }
  }, { preventDefault: true });

  // Close on escape
  useHotkeys("escape", () => {
    if (commandPaletteOpen) {
      closeCommandPalette();
    }
  }, { enableOnFormTags: true });

  const commands: CommandItem[] = useMemo(() => [
    // File commands
    {
      id: "new-note",
      name: "New Note",
      icon: <Plus className="w-4 h-4" />,
      category: "File",
      description: "Create a new note",
      shortcut: "⌘N",
      action: async () => {
        const note = await createNote();
        setCurrentNote(note);
        closeCommandPalette();
      },
    },
    {
      id: "daily-note",
      name: "Open Daily Note",
      icon: <Calendar className="w-4 h-4" />,
      category: "File",
      description: "Open today's daily note",
      shortcut: "⌘D",
      action: async () => {
        const today = new Date().toISOString().split("T")[0];
        const dailyNote = notes.find(n => n.title === `Daily Note - ${today}`);
        if (dailyNote) {
          setCurrentNote(dailyNote);
        } else {
          const note = await createNote(`Daily Note - ${today}`, `# ${today}\n\n## Tasks\n- [ ] \n\n## Notes\n\n`);
          setCurrentNote(note);
        }
        closeCommandPalette();
      },
    },
    {
      id: "duplicate-note",
      name: "Duplicate Current Note",
      icon: <Copy className="w-4 h-4" />,
      category: "File",
      description: "Create a copy of the current note",
      action: async () => {
        const current = useNotesStore.getState().currentNote;
        if (current) {
          const note = await createNote(`${current.title} (Copy)`, current.content);
          setCurrentNote(note);
        }
        closeCommandPalette();
      },
    },
    {
      id: "delete-note",
      name: "Delete Current Note",
      icon: <Trash2 className="w-4 h-4" />,
      category: "File",
      description: "Delete the current note",
      shortcut: "⌘⇧⌫",
      action: async () => {
        const current = useNotesStore.getState().currentNote;
        if (current) {
          await useNotesStore.getState().deleteNote(current.id);
        }
        closeCommandPalette();
      },
    },

    // View commands
    {
      id: "graph-view",
      name: "Show Graph View",
      icon: <GitBranch className="w-4 h-4" />,
      category: "View",
      description: "Visualize note connections",
      shortcut: "⌘G",
      action: () => {
        openGraphView();
        closeCommandPalette();
      },
    },
    {
      id: "canvas-view",
      name: "New Canvas",
      icon: <FileCode className="w-4 h-4" />,
      category: "View",
      description: "Create a visual canvas",
      action: () => {
        openCanvasView();
        closeCommandPalette();
      },
    },
    {
      id: "focus-mode",
      name: "Toggle Focus Mode",
      icon: <BookOpen className="w-4 h-4" />,
      category: "View",
      description: "Distraction-free writing",
      action: () => {
        useUIStore.getState().toggleFocusMode();
        closeCommandPalette();
      },
    },
    {
      id: "toggle-sidebar",
      name: "Toggle Sidebar",
      icon: <Archive className="w-4 h-4" />,
      category: "View",
      description: "Show/hide sidebar",
      shortcut: "⌘B",
      action: () => {
        useUIStore.getState().toggleSidebar();
        closeCommandPalette();
      },
    },
    {
      id: "editor-mode",
      name: "Editor Mode",
      icon: <FileText className="w-4 h-4" />,
      category: "View",
      description: "Edit mode only",
      action: () => {
        setViewMode("editor");
        closeCommandPalette();
      },
    },
    {
      id: "preview-mode",
      name: "Preview Mode",
      icon: <BookOpen className="w-4 h-4" />,
      category: "View",
      description: "Preview mode only",
      action: () => {
        setViewMode("preview");
        closeCommandPalette();
      },
    },
    {
      id: "split-mode",
      name: "Split Mode",
      icon: <FileText className="w-4 h-4" />,
      category: "View",
      description: "Editor and preview side by side",
      action: () => {
        setViewMode("split");
        closeCommandPalette();
      },
    },

    // AI commands
    {
      id: "ai-chat",
      name: "Chat with AI",
      icon: <MessageSquare className="w-4 h-4" />,
      category: "AI",
      description: "Ask questions about your notes",
      shortcut: "⌘I",
      action: () => {
        openAIChat();
        closeCommandPalette();
      },
    },
    {
      id: "ai-chat",
      name: "AI Chat",
      icon: <MessageSquare className="w-4 h-4" />,
      category: "AI",
      description: "Open AI chat panel",
      action: () => {
        openAIChat();
        closeCommandPalette();
      },
    },

    // Settings commands
    {
      id: "settings",
      name: "Settings",
      icon: <Settings className="w-4 h-4" />,
      category: "Settings",
      description: "Open settings",
      shortcut: "⌘,",
      action: () => {
        openSettings();
        closeCommandPalette();
      },
    },
    {
      id: "theme-light",
      name: "Light Theme",
      icon: <Sun className="w-4 h-4" />,
      category: "Settings",
      description: "Switch to light theme",
      action: () => {
        updateSettings({ appearance: { ...settings.appearance, theme: "light" } });
        closeCommandPalette();
      },
    },
    {
      id: "theme-dark",
      name: "Dark Theme",
      icon: <Moon className="w-4 h-4" />,
      category: "Settings",
      description: "Switch to dark theme",
      action: () => {
        updateSettings({ appearance: { ...settings.appearance, theme: "dark" } });
        closeCommandPalette();
      },
    },
    {
      id: "theme-auto",
      name: "Auto Theme",
      icon: <Monitor className="w-4 h-4" />,
      category: "Settings",
      description: "Follow system theme",
      action: () => {
        updateSettings({ appearance: { ...settings.appearance, theme: "auto" } });
        closeCommandPalette();
      },
    },

    // Export commands
    {
      id: "export-markdown",
      name: "Export as Markdown",
      icon: <Download className="w-4 h-4" />,
      category: "Export",
      description: "Export current note as markdown",
      action: () => {
        if (currentNote) {
          exportNoteAsMarkdown(currentNote);
          toast.success("exported as markdown");
        }
        closeCommandPalette();
      },
    },
    {
      id: "export-pdf",
      name: "Export as PDF",
      icon: <Download className="w-4 h-4" />,
      category: "Export",
      description: "Export current note as PDF",
      action: () => {
        if (currentNote) {
          try {
            exportNoteAsPDF(currentNote);
            toast.success("opening print dialog");
          } catch {
            toast.error("failed to open print dialog");
          }
        }
        closeCommandPalette();
      },
    },
  ], [notes, settings, createNote, setCurrentNote, currentNote, openAIChat, updateSettings, closeCommandPalette, openSettings, openGraphView, setViewMode]);

  const filteredCommands = useMemo(() => {
    let filtered = commands;

    if (selectedCategory) {
      filtered = filtered.filter(cmd => cmd.category === selectedCategory);
    }

    if (search) {
      filtered = filtered.filter(cmd =>
        cmd.name.toLowerCase().includes(search.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [commands, search, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(commands.map(cmd => cmd.category));
    return Array.from(cats);
  }, [commands]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
        <Command className="rounded-lg border shadow-md bg-popover text-popover-foreground">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {categories.map(category => {
              const categoryCommands = filteredCommands.filter(cmd => cmd.category === category);
              if (categoryCommands.length === 0) return null;

              return (
                <Command.Group key={category} heading={category} className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {categoryCommands.map(cmd => (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.id}
                      onSelect={() => cmd.action()}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <span className="mr-2">{cmd.icon}</span>
                      <span className="flex-1">{cmd.name}</span>
                      {cmd.shortcut && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {cmd.shortcut}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};