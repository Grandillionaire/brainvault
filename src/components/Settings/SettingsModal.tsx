import React, { useState } from "react";
import { X, Check, Moon, Sun, Monitor, Save } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../lib/utils";

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { settingsOpen, closeSettings } = useUIStore();
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "editor" | "ai">("general");
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  if (!settingsOpen) return null;

  const handleSave = async () => {
    await updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateLocal = (category: keyof typeof localSettings, key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r p-4 space-y-1">
            {[
              { id: "general", label: "General" },
              { id: "appearance", label: "Appearance" },
              { id: "editor", label: "Editor" },
              { id: "ai", label: "AI" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">General Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Vault Path
                      </label>
                      <input
                        type="text"
                        value={localSettings.general.vaultPath}
                        onChange={(e) => updateLocal("general", "vaultPath", e.target.value)}
                        className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Location where notes are stored
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium">Auto-save</label>
                        <p className="text-xs text-muted-foreground">
                          Automatically save notes while typing
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.general.autoSave}
                        onChange={(e) => updateLocal("general", "autoSave", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>

                    {localSettings.general.autoSave && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Auto-save Interval (seconds)
                        </label>
                        <input
                          type="number"
                          value={localSettings.general.autoSaveInterval}
                          onChange={(e) => updateLocal("general", "autoSaveInterval", parseInt(e.target.value))}
                          min="1"
                          max="60"
                          className="w-32 px-3 py-2 bg-muted rounded-md text-sm"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium">Spell Check</label>
                        <p className="text-xs text-muted-foreground">
                          Enable spell checking in editor
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.general.spellCheck}
                        onChange={(e) => updateLocal("general", "spellCheck", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Default View
                      </label>
                      <select
                        value={localSettings.general.defaultView}
                        onChange={(e) => updateLocal("general", "defaultView", e.target.value)}
                        className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                      >
                        <option value="editor">Editor Only</option>
                        <option value="preview">Preview Only</option>
                        <option value="split">Split View</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Appearance</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-3">Theme</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "light", icon: Sun, label: "Light" },
                          { value: "dark", icon: Moon, label: "Dark" },
                          { value: "auto", icon: Monitor, label: "Auto" },
                        ].map((theme) => (
                          <button
                            key={theme.value}
                            onClick={() => updateLocal("appearance", "theme", theme.value)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                              localSettings.appearance.theme === theme.value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <theme.icon className="w-6 h-6" />
                            <span className="text-sm font-medium">{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Font Family
                      </label>
                      <select
                        value={localSettings.appearance.font}
                        onChange={(e) => updateLocal("appearance", "font", e.target.value)}
                        className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                      >
                        <option value="system">System Default</option>
                        <option value="mono">Monospace</option>
                        <option value="serif">Serif</option>
                        <option value="sans">Sans-serif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Font Size: {localSettings.appearance.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="24"
                        value={localSettings.appearance.fontSize}
                        onChange={(e) => updateLocal("appearance", "fontSize", parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Line Height: {localSettings.appearance.lineHeight}
                      </label>
                      <input
                        type="range"
                        min="1.2"
                        max="2.0"
                        step="0.1"
                        value={localSettings.appearance.lineHeight}
                        onChange={(e) => updateLocal("appearance", "lineHeight", parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "editor" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Editor Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium">Vim Mode</label>
                        <p className="text-xs text-muted-foreground">
                          Enable Vim keybindings
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.editor.vimMode}
                        onChange={(e) => updateLocal("editor", "vimMode", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium">Line Numbers</label>
                        <p className="text-xs text-muted-foreground">
                          Show line numbers in editor
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.editor.lineNumbers}
                        onChange={(e) => updateLocal("editor", "lineNumbers", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium">Word Wrap</label>
                        <p className="text-xs text-muted-foreground">
                          Wrap long lines
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.editor.wordWrap}
                        onChange={(e) => updateLocal("editor", "wordWrap", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tab Size
                      </label>
                      <input
                        type="number"
                        value={localSettings.editor.tabSize}
                        onChange={(e) => updateLocal("editor", "tabSize", parseInt(e.target.value))}
                        min="2"
                        max="8"
                        className="w-32 px-3 py-2 bg-muted rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium">Enable AI Features</label>
                        <p className="text-xs text-muted-foreground">
                          Use local AI (requires Ollama)
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.ai.enabled}
                        onChange={(e) => updateLocal("ai", "enabled", e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>

                    {localSettings.ai.enabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            API Endpoint
                          </label>
                          <input
                            type="text"
                            value={localSettings.ai.apiEndpoint}
                            onChange={(e) => updateLocal("ai", "apiEndpoint", e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Model
                          </label>
                          <input
                            type="text"
                            value={localSettings.ai.model}
                            onChange={(e) => updateLocal("ai", "model", e.target.value)}
                            placeholder="llama2"
                            className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Temperature: {localSettings.ai.temperature}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={localSettings.ai.temperature}
                            onChange={(e) => updateLocal("ai", "temperature", parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Lower = more focused, Higher = more creative
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Changes are saved automatically
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeSettings}
              className="px-4 py-2 text-sm hover:bg-accent rounded-md transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
