import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MarkdownEditor } from "./components/Editor/MarkdownEditor";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { GraphView } from "./components/Graph/GraphView";
import { AIChat } from "./components/AI/AIChat";
import { OnboardingTutorial } from "./components/Onboarding/OnboardingTutorial";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { useNotesStore } from "./stores/notesStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useUIStore } from "./stores/uiStore";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "./lib/utils";
import { ViewMode } from "./types";
import ReactMarkdown from "react-markdown";
import "./styles/globals.css";

function App() {
  const { currentNote, loadNotes, createNote, updateNote } = useNotesStore();
  const { settings, loadSettings } = useSettingsStore();
  const {
    viewMode,
    focusMode,
    editorSplitRatio,
    setEditorSplitRatio,
    toggleSidebar,
  } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [editorContent, setEditorContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        await loadSettings();
        await loadNotes();

        // After loading notes, open the most recent one or create a new one
        const notes = useNotesStore.getState().notes;
        if (notes.length > 0) {
          // Open most recent note (sorted by updatedAt)
          const mostRecent = [...notes].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          useNotesStore.getState().setCurrentNote(mostRecent);
        } else {
          // No notes exist, create a welcome note
          const welcomeNote = await createNote(
            "Welcome to BrainVault",
            "# Welcome to BrainVault\n\nStart taking notes! You can:\n\n- Create new notes with the + button\n- Use [[wiki links]] to connect notes\n- Add #tags to organize\n- Right-click notes for more options\n- Press Cmd+K to search\n\nHappy note-taking! 🎉"
          );
          useNotesStore.getState().setCurrentNote(welcomeNote);
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Update editor content when current note changes
  useEffect(() => {
    if (currentNote) {
      // TipTap editor expects HTML or will convert markdown to HTML
      // Set content directly, the editor will handle it
      setEditorContent(currentNote.content || "");
      useUIStore.getState().addRecentNote(currentNote);
    } else {
      setEditorContent("");
    }
  }, [currentNote]);

  // Apply theme on settings change
  useEffect(() => {
    const root = document.documentElement;
    if (settings.appearance.theme === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    } else {
      root.classList.toggle("dark", settings.appearance.theme === "dark");
    }
  }, [settings.appearance.theme]);

  // Keyboard shortcuts
  useHotkeys("cmd+n", async (e) => {
    e.preventDefault();
    const note = await createNote();
    useNotesStore.getState().setCurrentNote(note);
  });

  useHotkeys("cmd+b", (e) => {
    e.preventDefault();
    toggleSidebar();
  });

  useHotkeys("cmd+e", (e) => {
    e.preventDefault();
    const modes: ViewMode[] = ["editor", "preview", "split"];
    const currentIndex = modes.indexOf(viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    useUIStore.getState().setViewMode(nextMode);
  });

  useHotkeys("cmd+s", async (e) => {
    e.preventDefault();
    if (currentNote) {
      await updateNote(currentNote.id, { content: editorContent });
    }
  });

  // Handle split view dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const percentage = (e.clientX / window.innerWidth) * 100;
    setEditorSplitRatio(Math.min(80, Math.max(20, percentage)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-muted-foreground">Loading BrainVault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen bg-background", focusMode && "focus-mode")}>
      <CommandPalette />
      <GraphView />
      <AIChat />

      {/* Sidebar */}
      {!focusMode && <Sidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        {!focusMode && currentNote && (
          <div className="border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <input
                type="text"
                value={currentNote.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  useNotesStore.getState().setCurrentNote({
                    ...currentNote,
                    title: newTitle
                  });
                }}
                onBlur={(e) => {
                  const newTitle = e.target.value;
                  if (newTitle !== currentNote.title) {
                    updateNote(currentNote.id, { title: newTitle });
                  }
                }}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 truncate max-w-md"
                placeholder="Note title"
              />
              <div className="flex gap-2">
                {currentNote.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => useUIStore.getState().togglePinNote(currentNote)}
                className="hover:text-foreground"
              >
                📌
              </button>
              <span>{new Date(currentNote.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Editor/Preview Area */}
        <div className="flex-1 flex overflow-hidden">
          {!currentNote ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">No note selected</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new note or select one from the sidebar
                </p>
                <button
                  onClick={async () => {
                    const note = await createNote();
                    useNotesStore.getState().setCurrentNote(note);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create New Note
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Editor */}
              {(viewMode === "editor" || viewMode === "split") && (
                <div
                  className="flex-1 overflow-hidden"
                  style={
                    viewMode === "split"
                      ? { width: `${editorSplitRatio}%` }
                      : undefined
                  }
                >
                  <MarkdownEditor
                    noteId={currentNote.id}
                    content={editorContent}
                    onChange={setEditorContent}
                    className="h-full"
                  />
                </div>
              )}

              {/* Splitter */}
              {viewMode === "split" && (
                <div
                  className="w-1 bg-border cursor-col-resize hover:bg-primary/20 transition-colors"
                  onMouseDown={() => setIsDragging(true)}
                />
              )}

              {/* Preview */}
              {(viewMode === "preview" || viewMode === "split") && (
                <div
                  className="flex-1 overflow-y-auto p-8 scrollbar-thin"
                  style={
                    viewMode === "split"
                      ? { width: `${100 - editorSplitRatio}%` }
                      : undefined
                  }
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{editorContent}</ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Onboarding Tutorial */}
      <OnboardingTutorial />

      {/* Command Palette */}
      <CommandPalette />

      {/* Graph View */}
      <GraphView />

      {/* AI Chat */}
      <AIChat />

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
}

export default App;
