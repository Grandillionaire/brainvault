import { useUIStore } from "../../stores/uiStore";
import { X } from "lucide-react";

const shortcuts = [
  {
    category: "notes",
    items: [
      { key: "⌘N", action: "create new note" },
      { key: "⌘K", action: "search notes" },
      { key: "⌘D", action: "delete current note" },
      { key: "⌘S", action: "save note" },
    ],
  },
  {
    category: "editor",
    items: [
      { key: "⌘B", action: "bold text" },
      { key: "⌘I", action: "italic text" },
      { key: "⌘E", action: "cycle editor mode" },
      { key: "⌘⇧K", action: "insert link" },
    ],
  },
  {
    category: "view",
    items: [
      { key: "⌘B", action: "toggle sidebar" },
      { key: "⌘G", action: "open graph view" },
      { key: "⌘F", action: "focus mode" },
      { key: "⌘,", action: "open settings" },
    ],
  },
  {
    category: "navigation",
    items: [
      { key: "⌘[", action: "go back" },
      { key: "⌘]", action: "go forward" },
      { key: "⌘P", action: "command palette" },
    ],
  },
];

export const ShortcutsModal = () => {
  const { shortcutsOpen, closeShortcuts } = useUIStore();

  if (!shortcutsOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeShortcuts();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">keyboard shortcuts</h2>
          <button
            onClick={closeShortcuts}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{item.action}</span>
                    <kbd className="px-2 py-1 text-xs bg-muted border rounded font-mono">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            press <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs font-mono">?</kbd> to open this dialog
          </p>
        </div>
      </div>
    </div>
  );
};
