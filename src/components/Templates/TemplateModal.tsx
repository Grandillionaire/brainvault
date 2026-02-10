/**
 * Template Modal Component
 * Allows creating new notes from templates
 */

import React, { useState } from "react";
import { X, FileText } from "lucide-react";
import { useNotesStore } from "../../stores/notesStore";
import { defaultTemplates, applyTemplate, NoteTemplate } from "../../lib/templates";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose }) => {
  const { createNote, setCurrentNote } = useNotesStore();
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState("");

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    const { title, content } = applyTemplate(
      selectedTemplate,
      customTitle || undefined
    );

    try {
      const note = await createNote(title, content);
      setCurrentNote(note);
      toast.success(`Created ${selectedTemplate.name}`);
      onClose();
    } catch (error) {
      toast.error("Failed to create note from template");
    }
  };

  const handleQuickCreate = async (template: NoteTemplate) => {
    const { title, content } = applyTemplate(template);

    try {
      const note = await createNote(title, content);
      setCurrentNote(note);
      toast.success(`Created ${template.name}`);
      onClose();
    } catch (error) {
      toast.error("Failed to create note from template");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">New from Template</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selection */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedTemplate ? (
            /* Template Configuration */
            <div className="space-y-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-sm text-primary hover:underline"
              >
                ← Back to templates
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-3xl">
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Note Title (optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedTemplate.name}
                  className="w-full px-3 py-2 bg-muted rounded-md text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use the template name
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {applyTemplate(selectedTemplate, customTitle || undefined).content.slice(0, 500)}
                    {selectedTemplate.content.length > 500 && "..."}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* Template Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {defaultTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all cursor-pointer group",
                    "hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleQuickCreate(template)}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          Quick Create
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setCustomTitle("");
                          }}
                          className="px-3 py-1 text-xs border rounded-md hover:bg-accent transition-colors"
                        >
                          Customize
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty Template */}
              <div
                className={cn(
                  "p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer",
                  "hover:border-primary/50 hover:bg-primary/5"
                )}
                onClick={async () => {
                  const note = await createNote();
                  setCurrentNote(note);
                  onClose();
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">Blank Note</h3>
                    <p className="text-sm text-muted-foreground">
                      Start from scratch with an empty note
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-end gap-2 p-6 border-t bg-muted/30">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="px-4 py-2 text-sm hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Create Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
