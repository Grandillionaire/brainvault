import { useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { createLowlight, all } from "lowlight";

const lowlight = createLowlight(all);
import { useNotesStore } from "../../stores/notesStore";
import { useUIStore } from "../../stores/uiStore";
import { debounce } from "../../lib/utils";
import { cn } from "../../lib/utils";

interface MarkdownEditorProps {
  noteId?: string;
  content?: string;
  onChange?: (content: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  noteId,
  content = "",
  onChange,
  className,
  placeholder = "Start writing...",
  readOnly = false,
}) => {
  const { updateNote, currentNote } = useNotesStore();
  const { focusMode } = useUIStore();
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-md bg-muted p-4 font-mono text-sm",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: "first:before:text-muted-foreground first:before:content-[attr(data-placeholder)] first:before:float-left first:before:pointer-events-none",
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "not-prose pl-0",
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: "flex items-start",
        },
        nested: true,
      }),
    ],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      debouncedSave(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      const text = editor.getText();
      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      // Auto-focus editor on create
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    },
  });

  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (onChange) {
        // If onChange is provided, use it (parent handles saving)
        onChange(content);
        return;
      }
      if (noteId || currentNote?.id) {
        // Otherwise, handle saving here
        setIsSaving(true);
        try {
          await updateNote(noteId || currentNote!.id, { content });
        } catch (error) {
          console.error("Failed to save note:", error);
        } finally {
          setIsSaving(false);
        }
      }
    }, 500),
    [noteId, currentNote, updateNote, onChange]
  );

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content);
      // Restore cursor position if editing
      if (editor.isFocused) {
        editor.commands.setTextSelection({ from, to });
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Wiki link shortcut
      if (e.key === "[" && e.ctrlKey) {
        e.preventDefault();
        editor.chain().focus().insertContent("[[]]").run();
        // Move cursor between brackets
        editor.commands.setTextSelection({
          from: editor.state.selection.from - 2,
          to: editor.state.selection.from - 2,
        });
      }

      // Tag shortcut
      if (e.key === "3" && e.shiftKey && e.metaKey) {
        e.preventDefault();
        editor.chain().focus().insertContent("#").run();
      }

      // Bold
      if (e.key === "b" && e.metaKey) {
        e.preventDefault();
        editor.chain().focus().toggleBold().run();
      }

      // Italic
      if (e.key === "i" && e.metaKey) {
        e.preventDefault();
        editor.chain().focus().toggleItalic().run();
      }

      // Strike
      if (e.key === "s" && e.metaKey && e.shiftKey) {
        e.preventDefault();
        editor.chain().focus().toggleStrike().run();
      }

      // Code
      if (e.key === "`" && e.metaKey) {
        e.preventDefault();
        editor.chain().focus().toggleCode().run();
      }

      // Headings
      if (e.metaKey && !e.shiftKey && !e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 1 }).run();
        } else if (e.key === "2") {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        } else if (e.key === "3") {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 3 }).run();
        }
      }

      // Lists
      if (e.metaKey && e.shiftKey) {
        if (e.key === "8") {
          e.preventDefault();
          editor.chain().focus().toggleBulletList().run();
        } else if (e.key === "7") {
          e.preventDefault();
          editor.chain().focus().toggleOrderedList().run();
        } else if (e.key === "9") {
          e.preventDefault();
          editor.chain().focus().toggleTaskList().run();
        }
      }

      // Blockquote
      if (e.key === ">" && e.metaKey && e.shiftKey) {
        e.preventDefault();
        editor.chain().focus().toggleBlockquote().run();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn("relative h-full flex flex-col", className, focusMode && "focus-mode")}
      onClick={() => {
        // Focus editor when clicking anywhere in the editor area
        if (editor && !editor.isFocused) {
          editor.commands.focus();
        }
      }}
    >
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto scrollbar-thin cursor-text"
      />
      <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{Math.ceil(wordCount / 200)} min read</span>
        </div>
        {isSaving && (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
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
            Saving...
          </span>
        )}
      </div>
    </div>
  );
};