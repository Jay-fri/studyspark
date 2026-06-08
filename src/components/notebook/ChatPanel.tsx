import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Copy, RefreshCw, Zap, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useGroq } from "@/hooks/useGroq";
import { useNotebookStore } from "@/stores/notebookStore";
import { useAuthStore } from "@/stores/authStore";
import { useTokens } from "@/hooks/useTokens";
import { TOKEN_COSTS } from "@/lib/tokenCounter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { generateStarterQuestions } from "@/services/groq";
import { buildContext } from "@/lib/documentChunker";
import { useNotebookChatMessages } from "@/hooks/useNotebook";

const FALLBACK_STARTERS = [
  "Summarise the key points from my sources",
  "What are the main themes and concepts?",
  "Create 5 exam practice questions",
  "Explain the most important topic in simple terms",
  "What should I focus on for my exam?",
];

function startersKey(id: string) { return `nb-starters-${id}`; }

function loadCachedStarters(notebookId: string): string[] | null {
  try {
    const raw = localStorage.getItem(startersKey(notebookId));
    return raw ? JSON.parse(raw) as string[] : null;
  } catch { return null; }
}

function saveStarters(notebookId: string, qs: string[]) {
  try { localStorage.setItem(startersKey(notebookId), JSON.stringify(qs)); } catch { /* ignore */ }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-[var(--text-muted)]"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
}

interface Props {
  notebookId: string;
}

export function ChatPanel({ notebookId }: Props) {
  const { chat, isStreaming }  = useGroq();
  const { chatMessages, sources } = useNotebookStore();
  const profile  = useAuthStore((s) => s.profile);
  const { spend, balance } = useTokens();
  const { isLoading: loadingHistory, clearMessages } = useNotebookChatMessages(notebookId);

  const [input, setInput]                   = useState("");
  const [starters, setStarters]             = useState<string[]>(() => loadCachedStarters(notebookId) ?? FALLBACK_STARTERS);
  const [loadingStarters, setLoadingStarters] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate AI starter questions on first open (no token cost)
  useEffect(() => {
    if (sources.length === 0) return;
    const cached = loadCachedStarters(notebookId);
    if (cached) { setStarters(cached); return; }
    let cancelled = false;
    setLoadingStarters(true);
    const context = buildContext(sources, "all", 4000);
    generateStarterQuestions(context)
      .then((qs) => {
        if (cancelled || qs.length === 0) return;
        setStarters(qs);
        saveStarters(notebookId, qs);
      })
      .catch(() => {/* silently use fallback */})
      .finally(() => { if (!cancelled) setLoadingStarters(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId, sources.length]);

  const handleRegenerateStarters = async () => {
    if (balance < TOKEN_COSTS.chat) { toast.error("Not enough tokens"); return; }
    setLoadingStarters(true);
    try {
      await spend("chat", "Regenerate suggested questions");
      const context = buildContext(sources, "all", 4000);
      const qs = await generateStarterQuestions(context);
      if (qs.length > 0) {
        setStarters(qs);
        saveStarters(notebookId, qs);
      }
    } catch (e) {
      toast.error("Failed to regenerate suggestions");
    } finally {
      setLoadingStarters(false);
    }
  };

  const handleClearChat = () => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Clear all chat messages?</span>
        <button
          onClick={() => { clearMessages.mutate(); toast.dismiss(t.id); }}
          className="px-2 py-1 rounded-lg bg-[var(--brand-danger)] text-white text-xs font-medium"
        >
          Clear
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-[var(--text-muted)]">Cancel</button>
      </div>
    ), { duration: 5000 });
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isStreaming]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await chat(trimmed, notebookId);
  }, [input, isStreaming, chat, notebookId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header — only shown when there are messages */}
      {chatMessages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {chatMessages.length} message{chatMessages.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleClearChat}
            disabled={clearMessages.isPending}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--brand-danger)] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear chat
          </button>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">

        {/* Loading history indicator */}
        {loadingHistory && (
          <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading chat history…</span>
          </div>
        )}

        {/* Empty state with starter questions */}
        {!loadingHistory && chatMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mb-4 shadow-md">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              {sources.length > 0 ? "Ask about your sources" : "Start a conversation"}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
              {sources.length > 0
                ? "I have access to all your uploaded sources. Ask me anything!"
                : "Upload sources in the left panel to ground my answers in your material."}
            </p>

            {/* Starter question chips */}
            {loadingStarters ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating suggested questions…
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {starters.map((q, i) => (
                    <motion.button
                      key={q}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => chat(q, notebookId)}
                      className="text-left px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/5 transition-all"
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>

                {sources.length > 0 && (
                  <button
                    onClick={handleRegenerateStarters}
                    disabled={loadingStarters}
                    className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh suggestions · {TOKEN_COSTS.chat} tokens
                  </button>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {/* Messages */}
        {chatMessages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}

            <div className={cn("max-w-[80%] space-y-1", msg.role === "user" && "items-end flex flex-col")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "gradient-brand text-white rounded-br-sm"
                    : "bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--brand-primary)] prose-code:bg-[var(--surface-2)] prose-code:rounded prose-code:px-1"
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <TypingIndicator />
                  )
                ) : (
                  msg.content
                )}
              </div>

              <div className={cn("flex items-center gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
                {msg.role === "assistant" && msg.content && (
                  <>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />{TOKEN_COSTS.chat} tokens
                    </span>
                    <button
                      onClick={() => copyText(msg.content)}
                      className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                    >
                      <Copy className="w-2.5 h-2.5" />Copy
                    </button>
                    {i === chatMessages.length - 1 && (
                      <button
                        onClick={() => {
                          const lastUser = [...chatMessages].reverse().find((m) => m.role === "user");
                          if (lastUser) chat(lastUser.content, notebookId);
                        }}
                        className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />Regenerate
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                  {(profile?.full_name ?? "U")[0].toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-0)]">
        <div className="flex items-end gap-2 p-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] focus-within:border-[var(--brand-primary)] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your sources… (Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none leading-5 max-h-40 scrollbar-thin py-1 px-1"
          />
          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />{TOKEN_COSTS.chat}
            </span>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                input.trim() && !isStreaming
                  ? "gradient-brand text-white hover:opacity-90"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
          StudyLM may make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
