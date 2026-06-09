import { useState } from "react";
import { Printer, BookOpen } from "@/lib/icons";
import type { StudyGuideSection } from "@/types";

interface StudyGuideViewProps {
  sections: StudyGuideSection[];
}

export function StudyGuideView({ sections }: StudyGuideViewProps) {
  const [active, setActive] = useState(0);

  const handlePrint = () => {
    const html = sections
      .map(
        (s) =>
          `<h2>${s.heading}</h2><p>${s.body}</p>${s.bullets ? `<ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}`
      )
      .join("<hr/>");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>Study Guide</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;line-height:1.7}h2{color:#E07B1A}ul{padding-left:20px}li{margin-bottom:4px}</style></head><body>${html}</body></html>`
    );
    win.document.close();
    win.print();
  };

  return (
    <div className="flex h-full">
      {/* TOC sidebar (desktop only) */}
      <aside className="hidden md:flex flex-col w-44 shrink-0 border-r border-[var(--border)] bg-[var(--surface-2)] overflow-y-auto py-3">
        <p className="px-3 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" /> Contents
        </p>
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={[
              "w-full text-left px-3 py-1.5 text-xs transition-colors leading-tight",
              active === i
                ? "text-[var(--brand-primary)] font-medium bg-[var(--brand-primary)]/8"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]",
            ].join(" ")}
          >
            {s.heading}
          </button>
        ))}
      </aside>

      {/* content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {sections[active]?.heading}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">{active + 1}/{sections.length}</span>
            <button
              onClick={handlePrint}
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Print"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* section body */}
        <div className="flex-1 overflow-y-auto p-5">
          {sections[active] && (
            <div className="max-w-prose space-y-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {sections[active].body}
              </p>
              {(sections[active].bullets ?? []).length > 0 && (
                <ul className="space-y-2">
                  {sections[active].bullets!.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* section nav (mobile & desktop) */}
        <div className="flex border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <button
            onClick={() => setActive((a) => Math.max(a - 1, 0))}
            disabled={active === 0}
            className="flex-1 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-3)] disabled:opacity-30 transition-colors border-r border-[var(--border)]"
          >
            ← Previous
          </button>
          <button
            onClick={() => setActive((a) => Math.min(a + 1, sections.length - 1))}
            disabled={active >= sections.length - 1}
            className="flex-1 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-3)] disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
