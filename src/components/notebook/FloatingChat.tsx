import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, ChevronDown } from '@/lib/icons';
import { groqStream, GROQ_MODELS } from '@/services/groq';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  /** Short description of what is being studied — used as system context */
  contextLabel?: string;
  /** Raw text content to ground the AI answers in */
  contextContent?: string;
  /** Pre-fill the input (e.g. from a text highlight) */
  initialQuery?: string;
  onInitialQueryConsumed?: () => void;
}

export function FloatingChat({ contextLabel, contextContent, initialQuery, onInitialQueryConsumed }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // When a highlight injects a query, open the panel and pre-fill
  useEffect(() => {
    if (!initialQuery) return;
    setOpen(true);
    setInput(initialQuery);
    onInitialQueryConsumed?.();
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const systemContent = contextContent
      ? `You are a helpful study assistant. Answer questions about this study material concisely and clearly.\n\nMaterial context:\n${contextContent.slice(0, 4000)}`
      : `You are a helpful study assistant${contextLabel ? ` helping with: ${contextLabel}` : ''}. Answer concisely and clearly.`;

    const groqMessages = [
      { role: 'system' as const, content: systemContent },
      ...next.map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      for await (const chunk of groqStream(groqMessages, GROQ_MODELS.fast, controller.signal)) {
        if (controller.signal.aborted) break;
        reply += chunk;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: reply },
        ]);
      }
    } catch { /* aborted or network error */ }
    finally { setStreaming(false); }
  }, [input, messages, streaming, contextContent, contextLabel]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div
      className="fixed z-40"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        right: 16,
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="mb-3 flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: 'min(340px, calc(100vw - 32px))',
              height: 380,
              background: 'rgba(17,29,48,0.97)',
              backdropFilter: 'blur(20px)',
              border: '0.5px solid rgba(56,224,195,0.22)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}
            >
              <MessageSquare className="w-3.5 h-3.5" style={{ color: '#38E0C3' }} />
              <span className="flex-1 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {contextLabel ? `Ask about: ${contextLabel}` : 'Ask AI'}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-4">
                  <span className="text-3xl">💬</span>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Ask anything about this material
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] text-xs leading-relaxed rounded-xl px-3 py-2"
                    style={
                      m.role === 'user'
                        ? { background: 'rgba(56,224,195,0.15)', color: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(56,224,195,0.25)' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#38E0C3' }} /> : null)}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-3 py-3 shrink-0"
              style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask a question…"
                  className="flex-1 text-xs rounded-xl px-3 py-2 outline-none bg-transparent"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming}
                  className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-opacity disabled:opacity-40"
                  style={{ background: 'rgba(56,224,195,0.2)', border: '0.5px solid rgba(56,224,195,0.35)' }}
                >
                  <Send className="w-3.5 h-3.5" style={{ color: '#38E0C3' }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.93 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg"
        style={{
          background: open ? 'rgba(17,29,48,0.97)' : 'rgba(56,224,195,0.18)',
          border: '0.5px solid rgba(56,224,195,0.4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {open
          ? <X className="w-4 h-4" style={{ color: '#38E0C3' }} />
          : <MessageSquare className="w-4 h-4" style={{ color: '#38E0C3' }} />
        }
        {!open && (
          <span className="text-xs font-medium" style={{ color: '#38E0C3' }}>Ask AI</span>
        )}
      </motion.button>
    </div>
  );
}
