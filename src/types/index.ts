export interface Note {
  id: string;
  title: string;
  content: string;
  plainContent?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  tags: string[];
  links: string[];
  backlinks: string[];
  attachments: Attachment[];
  metadata: Record<string, any>;
  path?: string;
  type?: "note" | "daily" | "canvas";
}

export interface Attachment {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date | string;
}

export interface SearchResult {
  note: Note;
  score: number;
  snippet: string;
  highlights: Array<{
    field: string;
    snippet: string;
  }>;
}

export interface SearchOptions {
  query: string;
  filters?: {
    tags?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    hasAttachments?: boolean;
    hasLinks?: boolean;
  };
  sortBy?: "relevance" | "created" | "updated" | "title";
  limit?: number;
  offset?: number;
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  color?: string;
  group?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface CanvasNode {
  id: string;
  type: "note" | "text" | "image" | "link";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string | Note;
  style?: Record<string, any>;
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  style?: "straight" | "curved";
  label?: string;
}

export interface Canvas {
  id: string;
  name: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  zoom: number;
  offsetX: number;
  offsetY: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Settings {
  general: {
    vaultPath: string;
    autoSave: boolean;
    autoSaveInterval: number;
    spellCheck: boolean;
    defaultView: "edit" | "preview" | "split";
    language: string;
    dailyNotesFolder: string;
    newNotesFolder: string;
    attachmentsFolder: string;
    tutorialCompleted?: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "auto";
    font: string;
    fontSize: number;
    lineHeight: number;
    codeTheme: string;
    accentColor: string;
    showLineNumbers: boolean;
    showFoldGutter: boolean;
  };
  editor: {
    vimMode: boolean;
    lineNumbers: boolean;
    wordWrap: boolean;
    tabSize: number;
    insertSpaces: boolean;
    autoCloseBrackets: boolean;
    autoCloseMarkdown: boolean;
    livePreview: boolean;
    previewMathJax: boolean;
  };
  ai: {
    enabled: boolean;
    provider: "ollama" | "openai" | "none";
    model: string;
    apiKey?: string;
    apiEndpoint?: string;
    temperature: number;
    maxTokens: number;
    autoSuggest: boolean;
  };
  sync: {
    method: "none" | "git" | "syncthing" | "webdav";
    autoSync: boolean;
    syncInterval: number;
    config: Record<string, any>;
  };
  hotkeys: Record<string, string>;
  plugins: {
    enabled: string[];
    configs: Record<string, any>;
  };
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  permissions: string[];
  config?: Record<string, any>;
}

export interface Command {
  id: string;
  name: string;
  category?: string;
  description?: string;
  icon?: string;
  hotkey?: string;
  execute: () => void | Promise<void>;
  isEnabled?: () => boolean;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  description?: string;
  tags?: string[];
  variables?: Array<{
    name: string;
    prompt: string;
    defaultValue?: string;
  }>;
}

export interface DailyNote {
  date: string;
  note: Note;
}

export interface VaultInfo {
  path: string;
  name: string;
  noteCount: number;
  attachmentCount: number;
  totalSize: number;
  createdAt: Date | string;
  lastModified: Date | string;
}

export interface AIChat {
  id: string;
  messages: AIMessage[];
  context: Note[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date | string;
  sources?: Note[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  notes: Note[];
}

export interface ExportOptions {
  format: "markdown" | "html" | "pdf" | "json";
  includeAttachments: boolean;
  includeTags: boolean;
  includeMetadata: boolean;
  preserveLinks: boolean;
}

export type ViewMode = "editor" | "preview" | "split" | "graph" | "canvas";

export interface AppState {
  vault: VaultInfo | null;
  notes: Note[];
  currentNote: Note | null;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  searchQuery: string;
  selectedTags: string[];
  recentNotes: Note[];
  pinnedNotes: Note[];
  isLoading: boolean;
  error: string | null;
}