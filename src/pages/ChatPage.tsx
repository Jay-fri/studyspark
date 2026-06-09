import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User, Loader2, FileText } from "@/lib/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSessionStore } from "@/stores/sessionStore";
import { useDocumentStore, type LegacyDocument } from "@/stores/documentStore";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isStreaming, addMessage, setStreaming } = useSessionStore();
  const documents = useDocumentStore((s) => s.documents) as LegacyDocument[];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = {
      id:          generateId(),
      notebook_id: "local",
      user_id:     "local",
      role:        "user" as const,
      content:     trimmed,
      created_at:  new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput("");

    const assistantMsg = {
      id:          generateId(),
      notebook_id: "local",
      user_id:     "local",
      role:        "assistant" as const,
      content:     "",
      created_at:  new Date().toISOString(),
    };
    addMessage(assistantMsg);
    setStreaming(true);

    // TODO: replace with real streaming API call
    const mockResponse = "I'm StudyLM, your AI study assistant! Upload a document and I'll help you understand it, answer questions, and create study materials. 🎓";
    for (const char of mockResponse) {
      await new Promise((r) => setTimeout(r, 18));
      useSessionStore.getState().appendToLastMessage(char);
    }
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-1 shrink-0">
        <img src="/logo.jpg" alt="StudyLM" className="w-8 h-8 rounded-lg object-cover" />
        <div className="flex-1">
          <h1 className="text-sm font-medium text-text-primary">StudyLM Chat</h1>
          <p className="text-xs text-text-muted">Ask anything about your documents</p>
        </div>

        {/* Document selector */}
        {documents.length > 0 && (
          <select
            value={selectedDocId ?? ""}
            onChange={(e) => setSelectedDocId(e.target.value || null)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface-0 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            <option value="">All documents</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-16"
          >
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-display text-text-primary mb-2">How can I help you study?</h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Ask me to explain concepts, summarize your notes, create flashcards, or quiz you on any topic.
            </p>

            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto mt-6">
              {[
                "Summarize my notes",
                "Explain this concept",
                "Create flashcards",
                "Quiz me on this",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="px-3 py-2 rounded-xl text-xs text-text-secondary border border-border hover:border-brand-primary/30 hover:bg-surface-2 transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "user"
                  ? "bg-brand-primary text-white"
                  : "bg-brand-secondary/10 text-brand-secondary"
              )}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5" />
                  : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className={cn(
                "max-w-[75%] px-4 py-3 rounded-2xl text-sm",
                msg.role === "user"
                  ? "bg-brand-primary text-white rounded-tr-sm"
                  : "bg-surface-1 border border-border text-text-primary rounded-tl-sm"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:m-0 prose-p:leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || " "}
                    </ReactMarkdown>
                    {isStreaming && msg === messages[messages.length - 1] && (
                      <span className="inline-block w-1.5 h-4 bg-brand-primary/60 animate-pulse ml-0.5 rounded-sm" />
                    )}
                  </div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 py-4 border-t border-border bg-surface-1">
        {documents.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>Upload a document for context-aware answers</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none px-4 py-3 rounded-2xl border border-border bg-surface-0 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors max-h-40 scrollbar-thin disabled:opacity-50"
            style={{ height: "auto", minHeight: "48px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 160) + "px";
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-3 rounded-2xl gradient-brand text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isStreaming
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
