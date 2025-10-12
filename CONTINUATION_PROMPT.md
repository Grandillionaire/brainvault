# 🚀 BrainVault - Production Completion Task

## Project Overview
BrainVault is a local-first, privacy-focused note-taking application built with React, TypeScript, Vite, and Tauri. Think Obsidian/Notion but 100% offline with optional AI features via Ollama.

**Current State:** Fully functional core app with editor, folders, search, graph view, themes, and context menus. Ready for final production polish.

**Your Mission:** Implement 8 critical features to make this production-ready for public release.

---

## 📁 Project Structure

```
brainvault/
├── src/
│   ├── components/         # React components
│   │   ├── Editor/        # MarkdownEditor, EditorContextMenu
│   │   ├── Sidebar/       # Sidebar with notes, folders, tags
│   │   ├── Settings/      # SettingsModal
│   │   ├── Graph/         # GraphView (3D visualization)
│   │   ├── AI/            # AIChat
│   │   └── CommandPalette/
│   ├── stores/            # Zustand state management
│   │   ├── notesStore.ts  # Notes CRUD, local fallback
│   │   ├── settingsStore.ts
│   │   └── uiStore.ts
│   ├── lib/
│   │   ├── api.ts         # API functions (often fails, has local fallback)
│   │   └── utils.ts       # Helper functions
│   ├── types/index.ts     # TypeScript types
│   └── styles/globals.css
├── src-tauri/             # Tauri (Rust) backend - optional
├── server/                # Node.js backend - optional
├── package.json
└── README.md
```

---

## 🎯 Critical Implementation Tasks

### **Task 1: LICENSE File** (5 minutes)
**Why:** Legal requirement for open source distribution.

**What to do:**
- Create `LICENSE` file in project root
- Use MIT License (most permissive)
- Copyright holder: The actual developer's name (check git config or package.json author once added)

**Implementation:**
```bash
# Create MIT LICENSE file
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 [Author Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

---

### **Task 2: Toast Notifications System** (1-2 hours)
**Why:** Users need visual feedback for actions (save, delete, copy, etc.)

**What to do:**
1. Install `react-hot-toast` or `sonner` (lightweight, modern)
2. Create toast wrapper component
3. Integrate toasts for:
   - Note created/deleted/duplicated
   - Copy/paste actions
   - Save success/failure
   - Export success
   - Settings saved
   - Errors

**Implementation approach:**
```bash
npm install sonner
```

Create `src/components/Toast/ToastProvider.tsx`:
```typescript
import { Toaster } from 'sonner';

export const ToastProvider = () => (
  <Toaster
    position="bottom-right"
    richColors
    closeButton
  />
);
```

Add to `App.tsx`:
```typescript
import { ToastProvider } from './components/Toast/ToastProvider';

// In render
<ToastProvider />
```

Use throughout app:
```typescript
import { toast } from 'sonner';

// Success
toast.success('Note created successfully');

// Error
toast.error('Failed to save note');

// Info
toast.info('Copied to clipboard');
```

**Where to add toasts:**
- `notesStore.ts`: createNote, updateNote, deleteNote
- `EditorContextMenu.tsx`: copy, cut actions
- `Sidebar.tsx`: note operations
- `SettingsModal.tsx`: save settings

---

### **Task 3: Export Functionality** (3-4 hours)
**Why:** Users MUST be able to export their data (data portability).

**What to do:**
1. Export single note as Markdown (download .md file)
2. Export single note as PDF (use jsPDF or print API)
3. Export all notes as ZIP (use JSZip)
4. Add "Export" button to note header and settings

**Implementation:**

Install dependencies:
```bash
npm install jszip file-saver
npm install --save-dev @types/file-saver
```

Create `src/lib/export.ts`:
```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Note } from '../types';

export const exportNoteAsMarkdown = (note: Note) => {
  const content = `# ${note.title}\n\n${note.content}`;
  const blob = new Blob([content], { type: 'text/markdown' });
  saveAs(blob, `${note.title}.md`);
};

export const exportNoteAsPDF = (note: Note) => {
  // Use browser's print API for PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head><title>${note.title}</title></head>
      <body>
        <h1>${note.title}</h1>
        <div>${note.content}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};

export const exportAllNotesAsZip = async (notes: Note[]) => {
  const zip = new JSZip();

  notes.forEach(note => {
    const content = `# ${note.title}\n\n${note.content}`;
    const path = note.path || `${note.title}.md`;
    zip.file(path, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `brainvault-export-${Date.now()}.zip`);
};
```

Add export buttons:
- In note header (next to title)
- In right-click context menu
- In settings modal

---

### **Task 4: Keyboard Shortcuts Help** (1 hour)
**Why:** Users need to discover keyboard shortcuts.

**What to do:**
1. Create modal that opens with `?` key
2. List all keyboard shortcuts in organized categories
3. Show current OS (Mac/Windows) specific shortcuts

**Implementation:**

Create `src/components/Help/ShortcutsModal.tsx`:
```typescript
import React from 'react';
import { useUIStore } from '../../stores/uiStore';

const shortcuts = [
  {
    category: 'Notes',
    items: [
      { key: 'Cmd+N', action: 'Create new note' },
      { key: 'Cmd+K', action: 'Search notes' },
      { key: 'Cmd+D', action: 'Delete note' },
    ]
  },
  {
    category: 'Editor',
    items: [
      { key: 'Cmd+B', action: 'Bold' },
      { key: 'Cmd+I', action: 'Italic' },
      { key: 'Cmd+S', action: 'Save note' },
    ]
  },
  {
    category: 'View',
    items: [
      { key: 'Cmd+B', action: 'Toggle sidebar' },
      { key: 'Cmd+E', action: 'Toggle preview' },
      { key: 'Cmd+G', action: 'Graph view' },
    ]
  }
];

export const ShortcutsModal = () => {
  const { shortcutsOpen, closeShortcuts } = useUIStore();
  if (!shortcutsOpen) return null;

  // Render modal with shortcuts...
};
```

Add state to `uiStore.ts`:
```typescript
shortcutsOpen: boolean;
openShortcuts: () => void;
closeShortcuts: () => void;
```

Add keyboard handler in `App.tsx`:
```typescript
useHotkeys('shift+/', () => {
  openShortcuts();
});
```

---

### **Task 5: Better Error Handling** (1 hour)
**Why:** Users should see helpful errors, not console logs.

**What to do:**
1. Add error boundary component
2. Show user-friendly error messages
3. Add retry mechanisms
4. Log errors properly

**Implementation:**

Create `src/components/ErrorBoundary.tsx`:
```typescript
import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap app in `main.tsx`:
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

Update error handling in stores to use toasts instead of console.error.

---

### **Task 6: Package.json Metadata** (10 minutes)
**Why:** Proper project metadata for npm/GitHub.

**What to do:**
Update `package.json`:
```json
{
  "name": "brainvault",
  "version": "1.0.0",
  "description": "Local-first note-taking and knowledge management application",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/brainvault"
  },
  "bugs": {
    "url": "https://github.com/yourusername/brainvault/issues"
  },
  "homepage": "https://github.com/yourusername/brainvault#readme",
  "keywords": [
    "notes",
    "note-taking",
    "knowledge-management",
    "markdown",
    "local-first",
    "privacy",
    "obsidian",
    "notion",
    "second-brain"
  ]
}
```

---

### **Task 7: Loading States** (1-2 hours)
**Why:** Better UX during async operations.

**What to do:**
1. Add loading skeletons for notes list
2. Add spinner for note loading
3. Add progress bar for exports
4. Add loading state for graph view

**Implementation:**

Create `src/components/Loading/Skeleton.tsx`:
```typescript
export const NoteSkeleton = () => (
  <div className="animate-pulse space-y-2 p-2">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="h-3 bg-muted rounded w-1/2"></div>
  </div>
);
```

Use in sidebar:
```typescript
{isLoading ? (
  <>
    <NoteSkeleton />
    <NoteSkeleton />
    <NoteSkeleton />
  </>
) : (
  // Render actual notes
)}
```

---

### **Task 8: Basic Tests** (2-3 hours)
**Why:** Ensure critical functionality doesn't break.

**What to do:**
1. Set up Vitest
2. Write tests for:
   - Note creation
   - Note updating
   - Search functionality
   - Export functions
   - Utility functions

**Implementation:**

Install:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

Create basic tests in `src/lib/__tests__/export.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { exportNoteAsMarkdown } from '../export';

describe('exportNoteAsMarkdown', () => {
  it('should export note with title and content', () => {
    const note = {
      id: '1',
      title: 'Test Note',
      content: 'Test content',
      // ... other fields
    };

    // Test implementation
    expect(note.title).toBe('Test Note');
  });
});
```

Add test script to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui"
}
```

---

## 🎨 Code Style Guidelines

**CRITICAL: Follow these strictly to match existing codebase:**

1. **Commit Messages:**
   - All lowercase
   - Short and descriptive
   - No "AI" or "Claude" mentions
   - Example: "add export functionality and toast notifications"

2. **Code Style:**
   - Use existing patterns from codebase
   - Match indentation (2 spaces)
   - Use `cn()` helper for className merging
   - Follow existing component structure
   - Use Zustand for state management

3. **TypeScript:**
   - Use existing types from `src/types/index.ts`
   - Add new types as needed
   - No `any` types
   - Strict mode enabled

4. **Components:**
   - Functional components with hooks
   - Use `useCallback` for event handlers
   - Use `useMemo` for expensive computations
   - Clean up effects properly

5. **File Organization:**
   - One component per file
   - Co-locate related files (component + styles + tests)
   - Use barrel exports (index.ts) sparingly

---

## 🔍 Existing Patterns to Follow

### State Management (Zustand):
```typescript
// notesStore.ts pattern
export const useNotesStore = create<NotesState>()(
  devtools(
    persist(
      (set, get) => ({
        notes: [],
        createNote: async (title, content) => {
          // Try API, fall back to local
          let note: Note;
          try {
            note = await notesApi.create({ title, content });
          } catch {
            note = createLocalNote(title, content);
          }
          set(state => ({ notes: [...state.notes, note] }));
          return note;
        },
      }),
      { name: 'notes-storage' }
    )
  )
);
```

### Components with Context Menu:
```typescript
// Pattern from Sidebar.tsx
const [contextMenu, setContextMenu] = useState<{x, y, note} | null>(null);

<div
  onContextMenu={(e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, note });
  }}
>
```

### Modal Pattern:
```typescript
// Pattern from SettingsModal.tsx
export const MyModal = () => {
  const { myModalOpen, closeMyModal } = useUIStore();

  if (!myModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-background border rounded-lg shadow-xl">
        {/* Content */}
      </div>
    </div>
  );
};
```

---

## 🧪 Testing Before Completion

**You MUST test these scenarios:**

1. **Create a note** → Should show toast
2. **Export note as markdown** → Should download .md file
3. **Export all notes as ZIP** → Should download .zip with all notes
4. **Press `?`** → Should show shortcuts modal
5. **Create note when API fails** → Should fall back to local storage
6. **Run `npm test`** → All tests should pass
7. **Run `npm run build`** → Should build without errors
8. **Check LICENSE file** → Should exist with MIT license

---

## 📦 Deliverables

When done, you should have:

1. ✅ `LICENSE` file in root
2. ✅ Toast notifications working throughout app
3. ✅ Export buttons in UI (note header, context menu, settings)
4. ✅ Shortcuts modal opens with `?` key
5. ✅ Error boundary catches and displays errors
6. ✅ `package.json` updated with metadata
7. ✅ Loading skeletons in sidebar and graph
8. ✅ Basic tests passing (`npm test`)
9. ✅ Build successful (`npm run build`)
10. ✅ All features tested manually

---

## 💡 Important Notes

### Local Storage Fallback
The app has local fallback when API fails. Notes are created like:
```typescript
note = {
  id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title, content, tags, links, backlinks: [],
  attachments: [], path: `${title}.md`,
  plainContent: content.replace(/[#\[\]]/g, ""),
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### Existing Features
- ✅ Editor: TipTap with auto-save, context menu, double-click wiki links
- ✅ Sidebar: Notes, folders, tags, recent, pinned all with context menus
- ✅ Graph: 3D visualization with zoom controls
- ✅ Settings: Theme, appearance, editor, AI settings
- ✅ Search: Full-text search with Cmd+K
- ✅ Auto-open: Opens last note or creates welcome note on launch

### Critical Files
- `src/stores/notesStore.ts` - All note CRUD operations
- `src/components/Editor/MarkdownEditor.tsx` - Main editor
- `src/components/Sidebar/Sidebar.tsx` - Note list with context menus
- `src/App.tsx` - Main app component
- `src/types/index.ts` - TypeScript definitions

---

## 🎯 Success Criteria

**The task is COMPLETE when:**

1. All 8 tasks implemented
2. No TypeScript errors (`npm run build`)
3. No console errors in browser
4. All manual test scenarios pass
5. Tests pass (`npm test`)
6. Commit messages are lowercase, natural, human-like
7. NO mentions of "Claude" or "AI" in code/commits
8. Code style matches existing codebase perfectly

---

## 🚀 Final Steps

After implementation:

1. Run `npm run build` - verify success
2. Run `npm test` - verify all pass
3. Test manually in browser
4. Commit with message: "add export, toasts, shortcuts help, tests, and production polish"
5. Create summary of what was added

---

**You are a continuation of the original developer. Write code that looks indistinguishable from the existing codebase. Be thorough, test everything, and ship production-quality code. Good luck!** 🚀
