import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Settings } from "../types";
import api from "../lib/api";

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (data: string) => Promise<void>;
  clearError: () => void;
}

const defaultSettings: Settings = {
  general: {
    vaultPath: "~/Documents/BrainVault",
    autoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    spellCheck: true,
    defaultView: "split",
    language: "en",
    dailyNotesFolder: "daily",
    newNotesFolder: "",
    attachmentsFolder: "attachments",
  },
  appearance: {
    theme: "auto",
    font: "Inter",
    fontSize: 16,
    lineHeight: 1.6,
    codeTheme: "github-dark",
    accentColor: "#0066cc",
    showLineNumbers: false,
    showFoldGutter: true,
  },
  editor: {
    vimMode: false,
    lineNumbers: false,
    wordWrap: true,
    tabSize: 2,
    insertSpaces: true,
    autoCloseBrackets: true,
    autoCloseMarkdown: true,
    livePreview: true,
    previewMathJax: true,
  },
  ai: {
    enabled: false,
    provider: "none",
    model: "llama2",
    temperature: 0.7,
    maxTokens: 2048,
    autoSuggest: false,
  },
  sync: {
    method: "none",
    autoSync: false,
    syncInterval: 300000, // 5 minutes
    config: {},
  },
  hotkeys: {
    "new-note": "Cmd+N",
    "quick-capture": "Cmd+Shift+N",
    "open-daily": "Cmd+D",
    "search": "Cmd+K",
    "command-palette": "Cmd+Shift+P",
    "toggle-sidebar": "Cmd+B",
    "toggle-preview": "Cmd+E",
    "graph-view": "Cmd+G",
    "settings": "Cmd+,",
    "save": "Cmd+S",
    "delete": "Cmd+Shift+Delete",
    "duplicate": "Cmd+Shift+D",
    "export": "Cmd+Shift+E",
    "import": "Cmd+Shift+I",
    "bold": "Cmd+B",
    "italic": "Cmd+I",
    "link": "Cmd+K",
    "code": "Cmd+`",
    "heading1": "Cmd+1",
    "heading2": "Cmd+2",
    "heading3": "Cmd+3",
    "bullet-list": "Cmd+Shift+8",
    "numbered-list": "Cmd+Shift+7",
    "task-list": "Cmd+Shift+9",
    "blockquote": "Cmd+Shift+.",
  },
  plugins: {
    enabled: [],
    configs: {},
  },
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        settings: defaultSettings,
        isLoading: false,
        error: null,

        loadSettings: async () => {
          set({ isLoading: true, error: null });
          try {
            const settingsData = await api.settings.getAll();
            // Convert flat settings to nested structure
            const settings = convertFlatToNested(settingsData);
            set({ settings: { ...defaultSettings, ...settings }, isLoading: false });
          } catch (error) {
            set({ error: String(error), isLoading: false });
          }
        },

        updateSettings: async (updates) => {
          set({ isLoading: true, error: null });
          try {
            const newSettings = {
              ...get().settings,
              ...updates,
            };

            // Convert nested settings to flat structure for API
            const flatSettings = convertNestedToFlat(newSettings);
            await api.settings.updateBulk(flatSettings);

            set({ settings: newSettings, isLoading: false });

            // Apply theme if changed
            if (updates.appearance?.theme) {
              applyTheme(updates.appearance.theme);
            }
          } catch (error) {
            set({ error: String(error), isLoading: false });
          }
        },

        resetSettings: async () => {
          set({ isLoading: true, error: null });
          try {
            await api.settings.reset();
            set({ settings: defaultSettings, isLoading: false });
            applyTheme(defaultSettings.appearance.theme);
          } catch (error) {
            set({ error: String(error), isLoading: false });
          }
        },

        exportSettings: async () => {
          const { settings } = get();
          return JSON.stringify(settings, null, 2);
        },

        importSettings: async (data) => {
          set({ isLoading: true, error: null });
          try {
            const imported = JSON.parse(data) as Settings;
            await get().updateSettings(imported);
          } catch (error) {
            set({ error: String(error), isLoading: false });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: "settings-storage",
      }
    )
  )
);

function applyTheme(theme: "light" | "dark" | "auto") {
  const root = document.documentElement;

  if (theme === "auto") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", isDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

// Helper functions to convert between flat and nested settings
function convertFlatToNested(flat: Record<string, string>): Partial<Settings> {
  const nested: any = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = nested;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    // Parse JSON values
    try {
      current[parts[parts.length - 1]] = JSON.parse(value);
    } catch {
      current[parts[parts.length - 1]] = value;
    }
  }

  return nested;
}

function convertNestedToFlat(nested: Settings): Record<string, string> {
  const flat: Record<string, string> = {};

  function flatten(obj: any, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, newKey);
      } else {
        flat[newKey] = JSON.stringify(value);
      }
    }
  }

  flatten(nested);
  return flat;
}