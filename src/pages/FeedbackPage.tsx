import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Bug, Lightbulb, Star, Send, Check, Loader2 } from "@/lib/icons";
import toast from "react-hot-toast";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

type Category = "bug" | "feature" | "general" | "other";

const CATEGORIES: { id: Category; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "bug",     label: "Bug Report",        desc: "Something isn't working right",    icon: Bug           },
  { id: "feature", label: "Feature Request",   desc: "An idea you'd love to see built",  icon: Lightbulb     },
  { id: "general", label: "General Feedback",  desc: "Thoughts on your experience",      icon: Star          },
  { id: "other",   label: "Other",             desc: "Anything else on your mind",       icon: MessageSquare },
];

export default function FeedbackPage() {
  const userId = useAuthStore((s) => s.user?.id);

  const [category, setCategory] = useState<Category>("general");
  const [message,  setMessage]  = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !userId) return;
    setSending(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("user_feedback") as any).insert({
        user_id:  userId,
        category,
        message:  message.trim(),
      });
      if (error) throw error;
      setSent(true);
      setMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send feedback";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleAnother = () => {
    setSent(false);
    setMessage("");
    setCategory("general");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-28 md:pb-8">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[var(--text-primary)] tracking-tight">
            Feedback & Ideas
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1.5">
            Help us improve StudyLM. Every message is read and considered.
          </p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.2)" }}
            >
              <Check className="w-7 h-7" style={{ color: "#38E0C3" }} />
            </div>
            <p className="text-lg font-display text-[var(--text-primary)]">Thank you!</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              Your feedback has been received. We appreciate you taking the time.
            </p>
            <button
              onClick={handleAnother}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(56,224,195,0.1)",
                border: "0.5px solid rgba(56,224,195,0.25)",
                color: "#38E0C3",
              }}
            >
              Send another
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Category picker */}
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-3"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Category
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map(({ id, label, desc, icon: Icon }) => {
                  const active = category === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setCategory(id)}
                      className={cn(
                        "flex items-start gap-3 p-3.5 rounded-xl text-left transition-all",
                      )}
                      style={{
                        background: active ? "rgba(56,224,195,0.08)" : "rgba(255,255,255,0.04)",
                        border: active
                          ? "0.5px solid rgba(56,224,195,0.25)"
                          : "0.5px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <Icon
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: active ? "#38E0C3" : "rgba(255,255,255,0.35)" }}
                      />
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: active ? "#38E0C3" : "rgba(255,255,255,0.75)" }}
                        >
                          {label}
                        </p>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.28)" }}>
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-2"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Your message
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your feedback, bug, or idea in as much detail as you like…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: "1.6",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(56,224,195,0.3)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              />
              <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                {message.trim().length} characters
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || sending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{
                background: message.trim() ? "rgba(56,224,195,0.15)" : "rgba(255,255,255,0.06)",
                border: message.trim()
                  ? "0.5px solid rgba(56,224,195,0.3)"
                  : "0.5px solid rgba(255,255,255,0.08)",
                color: message.trim() ? "#38E0C3" : "rgba(255,255,255,0.3)",
              }}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending…" : "Send Feedback"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
