import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Zap, RefreshCw, ChevronRight, ChevronLeft, FileText } from "@/lib/icons";
import { useTokenCosts } from "@/hooks/useTokenCosts";
import { cn } from "@/lib/utils";
import type { AIOutput, AIOutputType, Source } from "@/types";

const STUDIO_ITEMS: {
  type:  AIOutputType;
  label: string;
  icon:  string;
  desc:  string;
}[] = [
  { type: "summary",     label: "Summary",      icon: "📝", desc: "Key points & overview" },
  { type: "quiz",        label: "Quiz",          icon: "❓", desc: "Test your knowledge" },
  { type: "flashcards",  label: "Flashcards",    icon: "🃏", desc: "Spaced-repetition cards" },
  { type: "mindmap",     label: "Mind Map",      icon: "🗺️", desc: "Visual concept map" },
  { type: "studyguide",  label: "Study Guide",   icon: "📖", desc: "Structured guide" },
  { type: "keyconcepts", label: "Key Concepts",  icon: "💡", desc: "Core terms & ideas" },
  { type: "podcast",     label: "Podcast",       icon: "🎙️", desc: "Dialogue-style script" },
];

interface Props {
  outputs:        AIOutput[];
  isGenerating:   boolean;
  generatingType: AIOutputType | null;
  balance:        number;
  onGenerate:     (type: AIOutputType) => void;
  onOpen:         (type: AIOutputType) => void;
  onTopUp:        () => void;
  collapsed?:     boolean;
  onCollapse?:    () => void;
  sources?:       Source[];
  onOpenSource?:  (sourceId: string) => void;
}

const SOURCE_TYPE_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', txt: '📃', md: '📋', url: '🔗', text: '✏️',
};

export function StudioPanel({
  outputs, isGenerating, generatingType, balance, onGenerate, onOpen, onTopUp,
  collapsed, onCollapse, sources = [], onOpenSource,
}: Props) {
  const [hoveredType, setHoveredType] = useState<AIOutputType | null>(null);
  const costs = useTokenCosts();

  const safeOutputs = outputs ?? [];
  const getOutput = (type: AIOutputType) => safeOutputs.find((o) => o.type === type) ?? null;

  // ── Icon-only collapsed view ─────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col items-center h-full w-full bg-[var(--surface-1)] border-l border-[var(--border)] overflow-hidden py-2 gap-1">
        {/* Collapse button */}
        <button
          onClick={onCollapse}
          title="Expand studio"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-6 h-px bg-[var(--border)] my-1" />
        {/* Output type icons */}
        {STUDIO_ITEMS.map(({ type, icon, label }) => {
          const output  = getOutput(type);
          const isThis  = isGenerating && generatingType === type;
          return (
            <button
              key={type}
              title={label}
              onClick={() => output ? onOpen(type) : onGenerate(type)}
              className={cn(
                "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                output
                  ? "text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className="text-base leading-none">{icon}</span>
              {isThis && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
              )}
              {output && !isThis && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface-1)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Generate</h2>
        <div className="flex items-center gap-1.5">
          {balance === 0 && (
            <button
              onClick={onTopUp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg gradient-brand text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              <Zap className="w-3 h-3" /> Top Up
            </button>
          )}
          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Collapse studio"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-5">

        {/* ── Create section ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">
            Create
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STUDIO_ITEMS.map(({ type, label, icon, desc }, i) => {
              const output   = getOutput(type);
              const isThis   = isGenerating && generatingType === type;
              const cost     = costs[type as keyof typeof costs];
              const noTokens = balance === 0;

              return (
                <motion.button
                  key={type}
                  id={`tour-studio-${type}`}
                  whileTap={{ scale: 0.97 }}
                  onHoverStart={() => setHoveredType(type)}
                  onHoverEnd={() => setHoveredType(null)}
                  onClick={() => {
                    if (isThis) return;
                    if (output) { onOpen(type); return; }
                    if (noTokens) { onTopUp(); return; }
                    onGenerate(type);
                  }}
                  className={cn(
                    "relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all",
                    isThis
                      ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5"
                      : output
                      ? "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5"
                      : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  {/* Start here badge on first card when no outputs */}
                  {i === 0 && safeOutputs.length === 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="absolute -top-2 -right-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold z-10"
                      style={{ background: "#38E0C3", color: "#0a1628" }}
                    >
                      Start here
                    </motion.span>
                  )}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg leading-none">{icon}</span>
                    {isThis ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[var(--brand-primary)]" />
                    ) : output ? (
                      <ChevronRight className="w-3 h-3 text-[var(--brand-primary)]" />
                    ) : null}
                  </div>
                  <p className={cn(
                    "text-xs font-semibold leading-tight",
                    output ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                  )}>
                    {label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight">{desc}</p>

                  {/* Cost badge — shown on hover if no output */}
                  {!output && !isThis && hoveredType === type && (
                    <motion.span
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-2 right-2 text-[10px] font-medium text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1.5 py-0.5 rounded-full"
                    >
                      {cost} tokens
                    </motion.span>
                  )}

                  {/* Regenerate badge on hover if output exists */}
                  {output && hoveredType === type && !isThis && (
                    <motion.span
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-full"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> regen
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Generated section ── */}
        {safeOutputs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">
              Generated
            </p>
            <div className="space-y-1.5">
              {safeOutputs.map((output) => {
                const meta  = STUDIO_ITEMS.find((s) => s.type === output.type);
                const isNow = isGenerating && generatingType === output.type;
                return (
                  <button
                    key={output.id}
                    onClick={() => onOpen(output.type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5 transition-all text-left group"
                  >
                    <span className="text-base leading-none shrink-0">{meta?.icon ?? "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {meta?.label ?? output.type}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {isNow
                          ? "Regenerating…"
                          : formatDistanceToNow(new Date(output.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {safeOutputs.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Click any card above to generate AI study materials from your sources.
            </p>
          </div>
        )}

        {/* ── Source materials ── */}
        {sources.length > 0 && onOpenSource && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">
              Source Materials
            </p>
            <div className="space-y-1.5">
              {sources.map((src) => {
                const readMin = src.word_count ? Math.ceil(src.word_count / 250) : null;
                return (
                  <button
                    key={src.id}
                    onClick={() => onOpenSource(src.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5 transition-all text-left group"
                  >
                    <span className="text-base leading-none shrink-0">
                      {SOURCE_TYPE_ICON[src.type] ?? '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {src.title}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {readMin ? `~${readMin} min read` : src.type.toUpperCase()}
                      </p>
                    </div>
                    <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
