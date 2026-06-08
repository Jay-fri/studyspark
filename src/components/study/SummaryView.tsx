import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Printer, Clock, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

interface SummaryViewProps {
  text: string;
}

export function SummaryView({ text }: SummaryViewProps) {
  const wordCount = useMemo(() =>
    text.trim().split(/\s+/).filter(Boolean).length,
  [text]);

  const readingTime = useMemo(() =>
    Math.max(1, Math.ceil(wordCount / 200)),
  [wordCount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Summary</title>
      <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.7}
      h1,h2,h3{font-weight:600}table{border-collapse:collapse;width:100%}
      td,th{border:1px solid #ccc;padding:8px}pre{background:#f4f4f4;padding:12px}</style>
      </head><body>${document.createElement("div").innerHTML = text}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="flex flex-col h-full">
      {/* meta bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {wordCount.toLocaleString()} words
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {readingTime} min read
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrint}
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:text-[var(--text-primary)]
          prose-p:text-[var(--text-secondary)] prose-li:text-[var(--text-secondary)]
          prose-strong:text-[var(--text-primary)]
          prose-table:text-sm prose-th:bg-[var(--surface-2)] prose-td:border-[var(--border)] prose-th:border-[var(--border)]
          prose-code:bg-[var(--surface-2)] prose-code:text-[var(--brand-primary)] prose-code:px-1 prose-code:rounded">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
