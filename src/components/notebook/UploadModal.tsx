import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { X, Upload, FileText, Type, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useUploadSource, type UploadProgress } from "@/hooks/useUploadSource";
import { Portal } from "@/components/shared/Portal";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

interface Props {
  notebookId: string;
  onClose:    () => void;
  onDone?:    () => void;
}

function ProgressBar({ p }: { p: UploadProgress }) {
  const stageLabel: Record<UploadProgress["stage"], string> = {
    extracting:  "Extracting text…",
    uploading:   "Uploading to R2…",
    saving:      "Saving metadata…",
    processing:  "Chunking document…",
    done:        "Done!",
    error:       p.error ?? "Error",
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-1 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-primary truncate pr-2">{p.filename}</p>
        {p.stage === "done" && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
        {p.stage === "error" && <AlertCircle className="w-4 h-4 text-brand-danger shrink-0" />}
        {(p.stage !== "done" && p.stage !== "error") && (
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
        )}
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            p.stage === "error" ? "bg-brand-danger" : "gradient-brand"
          )}
          animate={{ width: `${p.percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className={cn("text-[11px]", p.stage === "error" ? "text-brand-danger" : "text-text-muted")}>
        {stageLabel[p.stage]}
      </p>
    </div>
  );
}

export function UploadModal({ notebookId, onClose, onDone }: Props) {
  const [tab, setTab] = useState<"file" | "text">("file");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { uploadFile, uploadText, progress, reset } = useUploadSource(notebookId);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    reset();
    const results = await Promise.all(accepted.slice(0, 5).map(uploadFile));
    const anyOk   = results.some((r) => r !== null);
    if (anyOk) onDone?.();
  }, [uploadFile, reset, onDone]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept:   ACCEPTED_TYPES,
    maxSize:  MAX_SIZE,
    multiple: true,
  });

  const handlePasteSubmit = async () => {
    if (!pasteTitle.trim() || !pasteText.trim()) return;
    setSubmitting(true);
    reset();
    const result = await uploadText(pasteTitle.trim(), pasteText.trim());
    setSubmitting(false);
    if (result) { onDone?.(); onClose(); }
  };

  return (
    <Portal>
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-lg bg-surface-0 border border-border rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Add Source</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {[
            { key: "file" as const, icon: Upload, label: "Upload File" },
            { key: "text" as const, icon: Type,   label: "Paste Text" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {tab === "file" && (
            <>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                  isDragActive
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-border hover:border-brand-primary/40 hover:bg-surface-1"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-brand-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">
                    {isDragActive ? "Drop files here" : "Drop files or click to browse"}
                  </p>
                  <p className="text-xs text-text-muted mt-1">PDF, DOCX, TXT, MD — up to 25 MB each</p>
                </div>
              </div>

              {/* Rejection errors */}
              {fileRejections.length > 0 && (
                <div className="space-y-1">
                  {fileRejections.map(({ file, errors }) => (
                    <p key={file.name} className="text-xs text-brand-danger">
                      {file.name}: {errors[0]?.message}
                    </p>
                  ))}
                </div>
              )}

              {/* Supported types */}
              <div className="flex flex-wrap gap-2">
                {["PDF", "DOCX", "TXT", "MD"].map((t) => (
                  <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-1 border border-border text-[11px] text-text-muted">
                    <FileText className="w-3 h-3" />
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}

          {tab === "text" && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Title</label>
                <input
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Notes"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Content</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  placeholder="Paste your notes, lecture text, or any study material here…"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors resize-none"
                />
              </div>
              <button
                onClick={handlePasteSubmit}
                disabled={!pasteTitle.trim() || !pasteText.trim() || submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-brand text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
                Save Text Source
              </button>
            </>
          )}

          {/* Upload progress */}
          {progress && <ProgressBar p={progress} />}
        </div>
      </motion.div>
    </motion.div>
    </Portal>
  );
}
