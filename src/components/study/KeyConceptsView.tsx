import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { KeyConcept } from "@/types";

interface KeyConceptsViewProps {
  concepts: KeyConcept[];
}

const IMPORTANCE_STYLES: Record<NonNullable<KeyConcept["importance"]>, { chip: string; border: string; badge: string }> = {
  high:   { chip: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800", border: "border-red-300 dark:border-red-700", badge: "bg-red-500" },
  medium: { chip: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800", border: "border-yellow-300 dark:border-yellow-700", badge: "bg-yellow-500" },
  low:    { chip: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800", border: "border-green-300 dark:border-green-700", badge: "bg-green-500" },
};

function ConceptCard({ concept }: { concept: KeyConcept }) {
  const [flipped, setFlipped] = useState(false);
  const styles = concept.importance ? IMPORTANCE_STYLES[concept.importance] : null;

  return (
    <motion.div
      layout
      className="cursor-pointer"
      style={{ perspective: "600px" }}
      onClick={() => setFlipped((f) => !f)}
      transition={{ layout: { duration: 0.2, ease: "easeInOut" } }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={flipped ? "back" : "front"}
          initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={[
            "rounded-xl border p-4 flex flex-col gap-2 min-h-[100px]",
            flipped ? "bg-[var(--brand-primary)]/6 border-[var(--brand-primary)]/30" : "bg-[var(--surface-2)]",
            styles && !flipped ? styles.border : "border-[var(--border)]",
          ].join(" ")}
        >
          {!flipped ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{concept.term}</p>
                {styles && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize shrink-0 ${styles.chip}`}>
                    {concept.importance}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-auto">Tap to see definition</p>
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{concept.definition}</p>
              {concept.example && (
                <p className="text-[10px] text-[var(--text-muted)] italic">e.g. {concept.example}</p>
              )}
              <p className="text-[10px] text-[var(--text-muted)] mt-auto">Tap to go back</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export function KeyConceptsView({ concepts }: KeyConceptsViewProps) {
  const [filter, setFilter] = useState<"all" | NonNullable<KeyConcept["importance"]>>("all");

  const filtered = filter === "all" ? concepts : concepts.filter((c) => c.importance === filter);

  return (
    <div className="flex flex-col h-full">
      {/* filter chips */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0 flex-wrap">
        <span className="text-xs text-[var(--text-muted)] mr-1">Filter:</span>
        {(["all", "high", "medium", "low"] as const).map((imp) => (
          <button
            key={imp}
            onClick={() => setFilter(imp)}
            className={[
              "px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors capitalize",
              filter === imp
                ? "bg-[var(--brand-primary)] text-white border-transparent"
                : imp === "all"
                  ? "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]"
                  : `${IMPORTANCE_STYLES[imp as NonNullable<KeyConcept["importance"]>].chip} hover:opacity-80`,
            ].join(" ")}
          >
            {imp} {imp !== "all" && `(${concepts.filter((c) => c.importance === imp).length})`}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{filtered.length} concepts</span>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((concept, i) => (
            <ConceptCard key={concept.term + i} concept={concept} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[var(--text-muted)] mt-8">No concepts match this filter.</p>
        )}
      </div>
    </div>
  );
}
