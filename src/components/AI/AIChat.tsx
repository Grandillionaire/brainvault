import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, Sparkles, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useNotesStore } from "../../stores/notesStore";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: Array<{ noteId: string; title: string; snippet: string }>;
  feedback?: "positive" | "negative";
}

export const AIChat: React.FC = () => {
  const { aiChatOpen, closeAIChat } = useUIStore();
  const { notes, setCurrentNote } = useNotesStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your AI assistant. I can help you explore your notes, find connections, generate summaries, and answer questions about your knowledge base. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (response.ok) {
        setOllamaStatus("online");
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get relevant notes for context
      const relevantNotes = await searchRelevantNotes(input);
      const context = relevantNotes.map(note =>
        `Title: ${note.title}\nContent: ${note.content.substring(0, 500)}...`
      ).join("\n\n---\n\n");

      let response: string;

      if (ollamaStatus === "online") {
        // Use local Ollama
        response = await callOllama(input, context);
      } else {
        // Fallback to mock response for now
        response = generateMockResponse(input, relevantNotes);
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        sources: relevantNotes.map(note => ({
          noteId: note.id,
          title: note.title,
          snippet: note.content.substring(0, 150) + "...",
        })),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Chat error:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error. Please make sure Ollama is running or configure an API key in settings.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchRelevantNotes = async (query: string) => {
    // Simple keyword matching for now
    const keywords = query.toLowerCase().split(" ").filter(word => word.length > 3);

    return notes.filter(note => {
      const content = (note.title + " " + note.content).toLowerCase();
      return keywords.some(keyword => content.includes(keyword));
    }).slice(0, 3);
  };

  const callOllama = async (prompt: string, context: string): Promise<string> => {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        prompt: `You are a helpful assistant analyzing a personal knowledge base.

Context from notes:
${context}

User question: ${prompt}

Provide a helpful response based on the context above.`,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama request failed");

    const data = await response.json();
    return data.response;
  };

  const generateMockResponse = (_query: string, relevantNotes: any[]) => {
    if (relevantNotes.length === 0) {
      return "I couldn't find any notes directly related to your query. Try being more specific or create a new note to capture this information.";
    }

    return `Based on your notes, I found ${relevantNotes.length} relevant entries:\n\n${
      relevantNotes.map(note => `• "${note.title}" discusses this topic`).join("\n")
    }\n\nWould you like me to summarize these notes or help you create connections between them?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const provideFeedback = (messageId: string, feedback: "positive" | "negative") => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
  };

  if (!aiChatOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          {ollamaStatus === "online" && (
            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
              Ollama Connected
            </span>
          )}
        </div>
        <button
          onClick={closeAIChat}
          className="p-1 hover:bg-accent rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Model Selector */}
      {ollamaStatus === "offline" && (
        <div className="p-3 bg-yellow-500/10 border-b">
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
            Ollama is not running. Install and start Ollama for local AI.
          </p>
          <button
            onClick={checkOllamaStatus}
            className="text-xs underline hover:no-underline"
          >
            Check again
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}>
              {message.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block p-3 rounded-lg max-w-[85%] ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/20">
                    <p className="text-xs opacity-70 mb-2">Sources:</p>
                    {message.sources.map((source) => (
                      <button
                        key={source.noteId}
                        onClick={() => {
                          const note = notes.find(n => n.id === source.noteId);
                          if (note) {
                            setCurrentNote(note);
                            closeAIChat();
                          }
                        }}
                        className="block text-xs text-left hover:underline opacity-80 mb-1"
                      >
                        📝 {source.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Actions */}
              {message.role === "assistant" && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="p-1 hover:bg-accent rounded text-muted-foreground"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => provideFeedback(message.id, "positive")}
                    className={`p-1 hover:bg-accent rounded ${
                      message.feedback === "positive" ? "text-green-500" : "text-muted-foreground"
                    }`}
                    title="Good response"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => provideFeedback(message.id, "negative")}
                    className={`p-1 hover:bg-accent rounded ${
                      message.feedback === "negative" ? "text-red-500" : "text-muted-foreground"
                    }`}
                    title="Bad response"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length === 1 && (
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="space-y-1">
            {[
              "What are my most connected notes?",
              "Summarize my notes from this week",
              "Find contradictions in my notes",
              "What questions have I not answered?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="block w-full text-left text-xs p-2 hover:bg-accent rounded"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your notes..."
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};