import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  X,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Search,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useNotesStore } from "../../stores/notesStore";
import {
  semanticSearch,
  findRelatedNotes,
  summarizeNote,
  generateAIResponse,
  checkOllamaStatus,
} from "../../lib/ai";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: Array<{ noteId: string; title: string; snippet: string }>;
  feedback?: "positive" | "negative";
  type?: "text" | "summary" | "related" | "search";
}

export const AIChat: React.FC = () => {
  const { aiChatOpen, closeAIChat } = useUIStore();
  const { notes, currentNote, setCurrentNote } = useNotesStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. I can help you explore your notes, find connections, generate summaries, and answer questions. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{
    checking: boolean;
    available: boolean;
    models: string[];
  }>({ checking: true, available: false, models: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check Ollama status on mount
  useEffect(() => {
    const check = async () => {
      const status = await checkOllamaStatus();
      setOllamaStatus({
        checking: false,
        available: status.available,
        models: status.models,
      });
    };
    check();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (aiChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aiChatOpen]);

  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSummarize = useCallback(async () => {
    if (!currentNote) {
      addMessage({
        role: "assistant",
        content: "Please select a note first to summarize it.",
      });
      return;
    }

    setIsLoading(true);
    addMessage({
      role: "user",
      content: `Summarize "${currentNote.title}"`,
      type: "summary",
    });

    try {
      // Use offline summarization
      const summary = summarizeNote(currentNote);

      // If Ollama is available, enhance the summary
      let enhancedSummary = summary;
      if (ollamaStatus.available) {
        const aiResponse = await generateAIResponse(
          `Please provide a clear, concise summary of this note in 2-3 sentences.`,
          `Title: ${currentNote.title}\n\nContent:\n${currentNote.content}`,
          { model: ollamaStatus.models[0] }
        );
        if (!aiResponse.includes("couldn't connect")) {
          enhancedSummary = aiResponse;
        }
      }

      addMessage({
        role: "assistant",
        content: `## Summary of "${currentNote.title}"\n\n${enhancedSummary}`,
        type: "summary",
        sources: [
          {
            noteId: currentNote.id,
            title: currentNote.title,
            snippet: currentNote.content.slice(0, 100) + "...",
          },
        ],
      });
    } catch (error) {
      console.error("Summarize error:", error);
      addMessage({
        role: "assistant",
        content: "Sorry, I couldn't generate a summary. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, addMessage, ollamaStatus]);

  const handleSemanticSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setIsLoading(true);
      addMessage({
        role: "user",
        content: `Search: "${query}"`,
        type: "search",
      });

      try {
        const results = semanticSearch(query, notes, 5);

        if (results.length === 0) {
          addMessage({
            role: "assistant",
            content: `I couldn't find any notes matching "${query}". Try different keywords or create a new note about this topic.`,
            type: "search",
          });
        } else {
          const content = `## Found ${results.length} related notes\n\n${results
            .map(
              (r, i) =>
                `**${i + 1}. ${r.note.title}** (${Math.round(r.score * 100)}% match)\n   _${r.relevanceReason}_\n   > ${r.note.content.slice(0, 100)}...`
            )
            .join("\n\n")}`;

          addMessage({
            role: "assistant",
            content,
            type: "search",
            sources: results.map((r) => ({
              noteId: r.note.id,
              title: r.note.title,
              snippet: r.note.content.slice(0, 100) + "...",
            })),
          });
        }
      } catch (error) {
        console.error("Search error:", error);
        addMessage({
          role: "assistant",
          content: "Sorry, there was an error searching your notes.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [notes, addMessage]
  );

  const handleFindRelated = useCallback(async () => {
    if (!currentNote) {
      addMessage({
        role: "assistant",
        content: "Please select a note first to find related notes.",
      });
      return;
    }

    setIsLoading(true);
    addMessage({
      role: "user",
      content: `Find notes related to "${currentNote.title}"`,
      type: "related",
    });

    try {
      const related = findRelatedNotes(currentNote, notes, 5);

      if (related.length === 0) {
        addMessage({
          role: "assistant",
          content: `I couldn't find any notes strongly related to "${currentNote.title}". Consider adding [[wiki links]] or #tags to connect your notes.`,
          type: "related",
        });
      } else {
        const content = `## Notes related to "${currentNote.title}"\n\n${related
          .map(
            (r, i) =>
              `**${i + 1}. ${r.note.title}** (${Math.round(r.connectionStrength * 100)}% connected)\n   ${r.connectionReasons.map((reason) => `• ${reason}`).join("\n   ")}`
          )
          .join("\n\n")}`;

        addMessage({
          role: "assistant",
          content,
          type: "related",
          sources: related.map((r) => ({
            noteId: r.note.id,
            title: r.note.title,
            snippet: r.connectionReasons.join(", "),
          })),
        });
      }
    } catch (error) {
      console.error("Find related error:", error);
      addMessage({
        role: "assistant",
        content: "Sorry, there was an error finding related notes.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, notes, addMessage]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");

    // Check for special commands
    if (userInput.toLowerCase().startsWith("search:") || userInput.toLowerCase().startsWith("find:")) {
      const query = userInput.replace(/^(search|find):\s*/i, "");
      await handleSemanticSearch(query);
      return;
    }

    if (userInput.toLowerCase().includes("summarize") && currentNote) {
      await handleSummarize();
      return;
    }

    if (userInput.toLowerCase().includes("related") && currentNote) {
      await handleFindRelated();
      return;
    }

    addMessage({
      role: "user",
      content: userInput,
    });

    setIsLoading(true);

    try {
      // Get relevant notes for context
      const relevantNotes = semanticSearch(userInput, notes, 3);
      const context = relevantNotes
        .map((r) => `Title: ${r.note.title}\nContent: ${r.note.content.slice(0, 500)}...`)
        .join("\n\n---\n\n");

      let response: string;

      if (ollamaStatus.available) {
        response = await generateAIResponse(userInput, context, {
          model: ollamaStatus.models[0],
        });
      } else {
        // Fallback response when Ollama is not available
        if (relevantNotes.length === 0) {
          response =
            "I couldn't find any notes related to your question. Try:\n\n• **search:** keyword - to find notes\n• **Summarize** - to summarize the current note\n• **Related** - to find connected notes";
        } else {
          response = `Based on your notes, I found ${relevantNotes.length} relevant entries:\n\n${relevantNotes
            .map((r) => `• **${r.note.title}** - ${r.relevanceReason}`)
            .join("\n")}\n\n_Enable Ollama for AI-powered answers._`;
        }
      }

      addMessage({
        role: "assistant",
        content: response,
        sources:
          relevantNotes.length > 0
            ? relevantNotes.map((r) => ({
                noteId: r.note.id,
                title: r.note.title,
                snippet: r.note.content.slice(0, 100) + "...",
              }))
            : undefined,
      });
    } catch (error) {
      console.error("AI Chat error:", error);
      addMessage({
        role: "assistant",
        content:
          "I encountered an error. Please check that Ollama is running or try a simpler query.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    notes,
    currentNote,
    ollamaStatus,
    addMessage,
    handleSemanticSearch,
    handleSummarize,
    handleFindRelated,
  ]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const provideFeedback = (messageId: string, feedback: "positive" | "negative") => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg))
    );
    toast.success(feedback === "positive" ? "Thanks for the feedback!" : "We'll try to improve");
  };

  const navigateToNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setCurrentNote(note);
      closeAIChat();
    }
  };

  if (!aiChatOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-xl z-30 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            {ollamaStatus.checking ? (
              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </span>
            ) : ollamaStatus.available ? (
              <span className="text-xs flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                AI Online
              </span>
            ) : (
              <span className="text-xs flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" />
                Offline Mode
              </span>
            )}
            <button
              onClick={closeAIChat}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
              aria-label="Close AI chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSummarize}
            disabled={!currentNote || isLoading}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              currentNote
                ? "bg-primary/10 hover:bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <FileText className="w-4 h-4" />
            Summarize
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFindRelated}
            disabled={!currentNote || isLoading}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              currentNote
                ? "bg-primary/10 hover:bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Link2 className="w-4 h-4" />
            Related
          </motion.button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </motion.div>

                <div className={cn("flex-1", message.role === "user" ? "text-right" : "")}>
                  <div
                    className={cn(
                      "inline-block p-3 rounded-xl max-w-[85%] text-left",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                      {message.content.split("\n").map((line, i) => {
                        if (line.startsWith("## ")) {
                          return (
                            <h3 key={i} className="text-base font-semibold mt-0 mb-2">
                              {line.replace("## ", "")}
                            </h3>
                          );
                        }
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return (
                            <p key={i} className="font-medium my-1">
                              {line.replace(/\*\*/g, "")}
                            </p>
                          );
                        }
                        if (line.startsWith("• ") || line.startsWith("- ")) {
                          return (
                            <p key={i} className="ml-2 my-0.5">
                              {line}
                            </p>
                          );
                        }
                        if (line.startsWith("> ")) {
                          return (
                            <blockquote
                              key={i}
                              className="border-l-2 border-primary/30 pl-2 my-1 text-muted-foreground italic"
                            >
                              {line.replace("> ", "")}
                            </blockquote>
                          );
                        }
                        if (line.startsWith("_") && line.endsWith("_")) {
                          return (
                            <p key={i} className="text-xs text-muted-foreground my-0.5">
                              {line.replace(/_/g, "")}
                            </p>
                          );
                        }
                        return line ? <p key={i} className="my-1">{line}</p> : <br key={i} />;
                      })}
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/20">
                        <p className="text-xs opacity-70 mb-2">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source) => (
                            <motion.button
                              key={source.noteId}
                              whileHover={{ x: 2 }}
                              onClick={() => navigateToNote(source.noteId)}
                              className="block text-xs text-left hover:text-primary opacity-80 transition-colors"
                            >
                              📝 {source.title}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  {message.role === "assistant" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex gap-1 mt-2"
                    >
                      <button
                        onClick={() => copyMessage(message.content)}
                        className="p-1.5 hover:bg-accent rounded-md text-muted-foreground transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => provideFeedback(message.id, "positive")}
                        className={cn(
                          "p-1.5 hover:bg-accent rounded-md transition-colors",
                          message.feedback === "positive"
                            ? "text-green-500"
                            : "text-muted-foreground"
                        )}
                        title="Good response"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => provideFeedback(message.id, "negative")}
                        className={cn(
                          "p-1.5 hover:bg-accent rounded-md transition-colors",
                          message.feedback === "negative"
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                        title="Bad response"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}

                  {/* Timestamp */}
                  <p className="text-[10px] text-muted-foreground mt-1 opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="flex gap-1">
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <AnimatePresence>
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-t overflow-hidden"
            >
              <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
              <div className="space-y-1">
                {[
                  { icon: Search, text: "search: project ideas" },
                  { icon: FileText, text: "Summarize this note" },
                  { icon: Link2, text: "Find related notes" },
                  { icon: Sparkles, text: "What patterns do you see in my notes?" },
                ].map(({ icon: Icon, text }) => (
                  <motion.button
                    key={text}
                    whileHover={{ x: 4 }}
                    onClick={() => setInput(text)}
                    className="flex items-center gap-2 w-full text-left text-xs p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span>{text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t bg-gradient-to-t from-background to-transparent">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your notes..."
                className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                rows={2}
                disabled={isLoading}
              />
              {input.length > 0 && (
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                  {input.length}/500
                </span>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
